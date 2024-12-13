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

let currentRound = 1;

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

// ターン結果の更新
socket.on('turnResult', (result) => {
    waitMessage.style.display = 'none'; // 待機メッセージを非表示
    if (result.result === 'draw') {
        resultsDiv.innerHTML += `<p>このターンは引き分けでした。次のターンに進みます。</p>`;
        updateCards(result.remainingCards.find(p => p.id === socket.id).cards);
    }
});

// 試合終了メッセージ
socket.on('gameOver', (data) => {
    resultsDiv.innerHTML += `<h2>${data.winner}</h2>`;
    cardsDiv.innerHTML = ''; // カードを無効化
});

// 次の試合開始メッセージ
socket.on('nextMatchStart', (data) => {
    resultsDiv.innerHTML += `<p>${data.message}</p>`;
    roundDisplay.textContent = `現在の試合: 第${currentRound}試合`;

    const player = data.players.find(p => p.id === socket.id);
    if (player) updateCards(player.cards);
});

// 相手の行動待機メッセージ
socket.on('waitForOpponent', (message) => {
    waitMessage.textContent = message;
    waitMessage.style.display = 'block';
});
