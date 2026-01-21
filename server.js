const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let players = [];
let sandAmount = 100;
let turnIndex = 0;
let isStarted = false;

io.on('connection', (socket) => {
    players.push({ id: socket.id, host: players.length === 0 });
    io.emit('playerUpdate', players);

    socket.on('startGame', () => {
        if (socket.id === players[0].id) {
            sandAmount = 100; turnIndex = 0; isStarted = true;
            io.emit('gameBegin', { sand: sandAmount, turn: players[turnIndex].id });
        }
    });

    socket.on('takeSand', (amount) => {
        if (!isStarted || socket.id !== players[turnIndex].id) return;
        sandAmount -= amount;
        const fallChance = (100 - sandAmount) / 100;
        if (Math.random() < fallChance || sandAmount <= 0) {
            io.emit('gameOver', { loser: socket.id });
            isStarted = false;
        } else {
            turnIndex = (turnIndex + 1) % players.length;
            io.emit('updateState', { sand: sandAmount, nextTurn: players[turnIndex].id });
        }
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        if (players.length > 0) players[0].host = true;
        io.emit('playerUpdate', players);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server running!'));
