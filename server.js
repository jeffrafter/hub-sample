/*

 Copyright (c) 2009 Alexander Teinum

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.

*/

var net = require('net'),
    sys = require('sys'),
    nextId = 1,
    puts = sys.puts;

clients = {
  ids: [],
  byId: {}
};

packs = {
  ids: [],
  byId: {}
};

function Client(uid, socket) {
  this.uid = uid;
  this.socket = socket;
  this.doneHandshake = false;
  this.resource = null;
}

Client.prototype.close = function() {
  clients.ids.splice(clients.ids.indexOf(this.uid), 1);
  delete clients.byId[this.uid]
  this.socket.close();
};

Client.prototype.doneHandShake = function() {
  this.doneHandshake = true;
  clients.ids.push(this.uid);
}

Client.prototype.sendMessage = function(msg) {
  puts("sending message to client "+this.uid) ; // puts(msg) ;
  this.socket.send('\u0000' + msg + '\uffff') ;
}

Client.prototype.broadcastEveryoneElse = function (msg) {
  var len = clients.ids.length ;
  puts("Broadcasting to "+len+" clients from "+this.uid) ;
  for (var j = 0; j < len; j++) {
    var client = clients.byId[clients.ids[j]] ;
    if (client.uid === this.uid) continue ;
    client.sendMessage(msg) ;
  }
};

var server = net.createServer(function(connection) {
//    if (connection.remoteAddress !== '127.0.0.1') {
//        sys.puts('Connection from ' + connection.remoteAddress +
//            ' not accepted. Only local connections are currently supported.') ;
//        connection.close() ;
//    }

    var client = new Client(nextId++, connection) ;
    clients.byId[client.uid] = client ;
    var _doneHandshake = false ;
    var _params = {
      clients: clients,
      packs: packs
    } ;

    connection.setEncoding('utf8');
    connection.setTimeout(240000);

    connection.addListener("eof", function () {
      try {
        client.close();
      } catch (e) {
        puts("uncaught exception!");
      }
    });

    connection.addListener("timeout", function () {
      try {
        client.close();
      } catch (e) {
        puts("uncaught exception!");
      }
    });

    connection.addListener('receive', function(data) {
        function notAccepted(why) {
            sys.puts('Handshake with ' + connection.remoteAddress +
                ' not accepted. ' + why);
            connection.close();
        }

        function notSupported(why) {
            sys.puts('Handshake with ' + connection.remoteAddress +
                ' has problems. ' + why);
        }

        // Call the first time anything is recieved. Verify handshake from the
        // client and send handshake back if accepted.

        function doHandshake() {
            /*

            These are the lines that are sent as a handshake from the client.
            Chromium sends two blank lines that might be a part of the
            specification.

            0: GET /echo HTTP/1.1
            1: Upgrade: WebSocket
            2: Connection: Upgrade
            3: Host: localhost:8000
            4: Origin: file://
            5:
            6:

            */

            var lines = data.split('\r\n');

            // Line 0

            var request = lines[0].split(' ');

            if (((request[0] === 'GET') && (request[2] === 'HTTP/1.1'))
                !== true) {
                notAccepted('Request not valid.');
                return;
            }

            var resource = request[1];

            if (resource[0] !== '/') {
                notAccepted('Request resource not valid.');
                return;
            }

            // Line 1-6

            // Inspired by pywebsocket. If the value is set to anything other
            // than '' here, then it has to be set to the same value by the
            // client.

            var headers = {
                'Upgrade': 'WebSocket',
                'Connection': 'Upgrade',
                'Host': '',
                'Origin': '',
                'Cookie': ''
            }

            for (i = 1; i < lines.length; i++) {

                // We should 'continue' if it's acceptable with blank lines
                // between headers.

                if (lines[i] === '')
                    break;

                // Split the header line into a key and a value. Check against
                // the headers hash. Warn the user if the header isn't
                // supported.

                var line = lines[i].split(': ');

                var headerValue = headers[line[0]];

                if (headerValue === undefined) {
                    notSupported('Header \'' + line[0] + '\' not supported.');
                    continue;
                }
                else if ((headerValue !== '') && (line[1] !== headerValue)) {
                    notAccepted('Header \'' + line[0] + '\' is not \'' +
                        headerValue + '\'.');
                    return;
                }
                else {
                  headers[line[0]] = line[1];
                }
            }

            // Import requested resource

            try {
                client.resource = require('./resources' + resource);
            } catch (e) {
                sys.puts(headers['Host'] + ' tries to connect to resource \'' +
                    resource + '\', but the resource does not exist.');
                connection.close();
                return;
            }

            // Send handshake back

            connection.send('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
                'Upgrade: WebSocket\r\n' +
                'Connection: Upgrade\r\n' +
                'WebSocket-Origin: ' + headers['Origin'] + '\r\n' +
                'WebSocket-Location: ws://' + headers['Host'] + resource +
                    '\r\n' +
                '\r\n');

            _doneHandshake = true;
            client.doneHandShake();

            return;
        }

        if (!_doneHandshake)
            doHandshake();
        else {
          // TODO: split message on '\ufffd', as there may be more than one message in this data.
          var messages = data.split("\ufffd"),
              l = messages.length;
          for(var i=0; i<l; i++) {
            var msg = messages[i] ;
            if(msg.length <= 1) continue ;
            msg = msg+"\ufffd" ;
            
            if (msg[0] !== '\u0000' && msg[msg.length - 1] !== '\ufffd') {
                sys.puts('Invalid message format from client. ' +
                    'Closing connection.');
                connection.close();
                return;
            }
            client.resource.handleData(client, msg.substr(1, msg.length - 2), _params);
          }
          
        }
    });
}).listen(8000);

setInterval( function() {
  var i = clients.ids.length;
  while(i--) {
    var uid = clients.ids[i];
    var client = clients.byId[uid];
    if (client.doneHandshake) {
      client.resource.sendKeys(client.socket, packs);
    }
  }
}, 5000);
