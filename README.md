# 🧅 granax ~ *embedded tor for node.js*

Granax is a complete client implementation of the [Tor Control Protocol](https://gitweb.torproject.org/torspec.git/plain/control-spec.txt). 
It is designed to allow developers simple integration of the privacy-preserving properties of the [Tor](https://torprojects.org) network into their applications. 
This library is focused on completeness of the protocol as well as simplicity and idiomatic interfaces for common use cases (see the ~8 LOC example hidden echo server).


## install

```
npm install @tacticalchihuahua/granax --save
```

> As part of the installation process, it will download the Tor Expert 
> Bundle and use the included Tor executable.

## usage

Complete documentation can be [found here](https://lilyanne.me/granax).

### example: hidden tcp echo server

```js
const { TorContext } = require('@tacticalchihuahua/granax');

const tor = await TorContext.create();
const server = tor.createServer((socket) => socket.pipe(socket)); 
const address = await server.listen(); // { host, port}
const client = tor.createConnection();

client.write('hello from granax');
client.pipe(process.stdout); // hello from granax

await client.connect(address);
```

## links

* [Tor Control Specification](https://github.com/torproject/torspec/blob/main/control-spec.txt)
* [Tor Documentation](https://www.torproject.org/docs/documentation.html.en)

## copying

> granax - embedded tor for node.js  
> anti-copyright 2025, tactical chihuahua

Licensed under the GNU Lesser General Public License 3.0.

