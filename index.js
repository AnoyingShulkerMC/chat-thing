var app = require('express')();
var http_svr = require('http').Server(app);
var https = require("https")
var io = require('socket.io')(http_svr);
var WebSocket = require("ws")
var fs = require("fs")
var port = process.env.PORT || 3000;
var resumable = true;
var resuming = false;
var continue_id = null
var token = "NzUwMTcxNjk5MzAzMTUzNzU5.X02p1g.LvAJS0J9mGKLPsobeftuRdC3-V8"
var typing = false;
var ponged = false;
var current = "759632453446139904"
var guild = "728718708079460424"
var session_id = null;
const serverPrefix = "/"
const discordPrefix = ":"
// TODO: add comments.
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

function connect(){
  console.log("Attempting to connect")
  var con = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json");
  var i;
  con.on("open", () => {
    
  })
  con.on("close", () => {
    io.emit("chat message","Closed. resuming")
    if(resumable) {
      resuming = true
    }
    resumable = true
    clearInterval(i)
    setTimeout(connect, 5000)
  })
  function conhandler(d){
    var msg = JSON.parse(d)
    if(msg.code) {
      io.emit("chat message", "Ohno: Error code: " + msg.code + " Information: " + msg.message)
    }
    switch(msg.op){
      case 10:
        i = setInterval(() => {
         
          con.send(JSON.stringify({op:1, d:continue_id}));
          io.emit("chat message", "Ping")
          setTimeout(() => {
              if (!ponged) { con.close(); console.log("Heartbeat timed out"); if (resumable) resuming = true;}
            
            ponged = false;
          }, 5000)
        },msg.d.heartbeat_interval)
        if (resuming) {
          resuming = false;
          con.send(JSON.stringify({
            op: 6,
            d: {
              token: token,
              session_id: session_id,
              seq: continue_id
            }
          }))
        } else {
          
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
        }
        
        
      case 11:
        ponged = true;
      case 9:
        resumable = msg.d
      case 0:
        continue_id = msg.s
        if(msg.t == "MESSAGE_CREATE"){
          io.emit("chat message", `MsgID: ${msg.d.id} | ${msg.d.author.username}#${msg.d.author.discriminator}>` + msg.d.content)
          if (msg.d.content.substring(0, serverPrefix.length) == discordPrefix) {
            var args = msg.d.content.substring(1).split(' ')
            var cmd = args[0]
            args = args.splice(1)
            switch (cmd) {
              case "archive":
                console.log("archiving")
                var options = {
                  hostname: 'discord.com',
                  port: 443,
                  path: '/api/channels/'+msg.d.channel_id+'/messages',
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bot ' + token,
                    'User-Agent': "DiscordBot (discord.js, v12)"
                  }
                }
                var req = https.request(options, res => { })
                req.write(JSON.stringify({ content: "Moving channel to the archives" }))
                req.end()
                var options = {
                  hostname: 'discord.com',
                  port: 443,
                  path: '/api/channels/750194381516177529',
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bot ' + token,
                    'User-Agent': "DiscordBot (discord.js, v12)"
                  }
                }
                var req = https.request(options, res => {
                  
                  var data = ""
                  res.on("data", (d) => {
                    data += d.toString()
                  })
                  res.on("end", () => {
                    var channelObj = JSON.parse(data)
                    var options = {
                      hostname: 'discord.com',
                      port: 443,
                      path: '/api/channels/' + msg.d.channel_id,
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bot ' + token,
                        'User-Agent': "DiscordBot (discord.js, v12)",
                        'X-Audit-Log-Reason': "Archived by " + msg.d.author.username 
                      }
                    }// put the specified channel in archive channel and sync perms
                    var req = https.request(options, res => { })
                    req.write(JSON.stringify({ parent_id: "750194381516177529",permission_overwrites: channelObj.permission_overwrites }))
                    req.end()
                  })

                })
                
            }
            req.end()
          }
        } if(msg.t == "READY"){
          session_id = msg.d.session_id
          /*var options = {
            host: "discord.com",
            path: "/api/guilds/728718708079460424/emojis",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bot " + token,
              'User-Agent': "DiscordBot (discord.js, v12)"
            }
          }
          var req = https.request(options, (res) => {res.on('data',(d) => console.log(d.toString())) })
          req.write(JSON.stringify({
            name: "alienboi",
            image: "data:image/gif;base64," + new Buffer(fs.readFileSync("alien.png").toString("base64")),
            roles: []
          }))
          req.end()*/
          con.send(JSON.stringify({
            op: 3,
            d: {
              since: null,
              game: { name: "#ReviveTheAuserCult movement", type: 0 },
              status: "dnd",
              afk:false
            }
          }))
          console.log("Ready")
        } if(msg.t == "RESUMED") {
          io.emit("chat message", "Resumed")
        }
    }
  }
  con.on("message", conhandler)
}
connect()
io.on('connection', function(socket){
  socket.on('not typing', () => {
    if(typing){
      console.log("not typing")
      typing = false;
      var options = {
        host: 'discord.com',
        path: '/api/channels/'+current+'/typing',
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
        path: '/api/channels/' + current +'/typing',
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
  socket.on('chat message', function (msg) {
    if (msg.substring(0, serverPrefix.length) == serverPrefix) {
      var args = msg.substring(1).split(' ')
      var cmd = args[0]
      args = args.splice(1)
      switch (cmd) {
        case 'nick':
          var options = {
            hostname: 'discord.com',
            port: 443,
            path: '/api/guilds/'+ guild +'/members/@me/nick',
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bot ' + token,
              'User-Agent': "DiscordBot (discord.js, v12)"
            }
          }
          var req = https.request(options, res => { })
          req.write(JSON.stringify({ nick: args.join(' ') }))
          req.end()
          io.emit("chat message", "Nickname changed to " + args.join(' '))
          return;
        case 'getemojis':

          var options = {
            hostname: 'discord.com',
            port: 443,
            path: '/api/guilds/' + guild + '/emojis',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bot ' + token,
              'User-Agent': "DiscordBot (discord.js, v12)"
            }
          }
          var req = https.request(options, res => {
            var resstr = ""
            var data = ""
            res.on("data", (d) => {
              data += d.toString()
            })
            res.on("end", () => {
              var msg = JSON.parse(data)
              msg.forEach(e => {
                resstr += e.name + ":" + e.id + "\n";
              })
              io.emit("chat message", resstr)
            })
          })
          req.end();
          return;
        case 'react':
          var options = {
            hostname: 'discord.com',
            port: 443,
            path: '/api/channels/' + current + '/messages/' + args[0] + '/reactions/' + encodeURIComponent(args[1]) + "/@me",
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bot ' + token,
              'User-Agent': "DiscordBot (discord.js, v12)"
            }
          }
          var req = https.request(options, res => { res.on("data", (d) => { console.log(d.toString())}) })
          req.write(JSON.stringify({ nick: args.join(' ') }))
          req.end()
          io.emit("chat message", "Added reaction")
          return;
      }
    }
    var options = {
      hostname: 'discord.com',
      port: 443,
      path: '/api/channels/759632453446139904/messages',
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
