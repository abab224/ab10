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
    results: [],
    waitingForOpponent: false,
};

// カードの優劣
const cardStrength = {
    emperor: { citizen: 'win', slave: 'lose' },
    citizen: { slave: 'win', emperor: 'lose', citizen: 'draw' },
    slave: { emperor: 'win', citizen: 'lose' }
};

// ソケット通信
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // ログイン処理
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

    // カードを選択
    socket.on('playCard', (card) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        if (gameState.waitingForOpponent) {
            // 2人目のプレイヤーの行動
            if (player.role === 'emperor') {
                gameState.emperorCard = card;
            } else if (player.role === 'slave') {
                gameState.slaveCard = card;
            }

            evaluateRound();
        } else {
            // 1人目のプレイヤーの行動
            if (player.role === 'emperor') {
                gameState.emperorCard = card;
            } else if (player.role === 'slave') {
                gameState.slaveCard = card;
            }

            gameState.waitingForOpponent = true;
            socket.emit('waitForOpponent', '相手の行動を待っています...');
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

    let result;
    if (emperorCard === slaveCard && emperorCard === 'citizen') {
        result = 'draw';
    } else {
        result = cardStrength[emperorCard][slaveCard];
    }

    const roundResult = {
        emperorCard,
        slaveCard,
        winner: result === 'win' ? 'emperor' : result === 'lose' ? 'slave' : 'draw'
    };

    gameState.results.push(roundResult);

    // 勝敗を判定
    const emperorWins = gameState.results.filter(r => r.winner === 'emperor').length;
    const slaveWins = gameState.results.filter(r => r.winner === 'slave').length;

    let isGameOver = false;
    let gameWinner = null;

    if (slaveWins > 0) {
        isGameOver = true;
        gameWinner = 'slave';
    } else if (emperorWins === 3) {
        isGameOver = true;
        gameWinner = 'emperor';
    }

    io.emit('roundResult', {
        ...roundResult,
        isGameOver,
        gameWinner,
        round: gameState.round + 1,
        remainingCards: getRemainingCards()
    });

    gameState.emperorCard = null;
    gameState.slaveCard = null;
    gameState.waitingForOpponent = false;
    gameState.round++;

    if (isGameOver) {
        resetGame();
    }
}

// 残りのカードを取得
function getRemainingCards() {
    return players.map(player => ({
        id: player.id,
        cards: player.cards.filter(card => {
            if (gameState.results.some(r => r.winner === 'draw' && (r.emperorCard === card || r.slaveCard === card))) {
                return false; // 引き分けで使われたカードを除外
            }
            return true;
        })
    }));
}

function resetGame() {
    players = [];
    gameState = { round: 0, emperorCard: null, slaveCard: null, results: [], waitingForOpponent: false };
}

// サーバー起動
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
