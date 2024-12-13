// 修正済み script.js
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
const waitMessage = document.getElementById('waitMessage');
const nextMatchButton = document.createElement('button');
const restartButton = document.createElement('button');

nextMatchButton.textContent = '次の試合へ';
nextMatchButton.style.display = 'none';
nextMatchButton.addEventListener('click', () => {
    socket.emit('nextMatch');
});

restartButton.textContent = '再試合';
restartButton.style.display = 'none';
restartButton.addEventListener('click', () => {
    socket.emit('restartGame');
});

gameDiv.appendChild(nextMatchButton);
gameDiv.appendChild(restartButton);

let currentMatch = 1;

// ログイン処理
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
    restartButton.style.display = 'none'; // 再試合ボタンを非表示
    currentMatch = 1; // 試合カウントをリセット
    updateRoundDisplay();
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
            waitMessage.style.display = 'block'; // 相手の行動待機メッセージを表示
        };
        cardsDiv.appendChild(cardImg);
    });
}

// 現在の試合を表示
function updateRoundDisplay() {
    roundDisplay.textContent = `現在の試合: 第${currentMatch}試合`;
}

// ターン結果の更新
socket.on('turnResult', (result) => {
    waitMessage.style.display = 'none'; // 待機メッセージを非表示
    if (result.result === 'draw') {
        updateResultMessage(`市民同士が選択され、このターンは引き分けでした。次のターンに進みます。`);
        updateCards(result.remainingCards.find(p => p.id === socket.id).cards);
    }
});

// 試合結果の更新
socket.on('matchOver', (data) => {
    updateResultMessage(data.message);
    if (data.showNextMatchButton) {
        nextMatchButton.style.display = 'block'; // 次の試合ボタンを表示
    }
    currentMatch++; // 試合数を更新
    updateRoundDisplay();
});

// 次の試合開始
socket.on('nextMatchStart', (data) => {
    updateResultMessage(data.message);
    nextMatchButton.style.display = 'none'; // 次の試合ボタンを非表示
    currentMatch = data.currentMatch; // サーバーからの試合情報を更新
    updateRoundDisplay();

    const player = data.players.find(p => p.id === socket.id);
    if (player) updateCards(player.cards);
});

// ゲーム終了メッセージ
socket.on('gameOver', (data) => {
    updateResultMessage(data.winner);
    cardsDiv.innerHTML = ''; // カードを無効化
    restartButton.style.display = 'block'; // 再試合ボタンを表示
    nextMatchButton.style.display = 'none'; // 次の試合ボタンを非表示
});

// 相手の行動待機メッセージ
socket.on('waitForOpponent', (message) => {
    waitMessage.textContent = message;
    waitMessage.style.display = 'block';
});

// 最新メッセージのみ表示
function updateResultMessage(message) {
    resultsDiv.innerHTML = `<p>${message}</p>`;
}