'use strict';

const proxyquire = require('proxyquire');
const { expect } = require('chai');
const sinon = require('sinon');
const stream = require('node:stream');
const { TorControl } = require('../lib/control');


describe('TorControl', function() {

  describe('@static createChallengeResponse', function() {

    it('should return a sha256 hmac hex string', function() {
      expect(TorControl.createChallengeResponse(
        '000000',
        '000000',
        '000000'
      )).to.equal(
        'f2fdce7d661f9a99bc1049eb5c9b3e6ec5b2dd3234abc5bef964c9599993df55'
      );
    });

  });

  describe('@static @method createReplySplitter', function() {

    it('should split distinct message replies into separate', function(done) {
      let splitter = TorControl.createReplySplitter();
      let replies = 0;
      splitter.on('data', () => replies++);
      splitter.on('end', () => {
        expect(replies).to.equal(3);
        done();
      });
      splitter.write(
        [
          '250 OK',
          '250-Multi',
          '250-Line',
          '250 OK',
          '512 Bad something'
        ].join('\r\n')
      );
      splitter.end();
    });

  });

  describe('@constructor', function() {

    let sandbox = sinon.createSandbox();
    let sock = new stream.Duplex({ read: () => null, write: () => null });
    let tor = null;

    before(function() {
      sandbox.stub(TorControl, 'createReplySplitter').returns(
        new stream.PassThrough()
      );
      tor = new TorControl(sock, { authOnConnect: false });
      sandbox.stub(tor, '_handleClose');
      sandbox.stub(tor, '_handleConnect');
      sandbox.stub(tor, '_handleError');
      sandbox.stub(tor, '_handleReply');
    });

    it('should call handlers on socket events', function(done) {
      sock.emit('connect');
      sock.emit('error');
      sock.emit('close');
      sock.push('test');
      setImmediate(() => {
        expect(tor._handleConnect.called).to.equal(true);
        expect(tor._handleError.called).to.equal(true);
        expect(tor._handleClose.called).to.equal(true);
        expect(tor._handleReply.called).to.equal(true);
        done();
      });
    });

    after(function() {
      sandbox.restore();
    });

  });

  describe('@private @method _authOnConnect', function() {

    it('should auth with SAFECOOKIE', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      sinon.stub(tor, '_getAuthCookie').callsFake(function() {
        return Promise.resolve({ cookie: 'cookie', methods: ['SAFECOOKIE', 'COOKIE'] });
      });
      let getAuthChallenge = sinon.stub(tor, 'getAuthChallenge').callsFake(function() {
        return Promise.resolve({ hash: 'hash', nonce: '000000' });
      });
      sinon.stub(tor, 'authenticate').callsFake(() => Promise.resolve());
      tor._authOnConnect().then(() => {
        expect(getAuthChallenge.called).to.equal(true);
        done();
      });
    });

    it('should auth with COOKIE', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      sinon.stub(tor, '_getAuthCookie').callsFake(() => {
        return Promise.resolve({ cookie: 'cookie', methods: ['COOKIE'] });
      });
      let getAuthChallenge = sinon.stub(tor, 'getAuthChallenge').callsFake(function() {
        return Promise.resolve({ hash: 'hash', nonce: '000000' });
      });
      sinon.stub(tor, 'authenticate').callsFake(() => Promise.resolve());
      tor._authOnConnect().then(() => {
        expect(getAuthChallenge.called).to.equal(false);
        done();
      });
    });

  });

  describe('@private @method _handleConnect', function() {

    it('should emit error if auth fails', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: true });
      tor.on('error', (err) => {
        expect(err.message).to.equal('Auth failed');
        done();
      });
      sinon.stub(tor, '_authOnConnect').callsFake(() => Promise.reject(new Error('Auth failed')));
      setImmediate(() => sock.emit('connect'));
    });

    it('should emit ready if auth succeeds', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: true });
      sinon.stub(tor, '_authOnConnect').callsFake(() => Promise.resolve());
      tor.on('ready', done);
      sock.emit('connect');
    });

    it('should emit ready if no auth', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      let _authOnConnect = sinon.stub(tor, '_authOnConnect').callsFake(() => Promise.resolve());
      tor.on('ready', () => {
        expect(_authOnConnect.called).to.equal(false);
        done();
      });
      sock.emit('connect');
    });

  });

  describe('@private @method _handleClose', function() {

    it('should bubble socket close', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      tor.on('close', done);
      sock.emit('close');
    });

  });

  describe('@private @method _handleError', function() {

    it('should bubble socket error', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      tor.on('error', () => done());
      sock.emit('error', new Error('Socket error'));
    });

  });

  describe('@private @method _handleReply', function() {

    it('should call handler with parsed reply', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      tor._stack.push({ method: 'GETINFO', callback: test });
      function test(err, data) {
        expect(data.info).to.equal('testvalue');
        done();
      }
      tor._handleReply([
        '250 Key=testvalue'
      ]);
    });

    it('should call handler with raw reply', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      tor._stack.push({ method: 'NOMETHOD', callback: test });
      function test(err, data) {
        expect(data.reply[0]).to.equal('some arbitrary data');
        done();
      }
      tor._handleReply([
        '250 some arbitrary data'
      ]);
    });

    it('should call handler with error', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      tor._stack.push({ method: 'TEST', callback: test });
      function test(err) {
        expect(err.message).to.equal('Chill out br0');
        done();
      }
      tor._handleReply([
        '420 Chill out br0'
      ]);
    });

    it('should call handler with error', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      tor._stack.push({ method: 'TEST', callback: test });
      function test(err) {
        expect(err.message).to.equal('You did something wrong');
        done();
      }
      tor._handleReply([
        '512 You did something wrong'
      ]);
    });

    it('should emit an event', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      tor.on('EVENT', () => done());
      tor._handleReply([
        '650 EVENT'
      ]);
    });

  });

  describe('@private @method _getAuthCookie', function() {

    it('should bubble error from get protocol', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      sinon.stub(tor, 'getProtocolInfo').callsFake(() => Promise.reject(new Error('Failed')));
      tor._getAuthCookie().catch(err => {
        expect(err.message).to.equal('Failed');
        done();
      });
    });

    it('should callback fs read error', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      sinon.stub(tor, 'getProtocolInfo').callsFake(() => Promise.resolve({
        auth: {
          cookieFile: 'NOTAREALFILE.IMSERIOUS',
          methods: ['SAFECOOKIE']
        }
      }));
      tor._getAuthCookie().catch(err => {
        expect(err.message.includes('ENOENT')).to.equal(true);
        done();
      });
    });

    it('should callback with no cookie if not one', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      sinon.stub(tor, 'getProtocolInfo').callsFake(() => Promise.resolve({
        auth: {
          cookieFile: null,
          methods: ['HASHPASSWORD']
        }
      }));
      tor._getAuthCookie().then(({ cookie, methods }) => {
        expect(cookie).to.equal('');
        expect(methods[0]).to.equal('HASHPASSWORD');
        done();
      });
    });

  });

  describe('@private @method _send', function() {

    it('should add the method+cb to stack and write command', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      let write = sinon.stub(tor.socket, 'write');
      tor._send('COMMAND [flags] arg1=val1,arg2=val2').then(function() {
        expect(write.calledWithMatch('COMMAND [flags] arg1=val1,arg2=val2'))
          .to.equal(true);
        done();
      });
      tor._stack.pop().callback();
    });

    it('should default callback to reject on err', function(done) {
      let sock = new stream.Duplex({ read: () => null, write: () => null });
      let tor = new TorControl(sock, { authOnConnect: false });
      sinon.stub(tor.socket, 'write');
      tor._send('COMMAND [flags] arg1=val1,arg2=val2').catch(err => {
        expect(err.message).to.equal('Failed');
        done();
      });
      tor._stack.pop().callback(new Error('Failed'));
    });

  });

  const methodAliases = [
    ['authenticate', 'AUTHENTICATE'],
    ['getAuthChallenge', 'AUTHCHALLENGE'],
    ['getProtocolInfo', 'PROTOCOLINFO'],
    ['createHiddenService', 'ADD_ONION'],
    ['destroyHiddenService', 'DEL_ONION'],
    ['setConfig', 'SETCONF'],
    ['resetConfig', 'RESETCONF'],
    ['getConfig', 'GETCONF'],
    ['saveConfig', 'SAVECONF'],
    ['signal', 'SIGNAL'],
    ['createAddressMapping', 'MAPADDRESS'],
    ['createCircuit', 'EXTENDCIRCUIT'],
    ['extendCircuit', 'EXTENDCIRCUIT'],
    ['setCircuitPurpose', 'SETCIRCUITPURPOSE'],
    ['attachStream', 'ATTACHSTREAM'],
    ['postDescriptor', 'POSTDESCRIPTOR'],
    ['redirectStream', 'REDIRECTSTREAM'],
    ['closeStream', 'CLOSESTREAM'],
    ['closeCicuit', 'CLOSECIRCUIT'],
    ['quit', 'QUIT'],
    ['resolve', 'RESOLVE'],
    ['loadConfig', 'LOADCONF'],
    ['takeOwnership', 'TAKEOWNERSHIP'],
    ['dropGuards', 'DROPGUARDS'],
    ['fetchHiddenServiceDescriptor', 'HSFETCH'],
    ['postHiddenServiceDescriptor', 'HSPOST'],
    ['getInfo', 'GETINFO'],
    ['addEventListeners', 'SETEVENTS'],
    ['removeEventListeners', 'SETEVENTS']
  ];

  methodAliases.forEach(([alias, command]) => {
    describe(`@method ${alias}`, function() {

      it('should call _send with the proper command', function(done) {
        let commandFunc = sinon.stub().returns('');
        let { TorControl } = proxyquire('../lib/control', {
          './commands': { 
            ControlCommand: {
              [command]: commandFunc,
              RESETCONF: commandFunc
            }
          }
        });
        let sock = new stream.Duplex({ read: () => null, write: () => null });
        let tor = new TorControl(sock, { authOnConnect: false });
        let _send = sinon.stub(tor, '_send').callsFake(function() {
          return Promise.resolve();
        });

        let numArgs = tor[alias].length;
        let args = [];
        while (args.length !== numArgs) {
          args.push('');
        }

        tor[alias](...args).then(function() {
          expect(commandFunc.called).to.equal(true);
          expect(_send.called).to.equal(true);
          done();
        }, done);

      });

    });
  });

  const signalAliases = [
    ['reloadConfig', 'RELOAD'],
    ['shutdown', 'SHUTDOWN'],
    ['dumpStats', 'DUMP'],
    ['enableDebug', 'DEBUG'],
    ['halt', 'HALT'],
    ['clearDnsCache', 'CLEARDNSCACHE'],
    ['cleanCircuits', 'NEWNYM'],
    ['dumpHeartbeat', 'HEARTBEAT']
  ];

  signalAliases.forEach(([alias, signal]) => {
    describe(`@method ${alias}`, function() {

      it('should call signal with the correct name', function(done) {
        let sock = new stream.Duplex({ read: () => null, write: () => null });
        let tor = new TorControl(sock, { authOnConnect: false });
        let sig = sinon.stub(tor, 'signal').callsFake(function() {
          return Promise.resolve();
        });
        tor[alias]().then(() => {
          expect(sig.calledWithMatch(signal)).to.equal(true);
          done();
        });
      });

    });
  });

});
