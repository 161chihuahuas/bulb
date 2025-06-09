/**
 * @module bulb/control
 */

'use strict';

const { createHmac, randomBytes } = require('node:crypto');
const { Transform: TransformStream } = require('node:stream');
const { readFileSync } = require('node:fs');
const { EventEmitter } = require('node:events');
const { ControlCommand } = require('./commands');
const { ControlReply } = require('./replies');


class TorControl extends EventEmitter {

  static get CLIENT_HASH() {
    return 'Tor safe cookie authentication controller-to-server hash';
  }

  /**
   * Creates the challenge response from a SAFECOOKIE challenge
   * @param {string} cookie - The secret cookie string
   * @param {string} clientNonce - Client nonce sent with auth challenge
   * @param {string} serverNonce - Server nonce reply from auth challenge
   * @returns {string}
   */
  static createChallengeResponse(cookie, clientNonce, serverNonce) {
    return createHmac('sha256', TorControl.CLIENT_HASH)
      .update(Buffer.concat([
        Buffer.from(cookie, 'hex'),
        Buffer.from(clientNonce, 'hex'),
        Buffer.from(serverNonce, 'hex')
      ]))
      .digest('hex');
  }

  /**
   * Creates a message splitter from incoming socket data
   * @static
   */
  static createReplySplitter() {
    return new TransformStream({
      objectMode: true,
      transform: function(data, enc, next) {
        let reply = [];
        let lines = data.toString().split('\r\n');

        for (let line of lines) {
          reply.push(line);

          if (line[3] === ' ') {
            this.push(reply);
            reply = [];
          }
        }

        next(null);
      }
    });
  }

  /**
   * Fired when the underlying socket encounters an error
   * @event module:bulb/control~TorControl#error
   * @type {Error}
   */

  /**
   * Fires when the controller is authenticated and ready to send commands
   * @event module:bulb/control~TorControl#ready
   * @type {module:bulb/control~TorControl}
   */

  /**
   * Fires when the underlying socket closes
   * @event module:bulb/control~TorControl#close
   */

  static get DEFAULTS() {
    return {
      authOnConnect: true
    };
  }

  /**
   * @constructor
   * @param {Socket} socket - net.Socket connected to Tor's control port
   * @param {object} [options]
   * @param {boolean} [options.authOnConnect=true] - Automatically authenticate
   */
  constructor(socket, options = TorControl.DEFAULTS) {
    super();

    this._opts = options;
    this._stack = [];

    this.socket = socket
      .on('connect', () => this._handleConnect())
      .on('error', (err) => this._handleError(err))
      .on('close', () => this._handleClose());

    this.socket.pipe(TorControl.createReplySplitter())
      .on('data', (data) => this._handleReply(data));
  }

  /**
   * Handles authentication routine on socket connect
   * @private
   */
  async _authOnConnect() {
    const clientNonce = randomBytes(32).toString('hex');
    const { cookie, methods: authTypes } = await this._getAuthCookie();
    
    let challenge;

    if (authTypes.includes('SAFECOOKIE')) {
      challenge = await this.getAuthChallenge(clientNonce);
    }
  
    if (!challenge || !(challenge.hash && challenge.nonce)) {
      return this.authenticate(cookie);
    }

    const { hash, nonce } = challenge;

    return this.authenticate(TorControl.createChallengeResponse(
      cookie,
      clientNonce,
      nonce,
      hash
    ));
  }

  /**
   * Handles authentication upon socket connection
   * @private
   */
  async _handleConnect() {
    if (this._opts.authOnConnect) {
      try {
        await this._authOnConnect();
      } catch (e) {
        return this.emit('error', e);
      }
    }
      
    this.emit('ready');
  }

  /**
   * Handles errors on the underlying socket and bubbles them
   * @private
   * @param {object} error
   */
  _handleError(err) {
    this.emit('error', err);
  }

  /**
   * Handles message processing and parsing from the socket
   * @private
   * @param {buffer} data
   */
  _handleReply(data) {
    let code = parseInt(data[0].substr(0, 3));
    let lines = data
      .filter((line) => !!line)
      .map((line) => line.substr(4).trim());

    switch (code.toString()[0]) {
      case '2':
        let reply = this._stack.pop();

        if (!reply) {
          return;
        }

        let { method, callback } = reply;
        let parsed = ControlReply[method]
          ? ControlReply[method](lines)
          : new ControlReply({ reply: lines });
        callback(null, parsed);
        break;
      case '4':
      case '5':
        this._stack.pop().callback(new Error(lines[0]));
        break;
      case '6':
      default:
        let event = lines[0].split(' ')[0];
        lines[0] = lines[0].replace(`${event} `, '');
        this.emit(event, lines);
    }
  }

  /**
   * Handles socket close event and bubbles it
   * @private
   */
  _handleClose() {
    this.emit('close');
  }

