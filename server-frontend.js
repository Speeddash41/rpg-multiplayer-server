const express = require("express");
const path = require("path");
const app = express();

// Serve arquivos estáticos da pasta rpg-game
app.use(express.static(path.join(__dirname, "rpg-game")));

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web rodando!");
});
