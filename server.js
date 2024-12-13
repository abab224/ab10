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
    waitingForOpponent: false,
    currentMatch: 1,
    nextMatchVotes: 0,
    restartVotes: 0
};

const cardStrength = {
    emperor: { citizen: 'win', slave: 'lose' },
    citizen: { slave: 'win', emperor: 'lose', citizen: 'draw' },
    slave: { emperor: 'win', citizen: 'lose' }
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('login', (username, password) => {
        if (!username || !/^\d{4}$/.test(password)) {
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

    socket.on('nextMatch', () => {
        gameState.nextMatchVotes++;
        if (gameState.nextMatchVotes === 2) {
            gameState.nextMatchVotes = 0; // 投票数をリセット
            startNextMatch();
        }
    });

    socket.on('restartGame', () => {
        gameState.restartVotes++;
        if (gameState.restartVotes === 2) {
            assignRolesAndStartGame();
            gameState.restartVotes = 0;
        }
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        console.log(`User disconnected: ${socket.id}`);
    });
});

function assignRolesAndStartGame() {
    const shuffledRoles = ['emperor', 'slave'].sort(() => Math.random() - 0.5);

    players = players.map((player, index) => ({
        ...player,
        role: shuffledRoles[index],
        cards: shuffledRoles[index] === 'emperor'
            ? ['emperor', 'citizen', 'citizen', 'citizen', 'citizen']
            : ['slave', 'citizen', 'citizen', 'citizen', 'citizen']
    }));

    io.emit('startGame', players);
    resetGameState();
}

function evaluateTurn() {
    const emperorCard = gameState.emperorCard;
    const slaveCard = gameState.slaveCard;

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
        resetTurn();
        return;
    } else {
        result = cardStrength[emperorCard][slaveCard];
    }

    if (result === 'win') {
        gameState.results.push({ winner: 'emperor' });
    } else {
        gameState.results.push({ winner: 'slave' });
    }

    const emperorWins = gameState.results.filter(r => r.winner === 'emperor').length;
    const slaveWins = gameState.results.filter(r => r.winner === 'slave').length;

    if (slaveWins > 0) {
        io.emit('gameOver', { winner: '奴隷側の勝利！' });
        resetGame();
        return;
    }

    if (emperorWins === 3) {
        io.emit('gameOver', { winner: '皇帝側の勝利！' });
        resetGame();
        return;
    }

    if (emperorWins === gameState.currentMatch) {
        gameState.currentMatch++;
        if (gameState.currentMatch > 3) {
            io.emit('gameOver', { winner: '皇帝側の勝利！' });
            resetGame();
        } else {
            io.emit('matchOver', { message: `皇帝側が試合${gameState.currentMatch - 1}に勝利しました！`, showNextMatchButton: true });
            resetTurn();
        }
    } else {
        resetTurn();
    }
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

function startNextMatch() {
    players.forEach(player => {
        player.cards = player.role === 'emperor'
            ? ['emperor', 'citizen', 'citizen', 'citizen', 'citizen']
            : ['slave', 'citizen', 'citizen', 'citizen', 'citizen'];
    });

    io.emit('nextMatchStart', {
        message: `第${gameState.currentMatch}試合を開始します！`,
        players: getRemainingCards(),
        currentMatch: gameState.currentMatch
    });

    gameState.results = [];
    gameState.nextMatchVotes = 0; // **ここで必ず投票数をリセット**
    resetTurn();
}

function resetGame() {
    gameState = {
        round: 0,
        emperorCard: null,
        slaveCard: null,
        results: [],
        waitingForOpponent: false,
        currentMatch: 1,
        nextMatchVotes: 0,
        restartVotes: 0
    };
}

function resetGameState() {
    gameState.results = [];
    gameState.currentMatch = 1;
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
