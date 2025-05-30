/**
 * @module granax/commands
 */

'use strict';



class ControlCommand {

  constructor(str) {
    this.cmd = str;
  }

  toString() {
    return this.cmd;
  }

  /**
   * @param {string} [token=""] - The auth token
   * @returns {string}
   */
  static AUTHENTICATE(token = '') {
    return new ControlCommand(`AUTHENTICATE ${token}`);
  }

  /**
   * @param {string} [nonce=""] - Client nonce for challenge
   * @param {string} [type="SAFECOOKIE"] - The type of challenge
   * @returns {string}
   */
  static AUTHCHALLENGE(nonce = '', type = 'SAFECOOKIE') {
    return new ControlCommand(`AUTHCHALLENGE ${type} ${nonce}`);
  }

  /**
   * @returns {string}
   */
  static PROTOCOLINFO() {
    return new ControlCommand('PROTOCOLINFO');
  }
 
  /**
   * @param {array} ports - Array containing optional virtualPort (defaults to 80) and target ip:port string
   * @param {object} [options]
   * @param {string} [options.clientName] - Client auth identifier
   * @param {string} [options.clientBlob] - Arbitrary auth data
   * @param {string} [options.keyType="NEW"] - Create a new key or use RSA1024
   * @param {string} [options.keyBlob="BEST"] - Key type to create or serialized
   * @param {boolean} [options.discardPrivateKey=false] - Do not return key
   * @param {boolean} [options.detach=false] - Keep service running after close
   * @param {boolean} [options.basicAuth=false] - Use client name and blob auth
   * @param {boolean} [options.nonAnonymous=false] - Non-anononymous mode
   */
  static ADD_ONION(ports, opts = {}) {
    const defaultOnionVirtualPort = 80;
    
    function _addOnionPortsStringToCommand(ports, opts, command) {
      if (opts.virtualPort) {
        command.push(`Port=${opts.virtualPort},${ports}`);
      } else {
        command.push(`Port=${defaultOnionVirtualPort},${ports}`);
      }
    }

    function _addOnionPortsToCommand(ports, opts, command) {
      if (typeof ports === 'string') {
        _addOnionPortsStringToCommand(ports, opts, command);
        return;
      }
      if (!ports.length) {
        command.push(`Port=${defaultOnionVirtualPort}`);
        return;
      }

      for (let port of ports) {
        let _portsString;

        if (port.virtualPort) {
          _portsString = `Port=${port.virtualPort}`;
        } else {
          _portsString = `Port=${defaultOnionVirtualPort}`;
        }
        if (port.target) {
          _portsString += `,${port.target}`;
        }
        
        command.push(_portsString);
      }
    }

    let options = {
      clientName: opts.clientName || null,
      clientBlob: opts.clientBlob || null,
      keyType: opts.keyType || 'NEW',
      keyBlob: opts.keyBlob || 'BEST',
      discardPrivateKey: opts.discardPrivateKey || false,
      detach: opts.detach || false,
      basicAuth: opts.basicAuth || false,
      nonAnonymous: opts.nonAnonymous || false
    };
    let command = ['ADD_ONION', `${options.keyType}:${options.keyBlob}`];
    let flagMap = [
      ['discardPrivateKey', 'DiscardPK'],
      ['detach', 'Detach'],
      ['basicAuth', 'BasicAuth'],
      ['nonAnonymous', 'NonAnonymous']
    ];
    let flags = [];

    for (let flag of flagMap) {
      if (options[flag[0]]) {
        flags.push(flag[1]);
      }
    }

    if (flags.length) {
      command.push('Flags=' + flags.join(','));
    }

    _addOnionPortsToCommand(ports, opts, command);

    if (options.clientName && options.clientBlob) {
      command.push(`ClientAuth=${options.clientName}:${options.clientBlob}`);
    }

    return new ControlCommand(command.join(' '));
  }

  /**
   * @param {string} serviceId
   * @returns {string}
   */
  static DEL_ONION(serviceId) {
    return new ControlCommand(`DEL_ONION ${serviceId}`);
  }

  /**
   * @param {string} keyword
   * @param {string} value
   * @returns {string}
   */
  static SETCONF(keyword, value) {
    return new ControlCommand(`SETCONF ${keyword}="${value}"`);
  }

  /**
   * @param {string} keyword
   * @returns {string}
   */
  static RESETCONF(keyword) {
    return new ControlCommand(`RESETCONF ${keyword}`);
  }

  /**
   * @param {string} keyword
   * @returns {string}
   */
  static GETCONF(keyword) {
    return new ControlCommand(`GETCONF ${keyword}`);
  }

  /**
   * @returns {string}
   */
  static SAVECONF() {
    return new ControlCommand('SAVECONF');
  }

  /**
   * @returns {string}
   */
  static SIGNAL(signal) {
    return new ControlCommand(`SIGNAL ${signal}`);
  }

