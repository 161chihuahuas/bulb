/**
 * @module bulb/network
 */
'use strict';

const { Server } = require('node:net');
const { Agent } = require('node:http');
const { Duplex } = require('node:stream');
const { SocksClient } = require('socks');


class HiddenSocket extends Duplex {

  /**
   * Wraps a net.Socket in a stream.Duplex that passes data through the supplied
   * context's tor SOCKSv5 proxy.
   * @param {module:bulb/context~TorContext} context
   */
  constructor(context) {
    super();

    this._context = context;
  }

  /**
   * @typedef {object} module:bulb/network~HiddenSocket~ConnectOptions
   * @property {string} host - Address (including onion URLs) to connect to.
   * @property {number} port - Port to connect to.
   */

  /**
   * Connects the underlying socket to the destination through a 
   * tor SOCKSv5 proxy.
   * @param {module:bulb/network~HiddenSocket~ConnectOptions} options - Destination connection address
   */ 
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

  /**
   * Handles incoming connections.
   * @callback module:bulb/network~HiddenServer~ConnectionListener
   * @param {net.Socket} connection
   */

  /**
   * Wraps a net.Server, exposing it as an onion service. 
   * @param {module:bulb/context~TorContext} context - Tor context to create onion.
   * @param {module:bulb/network~HiddenServer~ConnectionListener} [connectionLister] - Function to handle incoming connections 
   */
  constructor(context, ...serverArgs) {
    this._context = context;
    this._server = new Server(...serverArgs);
    this._address = {
      host: null,
      port: 0
    };
  }

  /**
   * Calls the underlying net.Socket#listen, then establishes a connection
   * as on onion service using the current tor context.
   * @param {module:bulb/commands~ControlCommand~AddOnionOptions}
   * @returns {Promise<module:bulb/network~HiddenServer~Address>}
   */
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

  /**
   * @typedef {object} module:bulb/network~HiddenServer~Address
   * @property {string} host - Onion address for this service.
   * @property {number} port - Virtual port on the onion service.
   */

  /**
   * Returns the hidden service's address
   * @returns {module:bulb/network~HiddenServer~Address}
   */
  address() {
    return this._address;
  }

  get server() {
    return this._server;
  }

}


class TorHttpAgent extends Agent {

  /**
   * HTTP request agent for proxing requests through Tor.
   * @param {module:bulb/context~TorContext} context - Tor context to proxy through.
   */
  constructor(context) {
    super(options);
    this._context = context;
  }

  /**
   * Implements http.Agent#createConnection to use a {@link module:bulb/network~HiddenSocket}. 
   * You probably won't use this directly, instead passing this instance to http#request.
   * @param {module:bulb/network~HiddenSocket~ConnectOptions} options
   * @param {function} [connectListener]
   */
  createConnection(options, callback) {
    const hs = new HiddenSocket(this._context);
    hs.connect(options).then(() => callback(null, hs), callback);
  }

}

module.exports.HiddenSocket = HiddenSocket;
module.exports.HiddenServer = HiddenServer;
module.exports.TorHttpAgent = TorHttpAgent;