  /**
   * Send an arbitrary command and pass response to callback
   * @private
   * @param {string} command
   * @param {function} callback
   */
  _send(command) {
    return new Promise((resolve, reject) => {
      function __callback(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      };
      command = command.toString();

      this._stack.unshift({ method: command.split(' ')[0], callback: __callback });
      this.socket.write(`${command}\r\n`);
    });
  }

  /**
   * Load the authentication cookie
   * @private
   */
  _getAuthCookie() {
    return this.getProtocolInfo().then((info) => {
      return {
        cookie: info.auth.cookieFile
            ? readFileSync(info.auth.cookieFile).toString('hex')
            : '',
        methods: info.auth.methods
      };
    });
  }

  /**
   * Authenticates with the control port given the supplied param
   * @param {string} token
   */
  authenticate(token) {
    return this._send(ControlCommand.AUTHENTICATE(token));
  }

  /**
   * Requests an authentication challenge from tor
   * @param {string} nonce - Client nonce for authenticating
   */
  getAuthChallenge(nonce) {
    return this._send(ControlCommand.AUTHCHALLENGE(nonce));
  }

  /**
   * Ask tor for general information
   */
  getProtocolInfo() {
    return this._send(ControlCommand.PROTOCOLINFO());
  }

  /**
   * Establishes a hidden service on the given target
   * @param {array} ports - Array containing optional virtualPort (defaults to 80) and target ip:port string
   * @param {object} [options] - {@link module:commands#ADD_ONION}
   */
  createHiddenService(ports, options) {
    return this._send(ControlCommand.ADD_ONION(ports, options));
  }

  /**
   * Takes down a running hidden service owned by this controller
   * @param {string} serviceId - Tor hidden service ID
   */
  destroyHiddenService(serviceId) {
    return this._send(ControlCommand.DEL_ONION(serviceId));
  }

  /**
   * Change the value for a configuration variable
   * @param {string} keyword - Configuration key
   * @param {string} value - New value to set
   */
  setConfig(keyword, value) {
    return this._send(ControlCommand.SETCONF(keyword, value));
  }

  /**
   * Change the value for a configuration variable to it's default
   * @param {string} keyword - Configuration key
   */
  resetConfig(keyword) {
    return this._send(ControlCommand.RESETCONF(keyword));
  }

  /**
   * Return the values for the given configuration key
   * @param {string} keyword - Configuration key
   */
  getConfig(keyword) {
    return this._send(ControlCommand.GETCONF(keyword));
  }

  /**
   * Tell Tor to write out it's config value to it's torrc
   */
  saveConfig() {
    return this._send(ControlCommand.SAVECONF());
  }

  /**
   * Reloads the config values set
   */
  reloadConfig() {
    return this.signal(ControlCommand.Signal.RELOAD);
  }

  /**
   * Controlled shutdown signal
   */
  shutdown() {
    return this.signal(ControlCommand.Signal.SHUTDOWN);
  }

  /**
   * Dump stats to tor log file
   */
  dumpStats() {
    return this.signal(ControlCommand.Signal.DUMP);
  }

  /**
   * Set open logs to debug level
   */
  enableDebug() {
    return this.signal(ControlCommand.Signal.DEBUG);
  }

  /**
   * Shutdown tor immediately
   */
  halt() {
    return this.signal(ControlCommand.Signal.HALT);
  }

  /**
   * Forget client side hostname->ip cache
   */
  clearDnsCache() {
    return this.signal(ControlCommand.Signal.CLEARDNSCACHE);
  }

  /**
   * Clears DNS cache and establishes new clean circuits
   */
  cleanCircuits() {
    return this.signal(ControlCommand.Signal.NEWNYM);
  }

  /**
   * Dumps a heartbeat message to the logs
   */
  dumpHeartbeat() {
    return this.signal(ControlCommand.Signal.HEARTBEAT);
  }

  /**
   * Sends a signal to the control port
   * @param {string} signal
   */
  signal(sig) {
    return this._send(ControlCommand.SIGNAL(sig));
  }

  /**
   * Instruct Tor to route requests to the target to the replacement
   * @param {string} target - Original address to map
   * @param {string} replacement - New address to route request to target
   */
  createAddressMapping(target, replacement) {
    return this._send(ControlCommand.MAPADDRESS(target, replacement));
  }

  /**
   * Creates a new circuit, returning the newly created circuit ID
   * @param {string} [purpose="general"] - The circuit purpose, either general|controller
   */
  createCircuit(purpose) {
    return this._send(ControlCommand.EXTENDCIRCUIT('0', purpose));
  }

  /**
   * Extends the existing circuit
   * @param {string} circuitId - The circuit ID to extend
   */
  extendCircuit(id) {
    return this._send(ControlCommand.EXTENDCIRCUIT(id));
  }

  /**
   * Sets the purpose of the given circuit
   * @param {string} circuitId - The identifier for the circuit
   * @param {string} purpose - One of general|controller
   */
  setCircuitPurpose(circuitId, purpose) {
    return this._send(ControlCommand.SETCIRCUITPURPOSE(circuitId, purpose));
  }

