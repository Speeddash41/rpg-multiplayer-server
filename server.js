const WebSocket = require("ws");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

let players = {};
let users = fs.existsSync("users.json")
  ? JSON.parse(fs.readFileSync("users.json"))
  : {};

function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

wss.on("connection", ws => {
  let user = null;

  ws.on("message", msg => {
    const data = JSON.parse(msg);

    // REGISTRO
    if (data.type === "register") {
      if (users[data.user]) {
        ws.send(JSON.stringify({ error: "Usuário já existe" }));
        return;
      }

      users[data.user] = {
        pass: bcrypt.hashSync(data.pass, 8),
        player: {
          x: 400, y: 300, level: 1, xp: 0,
          room: "lobby", cls: "rogue"
        }
      };

      saveUsers();
      ws.send(JSON.stringify({ ok: "Conta criada" }));
    }

    // LOGIN
    if (data.type === "login") {
      const u = users[data.user];
      if (!u || !bcrypt.compareSync(data.pass, u.pass)) {
        ws.send(JSON.stringify({ error: "Login inválido" }));
        return;
      }

      user = data.user;
      players[user] = u.player;
      ws.send(JSON.stringify({ ok: "Logado", player: u.player }));
    }

    // GAME DATA
    if (data.type === "update" && user) {
      players[user] = data.player;
      users[user].player = data.player;
      saveUsers();
    }
  });

  ws.on("close", () => {
    if (user) delete players[user];
  });

  // broadcast
  setInterval(() => {
    const state = JSON.stringify(players);
    wss.clients.forEach(c => {
      if (c.readyState === 1) c.send(state);
    });
  }, 50);
});
