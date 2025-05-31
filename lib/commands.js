/**
 * @module granax/commands
 * @see https://spec.torproject.org/control-spec/commands.html
 */

'use strict';


class ControlCommand {

  /**
   * Wraps a control command to send over the control port.
   * @param {string} commandStr - Command to send.
   */
  constructor(str) {
    /**
     * @property {string} cmd - Command instance was intialized with.
     */
    this.cmd = str;
  }

  /**
   * Unwraps the command as a raw string.
   * @returns {string}
   */
  toString() {
    return this.cmd;
  }

  /**
   * Map of control signals.
   * @see https://spec.torproject.org/control-spec/commands.html#signal
   * @typedef {Object<string, string>} module:granax/commands~ControlCommand~Signal
   */
  static get Signal() {
    return {
      RELOAD: 'RELOAD',
      SHUTDOWN: 'SHUTDOWN',
      DUMP: 'DUMP',
      DEBUG: 'DEBUG',
      HALT: 'HALT',
      CLEARDNSCACHE: 'CLEARDNSCACHE',
      NEWNYM: 'NEWNYM',
      HEARTBEAT: 'HEARTBEAT'
    };
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#authenticate
   * @param {string} [token=""] - The auth token to send.
   * @returns {module:granax/commands~ControlCommand}
   */
  static AUTHENTICATE(token = '') {
    return new ControlCommand(`AUTHENTICATE ${token}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#authchallenge
   * @param {string} [nonce=""] - Client nonce for challenge.
   * @param {string} [type="SAFECOOKIE"] - The type of challenge.
   * @returns {module:granax/commands~ControlCommand}
   */
  static AUTHCHALLENGE(nonce = '', type = 'SAFECOOKIE') {
    return new ControlCommand(`AUTHCHALLENGE ${type} ${nonce}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#protocolinfo
   * @returns {module:granax/commands~ControlCommand}
   */
  static PROTOCOLINFO() {
    return new ControlCommand('PROTOCOLINFO');
  }
 
  /**
   * @typedef {object} module:granax/commands~ControlCommand~AddOnionOptions
   * @property {string} [clientName] - Client auth identifier.
   * @property {string} [clientBlob] - Arbitrary auth data.
   * @property {string} [keyType="NEW"] - Create a new key or use RSA1024.
   * @property {string} [keyBlob="BEST"] - Key type to create or serialized.
   * @property {boolean} [discardPrivateKey=false] - Do not return key.
   * @property {boolean} [detach=false] - Keep service running after close.
   * @property {boolean} [basicAuth=false] - Use client name and blob auth.
   * @property {boolean} [nonAnonymous=false] - Non-anononymous mode.
   * @property {number} [virtualPort=80] - Virtual port to expose on the hidden service.
   */

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#add_onion
   * @param {string|number[]|number} ports - Ports to map this onion service to.
   * @param {module:granax/commands~ControlCommand~AddOnionOptions} [addOnionOpts] - Configuration options.
   * @returns {module:granax/commands~ControlCommand}
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
      if (typeof ports === 'string' || typeof ports === 'number') {
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
   * @see https://spec.torproject.org/control-spec/commands.html#del_onion
   * @param {string} serviceId - Onion address excluding ".onion".
   * @returns {module:granax/commands~ControlCommand}
   */
  static DEL_ONION(serviceId) {
    return new ControlCommand(`DEL_ONION ${serviceId}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#setconf
   * @param {string} keyword - Configuration key.
   * @param {string} value - Configuration value.
   * @returns {module:granax/commands~ControlCommand}
   */
  static SETCONF(keyword, value) {
    return new ControlCommand(`SETCONF ${keyword}="${value}"`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#resetconf
   * @param {string} keyword - Configuration key to reset.
   * @returns {module:granax/commands~ControlCommand}
   */
  static RESETCONF(keyword) {
    return new ControlCommand(`RESETCONF ${keyword}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#getconf
   * @param {string} keyword - Configuration key to get.
   * @returns {module:granax/commands~ControlCommand}
   */
  static GETCONF(keyword) {
    return new ControlCommand(`GETCONF ${keyword}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#saveconf
   * @returns {module:granax/commands~ControlCommand}
   */
  static SAVECONF() {
    return new ControlCommand('SAVECONF');
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#signal
   * @param {string} signal - {@link module:granax/commands~ControlCommand~Signal} type to send.
   * @returns {module:granax/commands~ControlCommand}
   */
  static SIGNAL(signal) {
    return new ControlCommand(`SIGNAL ${signal}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#mapaddress
   * @param {string} targetAddr - Address to map from.
   * @param {string} replaceAddr - Address to map to.
   * @returns {module:granax/commands~ControlCommand}
   */
  static MAPADDRESS(targetAddr, replaceAddr) {
    return new ControlCommand(`MAPADDRESS ${targetAddr}=${replaceAddr}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#extendcircuit
   * @param {string} circuitId - Circuit ID to extend.
   * @param {string} [purpose] - Purpose to set for the circuit.
   * @returns {module:granax/commands~ControlCommand}
   */
  static EXTENDCIRCUIT(circuitId, purpose) {
    return new ControlCommand(`EXTENDCIRCUIT ${circuitId}` +
      (purpose ? ` purpose="${purpose}"` : ''));
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#setcircuitpurpose
   * @param {string} circuitId - Circuit ID to set purpose for.
   * @param {string} [purpose] - Purpose to set for the circuit.
   * @returns {module:granax/commands~ControlCommand}
   */
  static SETCIRCUITPURPOSE(circuitId, purpose) {
    return new ControlCommand(`SETCIRCUITPURPOSE ${circuitId} purpose="${purpose}"`);
  }

  /**
   * @typedef {object} module:granax/commands~ControlCommand~AttachStreamOptions
   * @property {string} circuitId - Circuit ID to attach stream to.
   * @property {string} [hopNumber] - Hop number in circuit to attach stream to.
   */

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#attachstream
   * @param {string} streamId - Stream ID to attach to circuit.
   * @param {module:granax/commands~ControlCommand~AttachStreamOptions} options
   * @returns {module:granax/commands~ControlCommand}
   */
  static ATTACHSTREAM(streamId, options) {
    return new ControlCommand(`ATTACHSTREAM ${streamId} ${options.circuitId}` +
      (options.hopNumber ? ` HOP=${options.hopNumber}` : ''));
  }

  /**
   * @typedef {object} module:granax/commands~ControlCommand~PostDescriptorOptions
   * @property {string} [options.purpose="general"] - Set descriptor purpose.
   * @property {boolean} [options.cache=true] - Cache the descriptor.
   */

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#postdescriptor
   * @param {Object.<string, string>} descriptor - Key value pairs for descriptor to post.
   * @param {module:granax/commands~ControlCommand~PostDescriptorOptions} options
   * @returns {module:granax/commands~ControlCommand}
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
   * @see https://spec.torproject.org/control-spec/commands.html#redirectstream
   * @param {string} streamId - Stream ID to redirect.
   * @param {string} address - Hostname to redirect to.
   * @param {number} [port] - Port to redirect to.
   * @returns {module:granax/commands~ControlCommand}
   */
  static REDIRECTSTREAM(streamId, address, port = '') {
    return new ControlCommand(`REDIRECTSTREAM ${streamId} ${address} ${port}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#closestream
   * @param {string} streamId - Stream ID to close.
   * @param {number} [reason=1] - Reason code for closing.
   * @returns {module:granax/commands~ControlCommand}
   */
  static CLOSESTREAM(streamId, reason = 1) {
    return new ControlCommand(`CLOSESTREAM ${streamId} ${reason}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#closecircuit
   * @param {string} circuitId - Circuit ID to close.
   * @param {object} [options]
   * @param {boolean} [options.ifUnused=false] - Only close if circuit is unused.
   * @returns {module:granax/commands~ControlCommand}
   */
  static CLOSECIRCUIT(circuitId, options = { ifUnused: false }) {
    return new ControlCommand(`CLOSECIRCUIT ${circuitId}` +
      (options.ifUnused ? ' IfUnused' : ''));
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#quit
   * @returns {module:granax/commands~ControlCommand}
   */
  static QUIT() {
    return new ControlCommand('QUIT');
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#resolve
   * @param {string} address - Address to resolve.
   * @param {boolean} [reverse=false] - Do reverse lookup.
   * @returns {module:granax/commands~ControlCommand}
   */
  static RESOLVE(address, reverse) {
    return new ControlCommand('RESOLVE ' + (reverse ? 'mode=reverse ' : '') + address);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#loadconf
   * @param {string} configText - Sends the torrc configuration to the controller.
   * @returns {module:granax/commands~ControlCommand}
   */
  static LOADCONF(configText) {
    return new ControlCommand(`+LOADCONF\r\n${configText}\r\n.`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#takeownership
   * @returns {module:granax/commands~ControlCommand}
   */
  static TAKEOWNERSHIP() {
    return new ControlCommand('TAKEOWNERSHIP');
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#dropguards
   * @returns {module:granax/commands~ControlCommand}
   */
  static DROPGUARDS() {
    return new ControlCommand('DROPGUARDS');
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#hsfetch
   * @param {string} serviceId - Hidden service onion URL without ".onion".
   * @param {string} [serverLongName] - Server name to fetch from.
   * @returns {string}
   */
  static HSFETCH(serviceId, serverLongName) {
    return new ControlCommand(`HSFETCH ${serviceId}` +
      (serverLongName ? ` SERVER=${serverLongName}` : ''));
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#hspost
   * @param {string} descriptor - Raw hidden service descriptor string.
   * @param {string} [serverLongName] - Server name to post to.
   * @returns {module:granax/commands~ControlCommand}
   */
  static HSPOST(descriptor, serverLongName) {
    return new ControlCommand('+HSPOST\r\n' +
      (serverLongName ? `SERVER=${serverLongName}\r\n` : '') +
      `${descriptor}\r\n.`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#getinfo
   * @param {string} keyword - Keyword for info to get.
   * @returns {module:granax/commands~ControlCommand}
   */
  static GETINFO(keyword) {
    return new ControlCommand(`GETINFO ${keyword}`);
  }

  /**
   * @see https://spec.torproject.org/control-spec/commands.html#setevents
   * @param {string[]} events - Names of events that tor should send.
   * @returns {module:granax/commands~ControlCommand}
   */
  static SETEVENTS(events) {
    return new ControlCommand(`SETEVENTS ${events.join(' ')}`);
  }

}

module.exports.ControlCommand = ControlCommand;
