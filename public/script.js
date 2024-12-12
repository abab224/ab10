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

joinButton.addEventListener('click', () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (username && /^\d{4}$/.test(password)) {
        socket.emit('login', username, password);
    } else {
        alert('Please enter a valid username and a 4-digit password.');
    }
});

// ログインエラー
socket.on('loginError', (message) => {
    alert(message);
});

// 待機メッセージ
socket.on('waiting', (message) => {
    loginDiv.style.display = 'none';
    waitingDiv.style.display = 'block';
});

// ゲーム開始
socket.on('startGame', (players) => {
    loginDiv.style.display = 'none';
    waitingDiv.style.display = 'none';
    gameDiv.style.display = 'block';

    const player = players.find(p => p.id === socket.id);
    roleDisplay.textContent = `You are ${player.role.toUpperCase()}`;

    player.cards.forEach(card => {
        const cardImg = document.createElement('img');
        cardImg.src = `images/${card}.png`; // カード画像のパス
        cardImg.alt = card;
        cardImg.classList.add('card-image');
        cardImg.onclick = () => {
            socket.emit('playCard', card);
            cardsDiv.innerHTML = ''; // 選択後、カード選択を無効化
        };
        cardsDiv.appendChild(cardImg);
    });
});

socket.on('roundResult', (result) => {
    resultsDiv.innerHTML += `<p>Round: <b>${result.emperorCard}</b> vs <b>${result.slaveCard}</b> - Winner: <b>${result.winner.toUpperCase()}</b></p>`;
});

socket.on('gameOver', (data) => {
    resultsDiv.innerHTML += `<h2>Game Over! Winner: ${data.winner.toUpperCase()}</h2>`;
});
