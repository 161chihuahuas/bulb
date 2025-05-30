/**
 * @module granax/torrc
 */

'use strict';

const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { tmpdir } = require('node:os');
const { mkdirSync, writeFileSync } = require('node:fs');


/**
 * Generates a usable torrc file, writes it to temp storage and then returns
 * the path to the file
 * @param {object} options
 * @returns {string}
 */
class TorConfig {

  constructor(options = {}) {
    let id = randomBytes(8).toString('hex');
    let dataDirectory = path.join(__dirname, `../.data`);
    let torrcFile = path.join(__dirname, `../.torrc`);
    let controlFilePath = path.join(dataDirectory, 'control-port');
    let socksPort = 'auto IPv6Traffic PreferIPv6 KeepAliveIsolateSOCKSAuth';
    let torrcContent = [
      'AvoidDiskWrites 1',
      'ControlPort auto',
      'CookieAuthentication 1'
    ];

    if (!Array.isArray(options)) {
      options = [options];
    }

    for (let block of options) {
      for (let property in block) {
        // NB: Don't push the DataDirectory SocksPort until later so we can
        // ND: default it
        if (property === 'DataDirectory') {
          dataDirectory = block[property];
          torrcFile = path.join(dataDirectory, 'torrc');
          controlFilePath = path.join(dataDirectory, 'control-port')
          continue;
        }
        if (property === 'SocksPort') {
          socksPort = block[property];
          continue;
        }
        torrcContent.push(`${property} ${block[property]}`);
      }
    }

    torrcContent.push(`DataDirectory ${dataDirectory}`);
    torrcContent.push(`SocksPort ${socksPort}`);
    torrcContent.push(`ControlPortWriteToFile ${controlFilePath}`);
    
    this._torrc = torrcFile;
    this.content = torrcContent;
    this.datadir = dataDirectory;
  }

  tmpWrite() {
    mkdirSync(this.datadir, { recursive: true });
    writeFileSync(this._torrc, this.toString());
    return this._torrc;
  }

  toString() {
    return this.content.join('\n');
  }

}

module.exports.TorConfig = TorConfig;
