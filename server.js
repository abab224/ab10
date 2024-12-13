// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let players = [];
let gameState = {
    round: 0,
    emperorCard: null,
    slaveCard: null,
    results: [],
    waitingForOpponent: false
};

const cardStrength = {
    emperor: { citizen: 'win', slave: 'lose' },
    citizen: { slave: 'win', emperor: 'lose', citizen: 'draw' },
    slave: { emperor: 'win', citizen: 'lose' }
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('login', (username, password) => {
        if (!username || !/^$/.test(password)) {
            socket.emit('loginError', 'ユーザー名またはパスワード形式が無効です。');
            return;
        }

        if (players.length < 2) {
            players.push({ id: socket.id, username, password, role: null, cards: [] });
            console.log(`${username} logged in`);

            if (players.length === 2) {
                assignRolesAndStartGame();
            } else {
                socket.emit('waiting', 'もう1人のプレイヤーを待っています...');
            }
        } else {
            socket.emit('loginError', 'ゲームがすでに満員です。');
        }
    });

    socket.on('playCard', (card) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        if (gameState.waitingForOpponent) {
            if (player.role === 'emperor') {
                gameState.emperorCard = card;
            } else if (player.role === 'slave') {
                gameState.slaveCard = card;
            }

            evaluateTurn();
        } else {
            if (player.role === 'emperor') {
                gameState.emperorCard = card;
            } else if (player.role === 'slave') {
                gameState.slaveCard = card;
            }

            gameState.waitingForOpponent = true;
            socket.emit('waitForOpponent', '相手の行動を待っています...');
        }
    });

    socket.on('restartGame', (keepRoles) => {
        assignRolesAndStartGame(keepRoles);
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        console.log(`User disconnected: ${socket.id}`);
    });
});

function assignRolesAndStartGame(keepRoles = false) {
    if (!keepRoles) {
        const shuffledRoles = ['emperor', 'slave'].sort(() => Math.random() - 0.5);

        players = players.map((player, index) => ({
            ...player,
            role: shuffledRoles[index],
            cards: shuffledRoles[index] === 'emperor'
                ? ['emperor', 'citizen', 'citizen', 'citizen', 'citizen']
                : ['slave', 'citizen', 'citizen', 'citizen', 'citizen']
        }));
    } else {
        players = players.map(player => ({
            ...player,
            cards: player.role === 'emperor'
                ? ['emperor', 'citizen', 'citizen', 'citizen', 'citizen']
                : ['slave', 'citizen', 'citizen', 'citizen', 'citizen']
        }));
    }

    io.emit('startGame', players);
    resetGameState();
}

function evaluateTurn() {
    const emperorCard = gameState.emperorCard;
    const slaveCard = gameState.slaveCard;

    if (!emperorCard || !slaveCard) return;

    let result;
    if (emperorCard === 'citizen' && slaveCard === 'citizen') {
        result = 'draw';

        players.forEach(player => {
            const cardIndex = player.cards.indexOf('citizen');
            if (cardIndex !== -1) {
                player.cards.splice(cardIndex, 1);
            }
        });

        io.emit('turnResult', { result: 'draw', remainingCards: getRemainingCards() });
    } else {
        result = cardStrength[emperorCard][slaveCard];

        if (result === 'win') {
            io.emit('gameOver', { winner: '皇帝側の勝利！' });
        } else {
            io.emit('gameOver', { winner: '奴隷側の勝利！' });
        }
        resetGame();
        return;
    }

    resetTurn();
}

function resetTurn() {
    gameState.emperorCard = null;
    gameState.slaveCard = null;
    gameState.waitingForOpponent = false;
}

function getRemainingCards() {
    return players.map(player => ({
        id: player.id,
        cards: player.cards
    }));
}

function resetGame() {
    gameState = {
        round: 0,
        emperorCard: null,
        slaveCard: null,
        results: [],
        waitingForOpponent: false
    };
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

