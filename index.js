/**
 * Embeddable Tor and Control Protocol.
 * @module granax
 */

'use strict';

/**
 * {@link module:granax/control~TorControl}
 */
module.exports.TorControl = require('./lib/control').TorControl;

/**
 * {@link module:granax/control~ControlCommand}
 */
module.exports.ControlCommand = require('./lib/commands').ControlCommand;

/**
 * {@link module:granax/control~ControlReply}
 */
const replies = require('./lib/replies');

/**
 * {@link module:granax/control~ControlReply}
 */
module.exports.ControlReply = replies.ControlReply;

/**
 * {@link module:granax/control~ProtocolInfoReply}
 */
module.exports.AuthChallengeReply = replies.AuthChallengeReply;

/**
 * {@link module:granax/control~ProtocolInfoReply}
 */
module.exports.ProtocolInfoReply = replies.ProtocolInfoReply;

/**
 * {@link module:granax/control~AddOnionReply}
 */
module.exports.AddOnionReply = replies.AddOnionReply;

/**
 * {@link module:granax/control~GetInfoReply}
 */
module.exports.GetInfoReply = replies.GetInfoReply;

/**
 * {@link module:granax/control~GetConfReply}
 */
module.exports.GetConfReply = replies.GetConfReply;

/**
 * {@link module:granax/context~TorContext}
 */
module.exports.TorContext = require('./lib/context').TorContext;

/**
 * {@link module:granax/config~TorConfig}
 */
module.exports.TorConfig = require('./lib/config').TorConfig;

/**
 * {@link module:granax/network~HiddenServer}
 */
module.exports.HiddenServer = require('./lib/network').HiddenServer;

/**
 * {@link module:granax/network~HiddenSocket}
 */
module.exports.HiddenSocket = require('./lib/network').HiddenSocket;

/**
 * {@link module:granax/network~TorHttpAgent}
 */
module.exports.TorHttpAgent = require('./lib/network').TorHttpAgent;
