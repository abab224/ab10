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

function startGameWithCurrentRoles() {
    players.forEach(player => {
        player.cards = player.role === 'emperor'
            ? ['emperor', 'citizen', 'citizen', 'citizen', 'citizen']
            : ['slave', 'citizen', 'citizen', 'citizen', 'citizen'];
    });

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
        resetGameState();
        return;
    }

    gameState.waitingForOpponent = false;
    resetTurn();
}

function resetTurn() {
    gameState.emperorCard = null;
    gameState.slaveCard = null;
    gameState.waitingForOpponent = false;
}

function resetGameState() {
    gameState = {
        emperorCard: null,
        slaveCard: null,
        waitingForOpponent: false,
    };
}

function getRemainingCards() {
    return players.map(player => ({
        id: player.id,
        cards: player.cards
    }));
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
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

function startGameWithCurrentRoles() {
    players.forEach(player => {
        player.cards = player.role === 'emperor'
            ? ['emperor', 'citizen', 'citizen', 'citizen', 'citizen']
            : ['slave', 'citizen', 'citizen', 'citizen', 'citizen'];
    });

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
        resetGameState();
        return;
    }

    gameState.waitingForOpponent = false;
    resetTurn();
}

function resetTurn() {
    gameState.emperorCard = null;
    gameState.slaveCard = null;
    gameState.waitingForOpponent = false;
}

function resetGameState() {
    gameState = {
        emperorCard: null,
        slaveCard: null,
        waitingForOpponent: false,
    };
}

function getRemainingCards() {
    return players.map(player => ({
        id: player.id,
        cards: player.cards
    }));
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
