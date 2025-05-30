/**
 * @module granax/control
 */

'use strict';


class ControlReply {
  
  constructor(data, type) {
    this._type = type || '__DEFAULT';

    for (let prop in data) {
      this[prop] = data[prop];
    }
  }

  /**
   * @param {string[]} output
   * @returns {AuthChallengeResult}
   */
  static AUTHCHALLENGE(output) {
    let result = output[0].split(' ');
    let [, hash, nonce] = result;
    
    return new AuthChallengeReply({
      hash: hash.split('=').pop(),
      nonce: nonce ? nonce.split('=').pop() : null
    });
  }
  /**
   * @typedef {object} AuthChallengeResult
   * @property {string} hash - The server hash
   * @property {string} nonce - The server nonce
   */

  /**
   * @param {string[]} output
   * @returns {ProtocolInfoResult}
   */
  static PROTOCOLINFO(output) {
    let [proto, auth, version] = output;
    proto = proto.split(' ');
    auth = auth.split(' ');
    version = version.split(' ');
    auth.shift();
    let methods = auth.shift();
    let cookieFile = auth.length
      ? auth.join(' ').split('=')[1].split('"').join('')
      : null;
    return new ProtocolInfoReply({
      protocol: proto[1],
      auth: {
        methods: methods.split('=')[1].split(','),
        cookieFile
      },
      version: {
        tor: version[1].split('=')[1].split('"').join('')
      }
    });
  }
  /**
   * @typedef {object} ProtocolInfoResult
   * @property {string} protocol
   * @property {object} auth
   * @property {string[]} auth.methods
   * @property {string} auth.cookieFile
   * @property {object} version
   * @property {string} version.tor
   */

  /**
   * @param {string[]} output
   * @returns {AddOnionResult}
   */
  static ADD_ONION(output) {
    return new AddOnionReply({
      serviceId: output[0].split('=')[1],
      privateKey: (output[1] && output[1].includes('PrivateKey'))
        ? output[1].split('=')[1]
        : null
    });
  }
  /**
   * @typedef {object} AddOnionResult
   * @property {string} serviceId - The hidden service url without .onion
   * @property {string} [privateKey] - The generated private key
   */

  /**
   * @param {string[]} output
   * @returns {GetConfigResult}
   */
  static GETCONF(output) {
    return new GetConfReply({ 
      conf: output.map((line) => line.split('=')[1])
    });
  }
  /**
   * @typedef {string[]} GetConfigResult
   */

  /**
   * @param {string[]} output
   * @returns {string}
   */
  static GETINFO(output) {
    if (output.length > 1) {
      return new GetInfoReply({
        info: output.map((line) => line.split('=')[1]).join('\n')
      });
    }

    return new GetInfoReply({
      info: output[0].split('=')[1]
    });
  }

}

class AuthChallengeReply extends ControlReply {

  constructor(data) {
    super(data);
    this._type = 'AUTHCHALLENGE';
  }

}

class ProtocolInfoReply extends ControlReply {

  constructor(data) {
    super(data, 'PROTOCOLINFO');
  }

}

class AddOnionReply extends ControlReply {

  constructor(data) {
    super(data, 'ADD_ONION');
  }

}

class GetInfoReply extends ControlReply {

  constructor(data) {
    super(data, 'GETINFO');
  }

}

class GetConfReply extends ControlReply {

  constructor(data) {
    super(data, 'GETCONF');
  }

}

module.exports.ControlReply = ControlReply;
module.exports.AuthChallengeReply = AuthChallengeReply;
module.exports.ProtocolInfoReply = ProtocolInfoReply;
module.exports.AddOnionReply = AddOnionReply;
module.exports.GetInfoReply = GetInfoReply;
module.exports.GetConfReply = GetConfReply;
