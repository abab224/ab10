// script.js
const socket = io();
const loginDiv = document.getElementById('login');
const gameDiv = document.getElementById('game');
const waitingDiv = document.getElementById('waiting');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const joinButton = document.getElementById('joinGame');
const roleDisplay = document.getElementById('role');
const cardsDiv = document.getElementById('cards');
const resultsDiv = document.getElementById('results');
const waitMessage = document.getElementById('waitMessage');
const restartButtonKeep = document.createElement('button');
const restartButtonRandom = document.createElement('button');

restartButtonKeep.textContent = '役職を継続して再試合';
restartButtonKeep.style.display = 'none';
restartButtonKeep.addEventListener('click', () => {
    socket.emit('restartGame', true);
});

restartButtonRandom.textContent = '役職をランダム化して再試合';
restartButtonRandom.style.display = 'none';
restartButtonRandom.addEventListener('click', () => {
    socket.emit('restartGame', false);
});

gameDiv.appendChild(restartButtonKeep);
gameDiv.appendChild(restartButtonRandom);

joinButton.addEventListener('click', () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (username && /^\d{4}$/.test(password)) {
        socket.emit('login', username, password);
    } else {
        alert('ユーザー名と4桁のパスワードを入力してください。');
    }
});

socket.on('loginError', (message) => {
    alert(message);
});

socket.on('waiting', () => {
    loginDiv.style.display = 'none';
    waitingDiv.style.display = 'block';
});

socket.on('startGame', (players) => {
    loginDiv.style.display = 'none';
    waitingDiv.style.display = 'none';
    gameDiv.style.display = 'block';

    const player = players.find(p => p.id === socket.id);
    roleDisplay.textContent = `あなたは ${player.role === 'emperor' ? '皇帝側' : '奴隷側'} です`;

    updateCards(player.cards);
    restartButtonKeep.style.display = 'none';
    restartButtonRandom.style.display = 'none';
});

function updateCards(cards) {
    cardsDiv.innerHTML = '';
    cards.forEach(card => {
        const cardImg = document.createElement('img');
        cardImg.src = `images/${card}.png`;
        cardImg.alt = card;
        cardImg.classList.add('card-image');
        cardImg.onclick = () => {
            socket.emit('playCard', card);
            cardsDiv.innerHTML = '';
            waitMessage.style.display = 'block';
        };
        cardsDiv.appendChild(cardImg);
    });
}

socket.on('turnResult', (result) => {
    waitMessage.style.display = 'none';
    if (result.result === 'draw') {
        updateResultMessage('市民同士が選択され、このターンは引き分けでした。次のターンに進みます。');
        updateCards(result.remainingCards.find(p => p.id === socket.id).cards);
    }
});

socket.on('gameOver', (data) => {
    updateResultMessage(data.winner);
    cardsDiv.innerHTML = '';
    restartButtonKeep.style.display = 'block';
    restartButtonRandom.style.display = 'block';
});

socket.on('waitForOpponent', (message) => {
    waitMessage.textContent = message;
    waitMessage.style.display = 'block';
});

function updateResultMessage(message) {
    resultsDiv.innerHTML = `<p>${message}</p>`;
}
