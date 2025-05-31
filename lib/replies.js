/**
 * @module granax/replies
 */

'use strict';


class ControlReply {
 
  /**
   * Wraps a parsed reply forom the control port.
   * @param {object} [parsedReply] - Parsed reply object.
   */
  constructor(data = {}, type) {
    this._type = type || '__DEFAULT';

    for (let prop in data) {
      this[prop] = data[prop];
    }
  }

  /**
   * Parses the reply from the AUTHCHALLENGE {@link module:granax/commands~ControlCommand}.
   * @param {string[]} output
   * @returns {module:granax/replies~ControlReply~AuthChallengeResult}
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
   * @typedef {object} module:granax/replies~ControlReply~AuthChallengeResult
   * @property {string} hash - The server hash.
   * @property {string} nonce - The server nonce.
   */

  /**
   * Parses the reply from the PROTOCOLINFO {@link module:granax/commands~ControlCommand}.
   * @param {string[]} output
   * @returns {module:granax/replies~ControlReply~ProtocolInfoResult}
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
   * @typedef {object} module:granax/replies~ControlReply~ProtocolInfoResult
   * @property {string} protocol
   * @property {object} auth
   * @property {string[]} auth.methods
   * @property {string} auth.cookieFile
   * @property {object} version
   * @property {string} version.tor
   */

  /**
   * Parses the response from the ADD_ONION {@link module:granax/replies~ControlReply~AddOnionResult}
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
   * @typedef {object} module:granax/replies~ControlReply~AddOnionResult
   * @property {string} serviceId - The hidden service url without .onion.
   * @property {string} [privateKey] - The generated private key.
   */

  /**
   * Parses the result of the GETCONF {@link module:granax/commands~ControlCommand}.
   * @param {string[]} output
   * @returns {module:granax/replies~ControlReply~GetConfigResult}
   */
  static GETCONF(output) {
    return new GetConfReply({ 
      conf: output.map((line) => line.split('=')[1])
    });
  }
  /**
   * @typedef {object} module:granax/replies~ControlReply~GetConfigResult
   * @property {string[]} conf
   */

  /**
   * Parses the result of the GETINFO {@link module:granax/commands~ControlCommand}.
   * @param {string[]} output
   * @returns {module:granax/replies~ControlReply~GetInfoResult}
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
  /**
   * @typedef {object} module:granax/replies~ControlReply~GetInfoResult
   * @property {string[]} info
   */

}

class AuthChallengeReply extends ControlReply {

  /**
   * @constructor
   * @param {module:granax/replies~ControlReply~AuthChallengeResult}
   */
  constructor(data) {
    super(data);
    this._type = 'AUTHCHALLENGE';
  }

}

class ProtocolInfoReply extends ControlReply {

  /**
   * @constructor
   * @param {module:granax/replies~ControlReply~ProtocolInfoResult}
   */
  constructor(data) {
    super(data, 'PROTOCOLINFO');
  }

}

class AddOnionReply extends ControlReply {

  /**
   * @constructor
   * @param {module:granax/replies~ControlReply~AddOnionResult}
   */
  constructor(data) {
    super(data, 'ADD_ONION');
  }

}

class GetInfoReply extends ControlReply {

  /**
   * @constructor
   * @param {module:granax/replies~ControlReply~GetInfoResult}
   */
  constructor(data) {
    super(data, 'GETINFO');
  }

}

class GetConfReply extends ControlReply {

  /**
   * @constructor
   * @param {module:granax/replies~ControlReply~GetConfResult}
   */
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
