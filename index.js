/**
 * @module bulb
 */

'use strict';

/**
 * {@link module:bulb/control~TorControl}
 */
module.exports.TorControl = require('./lib/control').TorControl;

/**
 * {@link module:bulb/control~ControlCommand}
 */
module.exports.ControlCommand = require('./lib/commands').ControlCommand;

const replies = require('./lib/replies');

/**
 * {@link module:bulb/replies~ControlReply}
 */
module.exports.ControlReply = replies.ControlReply;

/**
 * {@link module:bulb/replies~AuthChallengeReply}
 */
module.exports.AuthChallengeReply = replies.AuthChallengeReply;

/**
 * {@link module:bulb/replies~ProtocolInfoReply}
 */
module.exports.ProtocolInfoReply = replies.ProtocolInfoReply;

/**
 * {@link module:bulb/replies~AddOnionReply}
 */
module.exports.AddOnionReply = replies.AddOnionReply;

/**
 * {@link module:bulb/replies~GetInfoReply}
 */
module.exports.GetInfoReply = replies.GetInfoReply;

/**
 * {@link module:bulb/replies~GetConfReply}
 */
module.exports.GetConfReply = replies.GetConfReply;

/**
 * {@link module:bulb/context~TorContext}
 */
module.exports.TorContext = require('./lib/context').TorContext;

/**
 * {@link module:bulb/config~TorConfig}
 */
module.exports.TorConfig = require('./lib/config').TorConfig;

/**
 * {@link module:bulb/network~HiddenServer}
 */
module.exports.HiddenServer = require('./lib/network').HiddenServer;

/**
 * {@link module:bulb/network~HiddenSocket}
 */
module.exports.HiddenSocket = require('./lib/network').HiddenSocket;

/**
 * {@link module:bulb/network~TorHttpAgent}
 */
module.exports.TorHttpAgent = require('./lib/network').TorHttpAgent;
