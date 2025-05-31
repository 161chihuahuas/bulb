/**
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

const replies = require('./lib/replies');

/**
 * {@link module:granax/replies~ControlReply}
 */
module.exports.ControlReply = replies.ControlReply;

/**
 * {@link module:granax/replies~AuthChallengeReply}
 */
module.exports.AuthChallengeReply = replies.AuthChallengeReply;

/**
 * {@link module:granax/replies~ProtocolInfoReply}
 */
module.exports.ProtocolInfoReply = replies.ProtocolInfoReply;

/**
 * {@link module:granax/replies~AddOnionReply}
 */
module.exports.AddOnionReply = replies.AddOnionReply;

/**
 * {@link module:granax/replies~GetInfoReply}
 */
module.exports.GetInfoReply = replies.GetInfoReply;

/**
 * {@link module:granax/replies~GetConfReply}
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
