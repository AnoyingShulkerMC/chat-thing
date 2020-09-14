var app = require('express')();
var http_svr = require('http').Server(app);
var https = require("https")
var io = require('socket.io')(http_svr);
var WebSocket = require("ws")
var port = process.env.PORT || 3000;
var resuming = false;
var continue_id = null
var token = "NzUwMTcxNjk5MzAzMTUzNzU5.X02p1g.ZE-KDF6LMdc1nPQ63OWGvaEKoUw"
var typing = false;
var session_id = null;
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var con = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json");
con.on("close", () => {
  io.emit("chat message","Closed. resuming")
  resuming = true
  con = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json");
})
con.on("message", d => {
  var msg = JSON.parse(d)
  
  switch(msg.op){
    case 10:
      setInterval(() => {
        con.send(JSON.stringify({op:1, d:continue_id}));
        io.emit("chat message", "Ping")
      },msg.d.heartbeat_interval)
      con.send(JSON.stringify({
        op:2,
        d: {
          token: token,
          properties: {
            $os: "Windows",
            $browser: "discord.js",
            $version: "v12"
          }
        }
      }))
      if (resuming) {
        resuming = false;
        con.send(JSON.stringify(
          op: 6,
          d: {
            token: token,
            session_id: session_id,
            seq: seq
          }
        ))
      }
    case 0:
      continue_id = msg.s
      if(msg.t == "MESSAGE_CREATE"){
        io.emit("chat message", `${msg.d.author.username}#${msg.d.author.discriminator}>` +msg.d.content)
      } if(msg.t == "READY"){
        session_id = msg.d.session_id
      } if(msg.t == "RESUMED") {
        io.emit("chat message", "Resumed")
      }
  }
})
io.on('connection', function(socket){
  socket.on('not typing', () => {
    if(typing){
      console.log("not typing")
      typing = false;
      var options = {
        host: 'discord.com',
        path: '/api/channels/752681015331520572/typing',
        method: 'POST',
        headers: {
          'Authorization': 'Bot ' + token,
          'User-Agent': 'DiscordBot (discord.js, v12)'
        }
      }
      var req = https.request(options, res => {})
      req.end()
    }
  })
  socket.on("typing", () => {
    if (!typing) {
      console.log("typing")
      typing = true;
      var options = {
        host: 'discord.com',
	      port: 443,
        path: '/api/channels/752681015331520572/typing',
        method: 'POST',
        headers: {
        'Authorization': 'Bot ' + token,
          'User-Agent': 'DiscordBot (discord.js, v12)'
        }
      }
      var req = https.request(options, res => {})
      req.end()
    }
  })
  socket.on('chat message', function(msg){
    var options = {
      hostname: 'discord.com',
      port: 443,
      path: '/api/channels/752681015331520572/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization':'Bot ' + token,
        'User-Agent': "DiscordBot (discord.js, v12)"
      }
    }
    var req= https.request(options, res => {})
    req.write(JSON.stringify({content: msg}))
    req.end()
  });
});

http_svr.listen(port, function(){
  console.log('listening on *:' + port);
});
