/**
 * @module bulb/context
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
   * Primary interface for doing things "over tor". Manages a tor process, 
   * creates and establishes a control connection, and offers it's own 
   * interface for creating and handling connections made through the tor
   * network.
   * @constructor
   * @param {module:bulb/config~TorConfig|object} [torConfig] - Configuration for the tor process
   * @param {module:bulb/control~TorControl|object} [torControl] - Control connection to a tor process
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

    /**
     * Connection to the to control port.
     * @property {module:bulb/control~TorControl} control
     */
    this.control = (torControl instanceof TorControl)
      ? torControl
      : new TorControl(new Socket(), torControl);
  }

  /**
   * Spawns a tor process for this context.
   * @param {string[]} [args] - Arguments to pass the tor executable
   * @returns {Promise<process.ChildProcess>}
   */
  spawnTorChildProcess(args = []) {
    return new Promise((resolve, reject) => {
      let child = spawn(this._tor, ['-f', this._config.writeLocal()].concat(args), {
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

      /**
       * Child tor process managed by this context.
       * @property {child_process.ChildProcess} process
       */
      this.process = child;
    });
  }

  /**
   * Reads the tor process control port.
   * @param {number} [delay=10] - Milliseconds to wait before read
   * @returns {Promise<number>} port
   */
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

  /**
   * Reads the tor process SOCKSv5 proxy port.
   * @returns {Promise<number>} port
   */
  readSocksPort() {
    return new Promise((resolve, reject) => {
      this.control.getInfo('net/listeners/socks').then(({ info }) => {
        let [, socksPort] = info.replace(/"/g, '').split(':');
        resolve(parseInt(socksPort));
      }, reject);
    });
  }
  
  /**
   * Connects the {@link module:bulb/control~TorControl} to the child process.
   * @param {object} [options]
   * @param {number} [options.retry] - If unsuccessful connecting, try again
   * @param {number} [options.delay] - Wait time between retries
   * @returns {Promise<module:bulb/control~TorControl>}
   */
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
      this.control.on('ready', () => resolve(this.control)); 
      this.control.socket.connect(controlPort, '127.0.0.1');
    });
  }

  /**
   * Create a "tor-ified" TCP socket in this {@link module:bulb/context~TorContext}.
   * @param {module:bulb/network~HiddenSocket~ConnectListener} [connectListener] - Sets a 
   * one time listener for {@link module:bulb/network~HiddenSocket#events:connect}.
   * @returns {module:bulb/network~HiddenSocket}
   */
  createConnection(connectionListener) {
    const hSock = new HiddenSocket(this);

    if (connectionListener) {
      hSock.once('connect', connectionListener);
    }

    return hSock;
  }

  /**
   * Alias for {@link module:bulb/context~TorContext#createConnection} that automatically
   * calls the returned {@link module:bulb/network~HiddenSocket#connect}.
   * @param {module:bulb/network~HiddenSocket~ConnectOptions} [options] - Passed to the created {@link module:bulb/network~HiddenSocket}.
   * @returns {Promise<module:bulb/network~HiddenSocket>}
   */
  connect(options) {
    return new Promise((resolve, reject) => {
      const hSock = this.createConnection(() => resolve(hSock)).connect(options);
    });
  }

  /**
   * Create a "tor-ified" TCP server in this context. Exposes an onion service.
   * @param {module:bulb/network~HiddenServer~ServerOptions} [options] - Passed to the created {@link modulex:bulb/network~HiddenServer}.
   * @param {module:bulb/network~HiddenServer~ConnectionListener} [connectionListener] - Passed to the created {@link module:bulb/network~HiddenServer}.
   * @returns {module:bulb/network~HiddenServer}
   */
  createServer(options, connectionListener) {
    const hServ = new HiddenServer(this, options, connectionListener);

    if (connectionListener) {
      hServ.on('connection', connectionListener);
    }

    return hServ;
  }

  /**
   * Create a "tor-ified" http.Agent for sending HTTP requests through this context.
   * @returns {module:bulb/network~TorHttpAgent}
   */
  createTorHttpAgent() {
    return new TorHttpAgent(this);
  }

  /**
   * Creates a {@link module:bulb/context~TorContext}, automtically calling 
   * {@link module:bulb/context~TorContext#spawnTorChildProcess} and 
   * {@link module:bulb/context~TorContext#openControlConnection} before resolving.
   * @param {module:bulb/config~TorConfig|object} [options] - Passed to the created {@link module:bulb/context~TorContext}.
   * @returns {Promise<module:bulb/context~TorContext>}
   */
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
   * Returns the local path to the tor bundle.
   * @param {string} [platform=os.platform()] - OS identifier
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