  /**
   * Attaches the specified stream to the given circuit
   * @param {string} streamId - ID for the stream to attach
   * @param {string} [circuitId=0] - Circuit to attach stream
   * @param {number} [hopNumber] - Which hop to exit circuit
   */
  attachStream(streamId, options = { circuitId: '0', hopNumber: null }) {
    return this._send(ControlCommand.ATTACHSTREAM(streamId, options));
  }

  /**
   * Inform the server about a new descriptor
   * @param {object} descriptor - Key-value pairs for server descriptor
   * @param {object} [options]
   * @param {string} [options.purpose="general"] - general|controller|bridge
   * @param {boolean} [options.cache=true] - Flag for caching descriptor
   */
  postDescriptor(descriptor, options) {
    return this._send(ControlCommand.POSTDESCRIPTOR(descriptor, options));
  }

  /**
   * Change the exit address on a given stream
   * @param {string} streamId - ID for stream to redirect
   * @param {string} address - Exit address for the given stream
   * @param {number} [port] - Exit port for the given stream
   */
  redirectStream(streamId, address, port) {
    return this._send(ControlCommand.REDIRECTSTREAM(streamId, address, port));
  }

  /**
   * Closes the exit for the given stream
   * @param {string} streamId - ID for the stream to close
   * @param {number} [reason=1] - Reason code for closing stream
   * @see https://gitweb.torproject.org/torspec.git/tree/tor-spec.txt#n1404
   */
  closeStream(streamId, reason = 1) {
    return this._send(ControlCommand.CLOSESTREAM(streamId, reason));
  }

  /**
   * Closes the given circuit
   * @param {string} circuitId - ID for the circuit to close
   * @param {object} [options]
   * @param {boolean} [options.ifUnused=false] - Only close if not in use
   */
  closeCicuit(circuitId, options = { ifUnused: false }) {
    return this._send(ControlCommand.CLOSECIRCUIT(circuitId, options));
  }

  /**
   * Tells Tor to hang up on the controller
   */
  quit() {
    return this._send(ControlCommand.QUIT());
  }

  /**
   * Launch remote hostname lookup - answer returnd as async ADDRMAP event
   * @param {string} address - Address to lookup
   * @param {object} [options]
   * @param {boolean} [options.reverse=false] - Perform reverse lookup
   */
  resolve(address, options = { reverse: false }) {
    return this._send(ControlCommand.RESOLVE(address, options.reverse));
  }

  /**
   * Instruct Tor to load the configuration file from the given text
   * @param {string} configText - Complete torrc config text to load
   */
  loadConfig(configText) {
    return this._send(ControlCommand.LOADCONF(configText));
  }

  /**
   * Take ownership of the tor process - will close tor when the connection
   * closes
   */
  takeOwnership() {
    return this._send(ControlCommand.TAKEOWNERSHIP())
      .then(this.resetConfig('__OwningControllerProcess'));
  }

  /**
   * Tells the server to drop all guard nodes. Do not invoke this command
   * lightly; it can increase vulnerability to tracking attacks over time.
   */
  dropGuards() {
    return this._send(ControlCommand.DROPGUARDS());
  }

  /**
   * Fetches descriptors for the given hidden service
   * @param {string} serviceId - ID for the hidden service
   * @param {string} [serverLongName] - Long name for specific server to use
   */
  fetchHiddenServiceDescriptor(serviceId, serverLongName) {
    return this._send(ControlCommand.HSFETCH(serviceId, serverLongName));
  }

  /**
   * Launch a hidden service descriptor upload
   * @param {string} descriptor
   * @param {string} [serverLongName] - Long name for specific server to use
   * @see https://gitweb.torproject.org/torspec.git/tree/rend-spec.txt#n193
   */
  postHiddenServiceDescriptor(descriptor, serverLongName = '') {
    return this._send(ControlCommand.HSPOST(descriptor, serverLongName));
  }

  /**
   * Get information from Tor not stored in configuration
   * @param {string} keyword - Keyword for info to fetch
   * @see https://gitweb.torproject.org/torspec.git/tree/control-spec.txt#n500
   */
  getInfo(keyword) {
    return this._send(ControlCommand.GETINFO(keyword));
  }

  /**
   * Instructs Tor to send asynchronous events for the given types - these
   * events will be emitted from the controller. Calling this method resets
   * previously set event listeners
   * @param {string[]} events - List of event types to listen for
   * @see https://gitweb.torproject.org/torspec.git/tree/control-spec.txt#n1708
   */
  addEventListeners(events) {
    return this._send(ControlCommand.SETEVENTS(events));
  }

  /**
   * Instructs Tor to stop listening for events
   */
  removeEventListeners() {
    return this._send(ControlCommand.SETEVENTS([]));
  }

}

module.exports.TorControl = TorControl;
