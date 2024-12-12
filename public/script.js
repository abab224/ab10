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
const roundDisplay = document.getElementById('round');

let currentRound = 1;

joinButton.addEventListener('click', () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (username && /^\d{4}$/.test(password)) {
        socket.emit('login', username, password);
    } else {
        alert('ユーザー名と4桁のパスワードを入力してください。');
    }
});

// ログインエラー
socket.on('loginError', (message) => {
    alert(message);
});

// 待機メッセージ
socket.on('waiting', () => {
    loginDiv.style.display = 'none';
    waitingDiv.style.display = 'block';
});

// ゲーム開始
socket.on('startGame', (players) => {
    loginDiv.style.display = 'none';
    waitingDiv.style.display = 'none';
    gameDiv.style.display = 'block';

    const player = players.find(p => p.id === socket.id);
    roleDisplay.textContent = `あなたは ${player.role === 'emperor' ? '皇帝側' : '奴隷側'} です`;

    updateCards(player.cards);
});

// カードを更新する関数
function updateCards(cards) {
    cardsDiv.innerHTML = '';
    cards.forEach(card => {
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
}

// 試合結果の更新
socket.on('roundResult', (result) => {
    roundDisplay.textContent = `現在の試合: 第${currentRound}試合`;
    const message = `第${currentRound}試合結果: <b>${result.emperorCard}</b> vs <b>${result.slaveCard}</b> - 勝者: <b>${result.winner === 'draw' ? '引き分け' : (result.winner === 'emperor' ? '皇帝側' : '奴隷側')}</b>`;
    resultsDiv.innerHTML += `<p>${message}</p>`;

    currentRound++;

    if (result.isGameOver) {
        const winnerMessage = result.gameWinner === 'emperor' ? '皇帝側が勝利しました！' : '奴隷側が勝利しました！';
        resultsDiv.innerHTML += `<h2>${winnerMessage}</h2>`;
    } else {
        updateCards(result.remainingCards);
    }
});
