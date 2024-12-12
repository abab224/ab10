const io = require('socket.io')(server);

let players = [];
let roundCount = 1;
let emperorWins = 0;

io.on('connection', (socket) => {
    socket.on('login', (username, password) => {
        if (players.length < 2) {
            const role = players.length === 0 ? 'emperor' : 'slave';
            players.push({ id: socket.id, username, role, cards: getInitialCards(role) });

            if (players.length === 2) {
                startGame();
            } else {
                socket.emit('waiting');
            }
        } else {
            socket.emit('loginError', '現在ゲームが進行中です。お待ちください。');
        }
    });

    socket.on('playCard', (card) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        player.selectedCard = card;

        if (players.every(p => p.selectedCard)) {
            resolveRound();
        }
    });

    function getInitialCards(role) {
        return role === 'emperor' ? ['emperor', 'citizen', 'citizen', 'citizen', 'citizen'] :
            ['slave', 'citizen', 'citizen', 'citizen', 'citizen'];
    }

    function startGame() {
        io.emit('startGame', players);
    }

    function resolveRound() {
        const emperor = players.find(p => p.role === 'emperor');
        const slave = players.find(p => p.role === 'slave');

        const result = getRoundResult(emperor.selectedCard, slave.selectedCard);

        emperor.cards = emperor.cards.filter(card => card !== emperor.selectedCard);
        slave.cards = slave.cards.filter(card => card !== slave.selectedCard);

        roundCount++;
        emperor.selectedCard = null;
        slave.selectedCard = null;

        const gameOver = checkGameOver(result.winner);

        io.emit('roundResult', {
            emperorCard: emperor.selectedCard,
            slaveCard: slave.selectedCard,
            winner: result.winner,
            remainingCards: gameOver ? [] : players.find(p => p.id === socket.id).cards,
            isGameOver: gameOver,
            gameWinner: gameOver ? (emperorWins === 3 ? 'emperor' : 'slave') : null
        });
    }

    function getRoundResult(emperorCard, slaveCard) {
        if (emperorCard === 'emperor' && slaveCard === 'slave') return { winner: 'slave' };
        if (emperorCard === 'slave' && slaveCard === 'emperor') return { winner: 'slave' };
        if (emperorCard === 'emperor' && slaveCard === 'citizen') return { winner: 'emperor' };
        if (emperorCard === 'citizen' && slaveCard === 'slave') return { winner: 'emperor' };
        if (emperorCard === slaveCard) return { winner: 'draw' };
        return { winner: 'emperor' };
    }

    function checkGameOver(winner) {
        if (winner === 'slave') return true;
        if (winner === 'emperor') emperorWins++;
        return emperorWins === 3;
    }
});
