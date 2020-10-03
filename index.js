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
var token = ""
var typing = false;
var ponged = false;
var current = "761790637825064960"
var guild = "728718708079460424"
const btoa = require("btoa")
const fetch = require("node-fetch")
var session_id = null;
const serverPrefix = "/"
const discordPrefix = ":"
const cfg = {
  id: '',
  secret: ''
};
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
function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
function isAscii(f) {
  var content = fs.readFileSync(f)
  for (var i = 0, len = content.length; i < len; i++) {
    if(content[i] > 127) return false
  }
  return true;
}
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
        case "attach":
          var boundary = makeid(10)
          if (!fs.existsSync(args[0])) return io.emit("chat message", "THe file doesn't exist!")
          var content1 = `--${boundary}\n` +
            `Content-Disposition: form-data; name="file"; filename="${args[0]}"\n` +
            `Content-Type: image/gif\n\n`
          // escape double quotes
          var jsonContent = JSON.stringify({
            content: args[1]
          })
          var content2 = `\n--${boundary}\n` +
            `Content-Disposition: form-data; name="payload_json"\n\n` +
            `${jsonContent}\n` +
            `--${boundary}--`
          var payload = Buffer.concat([
            new Buffer(content1, "utf-8"),
            new Buffer(fs.readFileSync(args[0]), isAscii(args[0]) ? "ascii" : "binary"),
            new Buffer(content2, "utf-8")
          ])
          var options = {
            hostname: 'discord.com',
            port: 443,
            path: '/api/channels/' + current + '/messages',
            method: 'POST',
            headers: {
              'Content-Type': 'multipart/form-data; boundary=' + boundary + "; charset=utf-8",
              'Authorization': 'Bot ' + token,
              'User-Agent': "DiscordBot (discord.js, v12)"
            }
          }
          var req = https.request(options, res => { res.on("data", (d) => { console.log(d.toString()) }) })
          req.write(payload)
          req.end()
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
        case 'switchchannel':
          current = args.join(' ')
          io.emit("chat message","switched channel")
          return;
      }
    }
    var options = {
      hostname: 'discord.com',
      port: 443,
      path: '/api/channels/' + current + '/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization':'Bot ' + token,
        'User-Agent': "DiscordBot (discord.js, v12)"
      }
    }
    var req= https.request(options, res => {})
    req.write(JSON.stringify({ content: msg.replace(/\\n/g, "\n")}))
    req.end()
  });
});
/////////////////////////////////////////////////
// End of bot console thing
////////////////////////////////////////////////
app.get('/secretwebpage', (req, res) => {
  console.log("request")
  res.redirect([
    'https://discord.com/oauth2/authorize',
    `?client_id=${cfg.id}`,
    '&scope=guilds.join+identify',
    '&response_type=code',
    `&redirect_uri=http://anoyingshulker.ddns.net/authorize`
  ].join(''));
});
function asyncWait(millisecond) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, millisecond)
  })
}
app.get('/authorize', (req, res) => {
  console.log("authorizing")
  const code = req.query.code;
  var cred = btoa(`${cfg.id}:${cfg.secret}`)
  fetch('https://discord.com/api/oauth2/token', {
    method: "POST",
    headers: {
      'Authorization': `Basic ${cred}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent("http://anoyingshulker.ddns.net/authorize")}&scope=guilds.join+identify`
  }).then(async response => {res.redirect(`/guilds?token=${JSON.parse(await response.text()).access_token}`) })
})
app.get('/guilds', (req, res) => {
  res.send("checc your serverz")
  fetch('https://discord.com/api/users/@me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${req.query.token}`
    }
  }).then(async (response) => {
    //node-fetch gae
    var result = JSON.parse(await response.text())
    fetch(`https://discord.com/api/guilds/713917232580919376/members/${result.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bot ',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: req.query.token
      })
    })
  })
});
http_svr.listen(port, function(){
  console.log('listening on *:' + port);
});
