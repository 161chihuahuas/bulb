'use strict';

const fs = require('node:fs');
const { request } = require('node:https');
const path = require('node:path');
const childProcess = require('node:child_process');
const os = require('node:os');
const { getExecPath: getTorPath } = require('..').TorContext;
const getLatestTorBrowserVersion = () => '13.5.9';
const BIN_DIR = path.join(__dirname, '../.bin');
const { Transform } = require('node:stream');


/**
 * Get the platform specific download like for TBB by version
 * @param {string} platform
 * @param {string} version
 * @param {function} callback
 * @returns {string}
 */
exports.getTorBrowserLink = function(platform = 'linux') {
  function createHref(v) {
    const link = `https://archive.torproject.org/tor-package-archive/torbrowser/${v}/tor-expert-bundle-`;

    switch (platform) {
      case 'darwin':
        return `${link}macos-x86_64-${v}.tar.gz`;
      case 'linux':
        return `${link}linux-x86_64-${v}.tar.gz`;
      default:
        throw new Error(`Unsupported platform "${platform}"`);
    }
  }

  return createHref(getLatestTorBrowserVersion(platform));
};

/**
 * Downloads the package to the given directory
 * @param {string} link
 * @param {string} target
 * @param {function} callback
 */
exports.downloadTorBrowserBundle = function(link, target, callback) {
  request(link, (res) => {
    if (res.statusCode !== 200) {
      callback(new Error(
        'Failed to download Tor Bundle, status code: ' + res.statusCode
      ));
    } else {
      res.pipe(fs.createWriteStream(target))
        .on('finish', callback)
        .on('error', callback);
    }
  }).end();
};

/**
 * Unpacks the package at the given path based on platform and callback with
 * the path to the tor executable
 * @param {string} bundle
 * @param {function} callback
 */
exports.unpackTorBrowserBundle = function(bundle, callback) {
  switch(path.extname(bundle)) {
    case '.dmg':
      return exports._unpackMacintosh(bundle, callback);
    case '.xz':
      return exports._unpackLinux(bundle, callback);
    default:
      throw new Error('Unsupported bundle type');
  }
};

/**
 * @private
 */
exports._unpackMacintosh = function(bundle, callback) {
  const mounter = childProcess.spawn('hdiutil', [
    'attach',
    '-mountpoint',
    path.join(BIN_DIR, '.tbb'),
    path.join(BIN_DIR, '.tbb.dmg')
  ], { cwd: BIN_DIR });

  mounter.on('close', (code) => {
    if (code < 0) {
      return callback(new Error('Failed to unpack bundle'));
    }

    ncp.ncp(
      path.join(BIN_DIR, '.tbb', 'Tor Browser.app'),
      path.join(BIN_DIR, '.tbb.app'),
      (err) => {
        if (err) {
          return callback(new Error('Failed to unpack bundle'));
        }

        const extract = childProcess.spawn('hdiutil', [
          'detach',
          path.join(BIN_DIR, '.tbb')
        ], { cwd: BIN_DIR });

        extract.on('close', (code) => {
          if (code < 0) {
            callback(new Error('Failed to unpack bundle'));
          }

          callback(null, getTorPath('darwin'));
        });
      }
    );
  });
};

/**
 * @private
 */
exports._unpackLinux = function(bundle, callback) {
  const extract = childProcess.spawn('tar', [
    'xzf',
    path.join(BIN_DIR, '.bundle.gz')
  ], { cwd: BIN_DIR });

  extract.stdout.pipe(process.stdout);
  extract.stderr.pipe(process.stderr);

  extract.on('close', (code) => {
    callback(code <= 0 ? null : new Error('Failed to unpack bundle'),
             getTorPath('linux'));
  });
};

/**
 * Detects the platform and installs TBB
 * @param {function} callback
 */
exports.install = function(callback) {
  let basename = null;

  switch (os.platform()) {
    case 'darwin':
    case 'linux':
      basename = '.bundle.gz';
      break;
    default:
      throw new Error('Unsupported platform');
  }

  basename = path.join(BIN_DIR, basename);

  const link = exports.getTorBrowserLink(os.platform());
  console.log(`Downloading Tor Bundle from ${link}...`);
  exports.downloadTorBrowserBundle(link, basename, (err) => {
    if (err) {
      return callback(err);
    }

    console.log(`Unpacking Tor Bundle into ${BIN_DIR}...`);
    exports._unpackLinux(basename, (err, bin) => {
      if (err) {
        return callback(err);
      }

      if (process.env.GRANAX_TOR_VERSION) {
        return callback(null, bin);
      }
      
      callback(null, path.join(BIN_DIR, 'tor', path.basename(
        getTorPath(os.platform())
      )));
    });
  });
};

exports.install(() => console.log('\n\n   ~~~ <3 ~~~ \n\n'));
