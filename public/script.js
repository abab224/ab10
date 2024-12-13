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

const restartButton = document.createElement('button');
const continueButton = document.createElement('button');

restartButton.textContent = '再試合';
continueButton.textContent = '役職を継続';
restartButton.style.display = 'none';
continueButton.style.display = 'none';
restartButton.addEventListener('click', () => {
    socket.emit('restartGame');
});
continueButton.addEventListener('click', () => {
    socket.emit('continueRoles');
});

gameDiv.appendChild(restartButton);
gameDiv.appendChild(continueButton);

joinButton.addEventListener('click', () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (username && /\d{4}/.test(password)) {
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
    restartButton.style.display = 'none';
    continueButton.style.display = 'none';
});

function updateCards(cards) {
    cardsDiv.innerHTML = '';
    cards.forEach(card => {
        const cardImg = document.createElement('img');
        cardImg.src = `images/${card}.png`;
        cardImg.alt = card;
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
        resultsDiv.innerHTML = '<p>市民同士が選択され、このターンは引き分けでした。次のターンに進みます。</p>';
        updateCards(result.remainingCards.find(p => p.id === socket.id).cards);
    }
});

socket.on('gameOver', (data) => {
    resultsDiv.innerHTML = `<p>${data.winner}</p>`;
    cardsDiv.innerHTML = '';
    restartButton.style.display = 'block';
    continueButton.style.display = 'block';
});

socket.on('waitForOpponent', (message) => {
    waitMessage.textContent = message;
    waitMessage.style.display = 'block';
});