  /**
   * @param {string} targetAddr
   * @param {string} replaceAddr
   * @returns {string}
   */
  static MAPADDRESS(targetAddr, replaceAddr) {
    return new ControlCommand(`MAPADDRESS ${targetAddr}=${replaceAddr}`);
  }

  /**
   * @param {string} circuitId
   * @returns {string}
   */
  static EXTENDCIRCUIT(circuitId, purpose) {
    return new ControlCommand(`EXTENDCIRCUIT ${circuitId}` +
      (purpose ? ` purpose="${purpose}"` : ''));
  }

  /**
   * @param {string} circuitId
   * @param {string} purpose
   *
   */
  static SETCIRCUITPURPOSE(circuitId, purpose) {
    return new ControlCommand(`SETCIRCUITPURPOSE ${circuitId} purpose="${purpose}"`);
  }

  /**
   * @param {string} streamId
   * @param {object} options
   * @param {string} options.circuitId
   * @param {string|null} options.hopNumber
   * @returns {string}
   */
  static ATTACHSTREAM(streamId, options) {
    return new ControlCommand(`ATTACHSTREAM ${streamId} ${options.circuitId}` +
      (options.hopNumber ? ` HOP=${options.hopNumber}` : ''));
  }

  /**
   * @param {object} descriptor
   * @param {object} options
   * @param {string} [options.purpose="general"]
   * @param {boolean} [options.cache=true]
   * @returns {string}
   */
  static POSTDESCRIPTOR(descriptor, options = {}) {
    options = {
      purpose: options.purpose || 'general',
      cache: typeof options.cache === 'undefined'
        ? true
        : options.cache
    };

    let descStrings = [];

    for (let key in descriptor) {
      descStrings.push(`${key}=${descriptor[key]}`);
    }

    return new ControlCommand([
      `+POSTDESCRIPTOR purpose=${options.purpose} ` +
        `cache=${options.cache ? 'yes' : 'no'}`,
      descStrings.join('\r\n'),
      '.'
    ].join('\r\n'));
  }

  /**
   * @param {string} streamId
   * @param {string} address
   * @param {number} [port]
   * @returns {string}
   */
  static REDIRECTSTREAM(streamId, address, port = '') {
    return new ControlCommand(`REDIRECTSTREAM ${streamId} ${address} ${port}`);
  }

  /**
   * @param {string} streamId
   * @param {number} [reason=1]
   * @returns {string}
   */
  static CLOSESTREAM(streamId, reason = 1) {
    return new ControlCommand(`CLOSESTREAM ${streamId} ${reason}`);
  }

  /**
   * @param {string} circuitId
   * @param {object} [options]
   * @param {boolean} [options.ifUnused=false]
   * @returns {string}
   */
  static CLOSECIRCUIT(circuitId, options = { ifUnused: false }) {
    return new ControlCommand(`CLOSECIRCUIT ${circuitId}` +
      (options.ifUnused ? ' IfUnused' : ''));
  }

  /**
   * @returns {string}
   */
  static QUIT() {
    return new ControlCommand('QUIT');
  }

  /**
   * @param {string} address
   * @param {boolean} [reverse=false]
   * @returns {string}
   */
  static RESOLVE(address, reverse) {
    return new ControlCommand('RESOLVE ' + (reverse ? 'mode=reverse ' : '') + address);
  }

  /**
   * @param {string} configText
   * @returns {string}
   */
  static LOADCONF(configText) {
    return new ControlCommand(`+LOADCONF\r\n${configText}\r\n.`);
  }

  /**
   * @returns {string}
   */
  static TAKEOWNERSHIP() {
    return new ControlCommand('TAKEOWNERSHIP');
  }

  /**
   * @returns {string}
   */
  static DROPGUARDS() {
    return new ControlCommand('DROPGUARDS');
  }

  /**
   * @param {string} serviceId
   * @param {string} [serverLongName]
   * @returns {string}
   */
  static HSFETCH(serviceId, serverLongName) {
    return new ControlCommand(`HSFETCH ${serviceId}` +
      (serverLongName ? ` SERVER=${serverLongName}` : ''));
  }

  /**
   * @param {string} descriptor
   * @param {string} [serverLongName]
   * @returns {string}
   */
  static HSPOST(descriptor, serverLongName) {
    return new ControlCommand('+HSPOST\r\n' +
      (serverLongName ? `SERVER=${serverLongName}\r\n` : '') +
      `${descriptor}\r\n.`);
  }

  /**
   * @param {string} keyword
   * @returns {string}
   */
  static GETINFO(keyword) {
    return new ControlCommand(`GETINFO ${keyword}`);
  }

  /**
   * @param {string[]} events
   * @returns {string}
   */
  static SETEVENTS(events) {
    return new ControlCommand(`SETEVENTS ${events.join(' ')}`);
  }

}

module.exports.ControlCommand = ControlCommand;
