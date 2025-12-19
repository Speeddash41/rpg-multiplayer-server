const WebSocket = require("ws");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

const ADM_USERS = ["Speed_adm_god"];

let users = fs.existsSync("users.json")
  ? JSON.parse(fs.readFileSync("users.json"))
  : {};

let players = {};
let monsters = {
  1:{x:300,y:300,hp:60,exp:50,gold:20},
  2:{x:500,y:200,hp:80,exp:70,gold:30}
};

function saveUsers(){
  fs.writeFileSync("users.json", JSON.stringify(users,null,2));
}

wss.on("connection", ws=>{
  let id = Math.random().toString(36).substr(2,9);
  let username = null;

  ws.on("message", msg=>{
    let data = JSON.parse(msg);

    if(data.type==="register"){
      if(users[data.user]) return;
      users[data.user]={
        pass:bcrypt.hashSync(data.pass,8),
        player:{
          x:100,y:100,
          hp:100,maxHp:100,
          atk:10,spd:2,
          level:1,exp:0,gold:0,
          class:"Void Blade",
          inv:[],
          admin:ADM_USERS.includes(data.user)
        }
      };
      saveUsers();
      ws.send(JSON.stringify({ok:true}));
    }

    if(data.type==="login"){
      let u=users[data.user];
      if(!u||!bcrypt.compareSync(data.pass,u.pass)) return;
      username=data.user;
      players[id]=u.player;
      ws.send(JSON.stringify({
        init:true,
        id,
        players,
        monsters
      }));
    }

    if(data.type==="update" && players[id]){
      players[id]=data.player;
      broadcast();
    }
  });

  ws.on("close",()=>{
    delete players[id];
    broadcast();
  });

  function broadcast(){
    let pkt=JSON.stringify({sync:true,players,monsters});
    wss.clients.forEach(c=>{
      if(c.readyState===1) c.send(pkt);
    });
  }
});

console.log("Servidor RPG ONLINE rodando");
