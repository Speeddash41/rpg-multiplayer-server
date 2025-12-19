const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const players = {};

wss.on("connection", ws => {
  const id = Math.random().toString(36).slice(2);

  players[id] = {
    x: 400,
    y: 300,
    hp: 100,
    level: 1
  };

  ws.on("message", msg => {
    try {
      players[id] = JSON.parse(msg);
    } catch {}
  });

  ws.on("close", () => {
    delete players[id];
  });

  const loop = setInterval(() => {
    ws.send(JSON.stringify(players));
  }, 50);

  ws.on("close", () => clearInterval(loop));
});

console.log("Servidor multiplayer ativo");
