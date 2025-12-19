const WebSocket = require("ws");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });
const ADM_USERS = ["Speed_adm_god"];
let players = {};

// CRIA TABELA AUTOMATICAMENTE
pool.query(`
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT,
  player JSONB
)`);

wss.on("connection", ws => {
  let id = Math.random().toString(36).slice(2);
  let username = null;

  ws.on("message", async msg => {
    const d = JSON.parse(msg);

    // REGISTRAR
    if (d.type === "register") {
      const hash = bcrypt.hashSync(d.pass, 8);
      const player = {
        x:100,y:100,
        hp:100,maxHp:100,
        atk:10,spd:2,
        level:1,exp:0,gold:0,
        class:"Void Blade",
        inv:[],
        admin:ADM_USERS.includes(d.user)
      };

      await pool.query(
        "INSERT INTO users VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [d.user, hash, player]
      );

      ws.send(JSON.stringify({ ok: true }));
    }

    // LOGIN
    if (d.type === "login") {
      const r = await pool.query(
        "SELECT * FROM users WHERE username=$1",
        [d.user]
      );
      if (!r.rows[0]) return;

      if (!bcrypt.compareSync(d.pass, r.rows[0].password)) return;

      username = d.user;
      players[id] = r.rows[0].player;

      ws.send(JSON.stringify({
        init:true,
        id,
        players
      }));
    }

    // UPDATE
    if (d.type === "update" && username) {
      players[id] = d.player;

      await pool.query(
        "UPDATE users SET player=$1 WHERE username=$2",
        [d.player, username]
      );

      broadcast();
    }
  });

  ws.on("close", () => {
    delete players[id];
    broadcast();
  });

  function broadcast() {
    const pkt = JSON.stringify({ sync:true, players });
    wss.clients.forEach(c =>
      c.readyState === 1 && c.send(pkt)
    );
  }
});

console.log("Servidor RPG com banco REAL (Postgres)");
