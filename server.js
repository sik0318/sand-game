const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let players = [];
let sandAmount = 100;
let turnIndex = 0;
let gameStarted = false;

io.on("connection", (socket) => {
  // 플레이어 입장
  const isHost = players.length === 0;
  players.push({ id: socket.id, host: isHost });
  io.emit("updatePlayers", { players, gameStarted });

  // 시작 버튼 클릭 (방장만)
  socket.on("startGame", () => {
    if (socket.id === players[0].id) {
      sandAmount = 100;
      turnIndex = 0;
      gameStarted = true;
      io.emit("gameStarted", { sandAmount, currentTurn: players[turnIndex].id });
    }
  });

  // 모래 가져오기
  socket.on("takeSand", (amount) => {
    if (players[turnIndex].id !== socket.id) return;

    sandAmount -= amount;
    // 나뭇가지 쓰러질 확률 계산 (모래가 적을수록 확률 대폭 상승)
    let fallProb = (110 - sandAmount) / 100; 
    let isFallen = Math.random() < fallProb;

    if (isFallen || sandAmount <= 0) {
      io.emit("gameOver", { loser: socket.id, finalSand: sandAmount });
      gameStarted = false;
      sandAmount = 100;
    } else {
      turnIndex = (turnIndex + 1) % players.length;
      io.emit("nextTurn", { sandAmount, currentTurn: players[turnIndex].id });
    }
  });

  // 퇴장 처리
  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    if (players.length > 0) players[0].host = true;
    io.emit("updatePlayers", { players, gameStarted });
  });
});

http.listen(3000, () => { console.log("Game server is running!"); });