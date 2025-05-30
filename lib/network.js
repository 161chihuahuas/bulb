/**
 * @module granax/network
 */
'use strict';

const { Server } = require('node:net');
const { Agent } = require('node:http');
const { Duplex } = require('node:stream');
const { SocksClient } = require('socks');


class HiddenSocket extends Duplex {

  constructor(context) {
    super();

    this._context = context;
  }

  connect(options) {
    return new Promise(async (resolve) => {
      this._socksPort = await this._context.readSocksPort();
      this._socksClient = await SocksClient.createConnection({
        proxy: {
          host: '127.0.0.1',
          type: 5,
          port: this._socksPort
        },
        command: 'connect',
        destination: {
          host: options.host,
          port: options.port
        }
      });
      this._socksProxy = this._socksClient.socket;

      this._socksProxy.on('data', d => this.push(d));
      this._socksProxy.on('error', e => this.emit('error', e));
      this._socksProxy.on('close', () => this.push(null));

      resolve(this);
    });
  }

  _write(data, enc, done) {
    this._socksProxy.write(data, enc, done);
  }

  _read() {}

}


class HiddenServer {

  constructor(context, ...serverArgs) {
    this._context = context;
    this._server = new Server(...serverArgs);
    this._address = {
      host: null,
      port: 0
    };
  }

  listen(addOnionOptions = {}) { 
    return new Promise((resolve, reject) => {
      this._server.listen(0, () => {

        if (!addOnionOptions.virtualPort) {
          addOnionOptions.virtualPort = this._server.address().port;
        }

        this._context.control.createHiddenService(
          '127.0.0.1:' + this._server.address().port,
          addOnionOptions
        ).then(result => {
          this._address.host = result.serviceId + '.onion';
          this._address.port = addOnionOptions.virtualPort;
          this.privateKey = result.privateKey;
          this.serviceId = result.serviceId;

          resolve(this.address());
        }, reject); 
      })
    });
  }

  address() {
    return this._address;
  }

  get server() {
    return this._server;
  }

}


class TorHttpAgent extends Agent {

  constructor(context) {
    super(options);
    this._context = context;
  }

  createConnection(options, callback) {
    const hs = new HiddenSocket(this._context);
    hs.connect(options).then(() => callback(null, hs), callback);
  }

}

module.exports.HiddenSocket = HiddenSocket;
module.exports.HiddenServer = HiddenServer;
module.exports.TorHttpAgent = TorHttpAgent;
