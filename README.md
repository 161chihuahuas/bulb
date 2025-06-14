# 🧅 bulb ~ *embedded tor for node.js*

Bulb is a complete client implementation of the [Tor Control Protocol](https://gitweb.torproject.org/torspec.git/plain/control-spec.txt). 
It is designed to allow developers simple integration of the privacy-preserving properties of the [Tor](https://torprojects.org) network into their applications. 
This library is focused on completeness of the protocol as well as simplicity and idiomatic interfaces for common use cases (see the ~8 LOC example hidden echo server).


## install

```
npm install @yipsec/bulb --save
```

> As part of the installation process, it will download the Tor Expert 
> Bundle and use the included Tor executable.

## usage

Complete documentation can be [found here](https://yipsec/bulb).

### example: hidden tcp echo server

```js
const { TorContext } = require('@yipsec/bulb');

const tor = await TorContext.create();
const server = tor.createServer((socket) => socket.pipe(socket)); 
const address = await server.listen(); // { host, port}
const client = tor.createConnection();

client.write('hello from bulb');
client.pipe(process.stdout); // hello from bulb

await client.connect(address);
```

## links

* [Tor Control Specification](https://github.com/torproject/torspec/blob/main/control-spec.txt)
* [Tor Documentation](https://www.torproject.org/docs/documentation.html.en)

## copying

> bulb - embedded tor for node.js  
> anti-copyright 2025, yipsec

Licensed under the GNU Lesser General Public License 3.0.

