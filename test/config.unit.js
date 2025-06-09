'use strict';

const proxyquire = require('proxyquire');
const { expect } = require('chai');
const sinon = require('sinon');


describe('@module bulb/torrc', function() {

  describe('@exports', function() {

    it('should write the torrc', function() {
      const _mkdirpSync = sinon.stub();
      const _writeFileSync = sinon.stub();
      const { TorConfig } = proxyquire('../lib/config', {
        'node:fs': {
          mkdirSync: _mkdirpSync,
          writeFileSync: _writeFileSync
        }
      });
      const torrc = new TorConfig();
      torrc.writeLocal();
      expect(_mkdirpSync.called).to.equal(true);
      expect(_writeFileSync.called).to.equal(true);
      expect(torrc.content.length > 0).to.equal(true);
      expect(typeof torrc.datadir).to.equal('string');
    });

  });

});
