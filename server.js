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
    currentMatch: 1,
    nextMatchVotes: 0
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

            evaluateTurn();
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

    // 次の試合への投票
    socket.on('nextMatch', () => {
        gameState.nextMatchVotes++;
        if (gameState.nextMatchVotes === 2) {
            startNextMatch();
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

// ターン評価
function evaluateTurn() {
    const emperorCard = gameState.emperorCard;
    const slaveCard = gameState.slaveCard;

    let result;
    if (emperorCard === slaveCard && emperorCard === 'citizen') {
        result = 'draw';
    } else {
        result = cardStrength[emperorCard][slaveCard];
    }

    if (result === 'draw') {
        // 使用した市民カードを削除
        players.forEach(player => {
            if (player.role === 'emperor') {
                player.cards = player.cards.filter(card => card !== emperorCard);
            } else if (player.role === 'slave') {
                player.cards = player.cards.filter(card => card !== slaveCard);
            }
        });

        io.emit('turnResult', { result: 'draw', remainingCards: getRemainingCards() });
        resetTurn();
        return;
    }

    const roundResult = {
        emperorCard,
        slaveCard,
        winner: result === 'win' ? 'emperor' : 'slave'
    };

    gameState.results.push(roundResult);

    if (roundResult.winner === 'slave') {
        io.emit('gameOver', { winner: '奴隷側の勝利！' });
        resetGame();
        return;
    }

    const emperorWins = gameState.results.filter(r => r.winner === 'emperor').length;

    if (emperorWins === gameState.currentMatch) {
        if (gameState.currentMatch === 3) {
            io.emit('gameOver', { winner: '皇帝側の勝利！' });
            resetGame();
        } else {
            gameState.nextMatchVotes = 0;
            io.emit('matchOver', { message: `皇帝側が試合${gameState.currentMatch}に勝利しました！次の試合に進む準備をしてください。` });
            gameState.currentMatch++;
        }
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

function startNextMatch() {
    // カードをリセット
    players.forEach(player => {
        player.cards = player.role === 'emperor'
            ? ['emperor', 'citizen', 'citizen', 'citizen', 'citizen']
            : ['slave', 'citizen', 'citizen', 'citizen', 'citizen'];
    });

    io.emit('nextMatchStart', {
        message: `第${gameState.currentMatch}試合を開始します！`,
        players: getRemainingCards()
    });

    gameState.results = [];
    resetTurn();
}

function resetGame() {
    players = [];
    gameState = {
        round: 0,
        emperorCard: null,
        slaveCard: null,
        results: [],
        waitingForOpponent: false,
        currentMatch: 1,
        nextMatchVotes: 0
    };
}

// サーバー起動
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
