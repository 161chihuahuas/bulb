# granax *embeddable tor for node.js*

Granax is a complete client implementation of the [Tor Control Protocol](https://gitweb.torproject.org/torspec.git/plain/control-spec.txt). 
It is designed to allow developers simple integration of the privacy-preserving properties of the [Tor](https://torprojects.org) network into their applications. 


## usage

```
npm install @tacticalchihuahua/granax --save
```

> As part of the installation process, it will download the Tor Expert 
> Bundle and use the included Tor executable.


```js
import granax from '@tacticalchihuahua/granax';

async function demo() {
  const tor = await granax();

  // Start a hidden service that points to a local service
  await hiddenService = await tor.createHiddenService('127.0.0.1:8080');

    console.info(`Service URL: ${hiddenService.serviceId}.onion`);
    console.info(`Private Key: ${hiddenService.privateKey}`);
  });
});
```

### Using System Tor Package

Make sure that `ControlPort=9051` (or your preferred port) is set in your 
`torrc`, then you may open the control socket and issue commands:

```js
import { connect } = require('net');
import { TorController } = require('@tacticalchihuahua/granax');

function demo() {
  const tor = new TorController(connect(9051), options);
  
  // TorController is an EventEmitter
  tor.on('ready', () => {
    
  });
}
```

> Note that if using cookie authentication, the Node.js process must have the 
> appropriate privileges to read the cookie file. Usually, this means running 
> as the same user that is running Tor.

Further Tor documentation is linked in the next section. For a complete API 
reference, JSDoc generated documentation from source code comments is provided
here.

links
---------

* [Tor Control Specification](https://github.com/torproject/torspec/blob/main/control-spec.txt)
* [Tor Documentation](https://www.torproject.org/docs/documentation.html.en)

license
-------

> Granax - Complete client implementation of the Tor Control Protocol  
> Copyright (C) 2019 Lily Anne Hall

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.


