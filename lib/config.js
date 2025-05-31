/**
 * @module granax/config
 */

'use strict';

const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { mkdirSync, writeFileSync } = require('node:fs');


class TorConfig {

  /**
   * Create a valid torrc configuration file.
   * @param {Object<string, string>} [torrc] - Tor configuration properties.
   * @see https://gitlab.torproject.org/tpo/core/tor/-/blob/HEAD/src/config/torrc.sample.in
   * @see https://2019.www.torproject.org/docs/tor-manual.html.en 
   * @see https://github.com/sickthecat/torrc
   * @see https://support.torproject.org/tbb/tbb-editing-torrc/
   */ 
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
    /**
     * @property {string[]} content - Each line of the torrc that was created.
     */
    this.content = torrcContent;
    /**
     * @property {string} datadir - Data directory tor will use.
     */
    this.datadir = dataDirectory;
  }

  /**
   * Writes the torrc locally to the module.
   * @returns {string[]}
   */
  writeLocal() {
    mkdirSync(this.datadir, { recursive: true });
    writeFileSync(this._torrc, this.toString());
    return this._torrc;
  }

  /**
   * Gets the torrc content as a string.
   * @returns {string}
   */
  toString() {
    return this.content.join('\n');
  }

}

module.exports.TorConfig = TorConfig;
