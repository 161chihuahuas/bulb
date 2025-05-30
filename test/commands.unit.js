'use strict';

const { ControlCommand } = require('../lib/commands');
const { expect } = require('chai');


describe('@module:granax/ControlCommand', function() {

  describe('AUTHENTICATE', function() {

    it('should return auth message with token', function() {
      expect(ControlCommand.AUTHENTICATE('token').toString()).to.equal(
        'AUTHENTICATE token'
      );
    });

  });

  describe('AUTHCHALLENGE', function() {

    it('should return auth challenge message', function() {
      expect(ControlCommand.AUTHCHALLENGE('nonce').toString()).to.equal(
        'AUTHCHALLENGE SAFECOOKIE nonce'
      );
    });

  });

  describe('PROTOCOLINFO', function() {

    it('should return protocol info message', function() {
      expect(ControlCommand.PROTOCOLINFO().toString()).to.equal('PROTOCOLINFO');
    });

  });

  describe('ADD_ONION', function() {

    it('should return add onion message with basic auth', function() {
      expect(ControlCommand.ADD_ONION([{target: '127.0.0.1:8080'}], {
        clientName: 'user',
        clientBlob: 'pass',
        basicAuth: true
      }).toString()).to.equal(
        'ADD_ONION NEW:BEST Flags=BasicAuth Port=80,127.0.0.1:8080 ' +
          'ClientAuth=user:pass'
      );
    });

    it('should return add onion message', function() {
      expect(ControlCommand.ADD_ONION([{target: '127.0.0.1:8080'}]).toString()).to.equal(
        'ADD_ONION NEW:BEST Port=80,127.0.0.1:8080'
      );
    });

    it('should return add onion message with multiple ports', function() {
      const ports = [
        {target: '127.0.0.1:8080'},
        {virtualPort: 8070, target: '127.0.0.1:8090'}
      ];
      expect(ControlCommand.ADD_ONION(ports).toString()).to.equal(
        'ADD_ONION NEW:BEST Port=80,127.0.0.1:8080 Port=8070,127.0.0.1:8090'
      );
    });

    it('should return add onion message with given single port', function() {
      expect(ControlCommand.ADD_ONION([{virtualPort: 8080}]).toString()).to.equal(
        'ADD_ONION NEW:BEST Port=8080'
      );
    });

    it('should return add onion message with default port', function() {
      expect(ControlCommand.ADD_ONION([]).toString()).to.equal(
        'ADD_ONION NEW:BEST Port=80'
      );
    });

    describe('ports as string and virtualport in options', function() {

      it('should return add onion message', function() {
        expect(ControlCommand.ADD_ONION('127.0.0.1:8080').toString()).to.equal(
          'ADD_ONION NEW:BEST Port=80,127.0.0.1:8080'
        );
      });

      it('should return add onion message with correct vport', function() {
        expect(ControlCommand.ADD_ONION('127.0.0.1:8080',{
          virtualPort: 8080
        }).toString()).to.equal(
          'ADD_ONION NEW:BEST Port=8080,127.0.0.1:8080'
        );
      });

    })

  });

  describe('DEL_ONION', function() {

    it('should return del onion message', function() {
      expect(ControlCommand.DEL_ONION('serviceid').toString()).to.equal(
        'DEL_ONION serviceid'
      );
    });

  });

  describe('SETCONF', function() {

    it('should return set config message', function() {
      expect(ControlCommand.SETCONF('key', 'value').toString()).to.equal(
        'SETCONF key="value"'
      );
    });

  });

  describe('RESETCONF', function() {

    it('should return reset config message', function() {
      expect(ControlCommand.RESETCONF('key').toString()).to.equal('RESETCONF key');
    });

  });

  describe('GETCONF', function() {

    it('should return get config message', function() {
      expect(ControlCommand.GETCONF('key').toString()).to.equal('GETCONF key');
    });

  });

  describe('SAVECONF', function() {

    it('should return save config message', function() {
      expect(ControlCommand.SAVECONF().toString()).to.equal('SAVECONF');
    });

  });

  describe('SIGNAL', function() {

    it('should return signal message', function() {
      expect(ControlCommand.SIGNAL('signal').toString()).to.equal('SIGNAL signal');
    });

  });

  describe('MAPADDRESS', function() {

    it('should return map address message', function() {
      expect(ControlCommand.MAPADDRESS('target.tld', 'replace.tld').toString()).to.equal(
        'MAPADDRESS target.tld=replace.tld'
      );
    });

  });

  describe('EXTENDCIRCUIT', function() {

    it('should return extend circuit with purpose', function() {
      expect(ControlCommand.EXTENDCIRCUIT('circuitid', 'general').toString()).to.equal(
        'EXTENDCIRCUIT circuitid purpose="general"'
      );
    });

    it('should return extend circuit', function() {
      expect(ControlCommand.EXTENDCIRCUIT('circuitid').toString()).to.equal(
        'EXTENDCIRCUIT circuitid'
      );
    });

  });

  describe('SETCIRCUITPURPOSE', function() {

    it('should return set circuit purpose message', function() {
      expect(ControlCommand.SETCIRCUITPURPOSE('circuitid', 'general').toString()).to.equal(
        'SETCIRCUITPURPOSE circuitid purpose="general"'
      );
    });

  });

  describe('ATTACHSTREAM', function() {

    it('should return attach stream message with hop', function() {
      expect(ControlCommand.ATTACHSTREAM('streamid', {
        circuitId: 'circuitid',
        hopNumber: 2
      }).toString()).to.equal(
        'ATTACHSTREAM streamid circuitid HOP=2'
      );
    });

    it('should return attach stream message', function() {
      expect(ControlCommand.ATTACHSTREAM('streamid', { circuitId: 0 }).toString()).to.equal(
        'ATTACHSTREAM streamid 0'
      );
    });

  });

  describe('POSTDESCRIPTOR', function() {

    it('should return post descriptor message with cache', function() {
      expect(ControlCommand.POSTDESCRIPTOR({
        key: 'value',
        beep: 'boop'
      }).toString()).to.equal(
        '+POSTDESCRIPTOR purpose=general cache=yes\r\n' +
          'key=value\r\nbeep=boop\r\n.'
      );
    });

    it('should return post descriptor message without cache', function() {
      expect(ControlCommand.POSTDESCRIPTOR({
        key: 'value',
        beep: 'boop'
      }, { cache: false, purpose: 'controller' }).toString()).to.equal(
        '+POSTDESCRIPTOR purpose=controller cache=no\r\n' +
          'key=value\r\nbeep=boop\r\n.'
      );
    });

  });

  describe('REDIRECTSTREAM', function() {

    it('should return redirect stream message', function() {
      expect(ControlCommand.REDIRECTSTREAM('streamid', '127.0.0.1', 8080).toString()).to.equal(
        'REDIRECTSTREAM streamid 127.0.0.1 8080'
      );
    });

  });

  describe('CLOSESTREAM', function() {

    it('should return close stream message', function() {
      expect(ControlCommand.CLOSESTREAM('streamid').toString()).to.equal(
        'CLOSESTREAM streamid 1'
      );
    });

  });

  describe('CLOSECIRCUIT', function() {

    it('should return close circuit message if unused', function() {
      expect(ControlCommand.CLOSECIRCUIT('circuitid', { ifUnused: true }).toString()).to.equal(
        'CLOSECIRCUIT circuitid IfUnused'
      );
    });

    it('should return close circuit message', function() {
      expect(ControlCommand.CLOSECIRCUIT('circuitid').toString()).to.equal(
        'CLOSECIRCUIT circuitid'
      );
    });

  });

  describe('QUIT', function() {

    it('should return quit message', function() {
      expect(ControlCommand.QUIT().toString()).to.equal('QUIT');
    });

  });

  describe('RESOLVE', function() {

    it('should return resolve message', function() {
      expect(ControlCommand.RESOLVE('some.host.name').toString()).to.equal(
        'RESOLVE some.host.name'
      );
    });

    it('should return reverse resolve message', function() {
      expect(ControlCommand.RESOLVE('some.host.name', true).toString()).to.equal(
        'RESOLVE mode=reverse some.host.name'
      );
    });

  });

  describe('LOADCONF', function() {

    it('should return load config message', function() {
      expect(ControlCommand.LOADCONF('my config text file').toString()).to.equal(
        '+LOADCONF\r\nmy config text file\r\n.'
      );
    });

  });

  describe('TAKEOWNERSHIP', function() {

    it('should return take ownership message', function() {
      expect(ControlCommand.TAKEOWNERSHIP().toString()).to.equal('TAKEOWNERSHIP');
    });

  });

  describe('DROPGUARDS', function() {

    it('should return drop guards message', function() {
      expect(ControlCommand.DROPGUARDS().toString()).to.equal('DROPGUARDS');
    });

  });

  describe('HSFETCH', function() {

    it('should return hidden service fetch message', function() {
      expect(ControlCommand.HSFETCH('onionurl').toString()).to.equal('HSFETCH onionurl');
    });

    it('should return hidden service fetch message with server', function() {
      expect(ControlCommand.HSFETCH('onionurl', 'servername').toString()).to.equal(
        'HSFETCH onionurl SERVER=servername'
      );
    });

  });

  describe('HSPOST', function() {

    it('should return hidden service post message', function() {
      expect(ControlCommand.HSPOST('my descriptor').toString()).to.equal(
        '+HSPOST\r\nmy descriptor\r\n.'
      );
    });

    it('should return hidden service post message with server', function() {
      expect(ControlCommand.HSPOST('my descriptor', 'servername').toString()).to.equal(
        '+HSPOST\r\nSERVER=servername\r\nmy descriptor\r\n.'
      );
    });

  });

  describe('GETINFO', function() {

    it('should return get info message', function() {
      expect(ControlCommand.GETINFO('keyword').toString()).to.equal('GETINFO keyword');
    });

  });

  describe('SETEVENTS', function() {

    it('should return set events message', function() {
      expect(ControlCommand.SETEVENTS(['DEBUG', 'ADDRMAP', 'TEST']).toString()).to.equal(
        'SETEVENTS DEBUG ADDRMAP TEST'
      );
    });

  });

});
