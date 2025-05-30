'use strict';

const { expect } = require('chai');
const { TorContext } = require('..');


describe('@class TorContext', function() {

  this.timeout(120000); // Depending on where this is running it could take a while to bootstrap

  it('create a context, server, proxy, socket, and makes a round trip', function() {
    return new Promise(async (resolve, reject) => {
      const tor = await TorContext.create();
      const server = tor.createServer(echoAndClose); 

      function echoAndClose(socket) {
        socket.once('data', (data) => {
          socket.end(data);
        });
      } 

      const address = await server.listen();
      const socket = tor.createConnection();

      await socket.connect(address);

      socket.once('data', data => {
        expect(data.toString()).to.equal('hello');
        resolve();
      });

      socket.write('hello');
    });
  });

});
