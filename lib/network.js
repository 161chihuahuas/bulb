/**
 * @module granax/network
 */
'use strict';

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
      this._socksProxy = await SocksClient.createConnection({
        proxy: {
          address: '127.0.0.1',
          type: 5,
          port: this._socksPort
        },
        command: 'connect',
        destination: options
      });

      this._socksProxy.on('data', d => this.push(d));
      this._socksProxy.on('error', e => this.emit('error', e));
      this._socksProxy.on('close', () => this.push(null));

      resolve(this);
    });
  }

  _write(data, enc, done) {
    this._socksProxy.write(data, enc, done);
  }

}


class HiddenServer {

  constructor(context, server) {
    this._context = context;
    this._server = server;
    this._address = this._server.address();
  }

  listen(virtualPort) {
    return this._context.control.createHiddenService(
      '127.0.0.1:' + this._address.port,
      { virtualPort }
    );
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
