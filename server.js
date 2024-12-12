const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// 静的ファイルの提供
app.use(express.static('public'));

// ゲーム管理変数
let players = [];
let gameState = {
    round: 0,
    emperorCard: null,
    slaveCard: null,
    results: []
};

// カードの優劣
const cardStrength = {
    emperor: { citizen: 'win', slave: 'lose' },
    citizen: { slave: 'win', emperor: 'lose' },
    slave: { emperor: 'win', citizen: 'lose' }
};

// ソケット通信
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // ログイン処理
    socket.on('login', (username, password) => {
        if (!username || !/^\d{4}$/.test(password)) {
            socket.emit('loginError', 'Invalid username or password format.');
            return;
        }

        if (players.length < 2) {
            players.push({ id: socket.id, username, password, role: null, cards: [] });
            console.log(`${username} logged in`);

            if (players.length === 2) {
                assignRolesAndStartGame();
            } else {
                socket.emit('waiting', 'Waiting for another player...');
            }
        } else {
            socket.emit('loginError', 'The game is already full.');
        }
    });

    // カードを選択
    socket.on('playCard', (card) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        if (player.role === 'emperor') {
            gameState.emperorCard = card;
        } else if (player.role === 'slave') {
            gameState.slaveCard = card;
        }

        if (gameState.emperorCard && gameState.slaveCard) {
            evaluateRound();
        }
    });

    // 切断
    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        console.log(`User disconnected: ${socket.id}`);
    });
});

// ランダムに役割を割り当ててゲームを開始
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
}

// ラウンド評価
function evaluateRound() {
    const emperorCard = gameState.emperorCard;
    const slaveCard = gameState.slaveCard;

    const result = cardStrength[emperorCard][slaveCard];
    const roundResult = {
        emperorCard,
        slaveCard,
        winner: result === 'win' ? 'emperor' : 'slave'
    };

    gameState.results.push(roundResult);

    io.emit('roundResult', roundResult);

    gameState.emperorCard = null;
    gameState.slaveCard = null;
    gameState.round++;

    if (gameState.round === 3) {
        concludeGame();
    }
}

// ゲーム終了
function concludeGame() {
    const emperorWins = gameState.results.filter(r => r.winner === 'emperor').length;
    const slaveWins = gameState.results.filter(r => r.winner === 'slave').length;

    let winner = 'slave';
    if (emperorWins === 3) winner = 'emperor';

    io.emit('gameOver', { winner, results: gameState.results });

    // 状態をリセット
    players = [];
    gameState = { round: 0, emperorCard: null, slaveCard: null, results: [] };
}

// サーバー起動
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
