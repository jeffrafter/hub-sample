/*globals exports */

var sys = require("sys");
   
exports.sendKeys = function(connection, packs) {
  connection.send('\u0000' + JSON.stringify(packs.ids) + '\uffff');
} ;

exports.handleData = function(client, data, params) {
  var connection = client.socket,
      packs = params.packs,
      request;
  if (data === "PING") {
    sys.puts("ping'd");
  } else if (data === "READY") {
    exports.sendKeys(connection, packs);
    
  } else if (data.length === 64) { // data is a key, the client must want a pack
    sys.puts("Got Key: "+data+" - Sending pack down.") ;
    connection.send('\u0000' + data +":"+ packs.byId[data] + '\uffff') ;
    
  } else if (data.indexOf(":[") === 64) { // we have been sent a pack to send up
    var pk = data.substr(0,64),
        json = data.substr(65) ;
        
    sys.puts("Got Pack "+pk+", sending to everyone else & server for saving") ;
    
    client.broadcastEveryoneElse(data) ;
    
    if (!packs.byId[pk]) {
      packs.byId[pk] = json ;
      packs.ids.push(pk) ;
    }
    
  } else { // data should be a pack to store
    sys.puts("Did not match data: "+data.length) ;
    sys.puts(sys.inspect(data)) ;
    // var pk = data
    // var request = google.post("/packs/?pk="+pk, headers);
  }
  
} ;