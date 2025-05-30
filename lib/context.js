/**
 * @module granax/context
 */
'use strict';

const { join, basename } = require('node:path');
const { EventEmitter } = require('node:events');
const { spawn, execFileSync } = require('node:child_process');
const { platform: getPlatform } = require('node:os');
const { Socket } = require('node:net');
const { readFileSync } = require('node:fs');
const { TorConfig } = require('./config');
const { TorControl } = require('./control');
const { HiddenSocket, HiddenServer, TorHttpAgent } = require('./network');


class TorContext extends EventEmitter {
  
  static get BIN_PATH() {
    return join(__dirname, '../.bin');
  }

  /**
   * 
   * @constructor
   * @param {object} options
   * @param {object} torrcOptions
   */
  constructor(torConfig, torControl) {
    super();

    this._config = (torConfig instanceof TorConfig)
      ? torConfig
      : new TorConfig(torConfig);
    this._exe = basename(TorContext.getExecPath());
    this._tor = join(TorContext.BIN_PATH, 'tor', this._exe);
    this._env = { 
      LD_LIBRARY_PATH: join(TorContext.BIN_PATH, 'tor') 
    };

    this.control = (torControl instanceof TorControl)
      ? torControl
      : new TorControl(new Socket(), torControl);
  }

  spawnTorChildProcess(args = []) {
    return new Promise((resolve, reject) => {
      let child = spawn(this._tor, ['-f', this._config.tmpWrite()].concat(args), {
        cwd: TorContext.BIN_PATH,
        env: this._env
      });
      
      process.on('exit', () => {
        child.kill()
      });
      
      process.on('uncaughtException', (e) => {
        console.error(e);
        child.kill();
      });
      
      process.on('unhandledRejection', (e) => {
        console.error(e);
        child.kill();
      });
      
      child.stdout.once('data', () => {
        resolve(child);
      });
      
      child.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });
      
      child.on('close', (code) => {
        this.emit('close', new Error('Tor exited with code ' + code));
        reject(new Error('Tor exited with code ' + code));
      });

      this.process = child;
    });
  }

  readControlPort(delay = 10) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let port = null;
      
        try {
          port = parseInt(readFileSync(join(
            this._config.datadir,
            'control-port'
          )).toString().split(':')[1]);
        } catch (err) {
          return reject(new Error('Failed to read control port'));
        }

        resolve(port);
      }, delay);
    });
  }

  readSocksPort() {
    return new Promise((resolve, reject) => {
      this.control.getInfo('net/listeners/socks').then(({ info }) => {
        let [, socksPort] = info.replace(/"/g, '').split(':');
        resolve(parseInt(socksPort));
      }, reject);
    });
  }
  
  openControlConnection(options = { retry: 20, delay: 200 }) {
    return new Promise(async (resolve, reject) => {
      let controlPort;
      let retryTimes = options.retry;

      while (!controlPort && retryTimes) {
        retryTimes--;
        
        try {
          controlPort = await this.readControlPort(options.delay);
        } catch (e) {
          if (!retryTimes) {
            return reject(e);
          }
        }
      }
      this.control.on('ready', resolve); 
      this.control.socket.connect(controlPort, '127.0.0.1');
    });
  }

  createConnection(options, connectionListener) {
    const hSock = new HiddenSocket(this);

    if (connectionListener) {
      hSock.on('connect', connectionListener);
    }

    return hSock;
  }

  connect(options) {
    return new Promise((resolve, reject) => {
      this.createConnection(options, resolve).connect(options);
    });
  }

  createServer(options, connectionListener) {
    const hServ = new HiddenServer(this, options, connectionListener);

    if (connectionListener) {
      hServ.on('connection', connectionListener);
    }

    return hServ;
  }

  createTorHttpAgent() {
    return new TorHttpAgent(this);
  }

  static create(options) {
    const tor = new TorContext(options);

    return new Promise(async (resolve, reject) => {
      try {
        await tor.spawnTorChildProcess();
        await tor.openControlConnection();
      } catch (e) {
        return reject(e);
      }

      resolve(tor);
    });
  }

  /**
   * Returns the local path to the tor bundle
   * @returns {string}
   */
  static getExecPath(platform = getPlatform()) {
    let torpath = null; 

    switch (platform) {
      case 'darwin':
      case 'linux':
        torpath = join(TorContext.BIN_PATH, 'tor');
        break;
      default:
        throw new Error(`Unsupported platform "${platform}"`);
    }

    return torpath;
  }

}

module.exports.TorContext = TorContext;
