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
nextMatchButton.textContent = '次の試合へ';
nextMatchButton.style.display = 'none';
nextMatchButton.addEventListener('click', () => {
    socket.emit('nextMatch');
});

gameDiv.appendChild(nextMatchButton);

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

socket.on('turnResult', (result) => {
    waitMessage.style.display = 'none'; // 待機メッセージを非表示
    resultsDiv.innerHTML += `<p>${result.message}</p>`;

    // カードを更新
    updateCards(result.remainingCards.find(p => p.id === socket.id).cards);

    // 引き分けの場合、少し待ってから次のターンに自動移行
    if (result.result === 'draw') {
        setTimeout(() => {
            resultsDiv.innerHTML += `<p>次のターンに進みます...</p>`;
        }, 1000); // 1秒後に次のターンメッセージを表示
    }
});


// 試合結果の更新
socket.on('roundResult', (result) => {
    waitMessage.style.display = 'none'; // 待機メッセージを非表示
    roundDisplay.textContent = `現在の試合: 第${result.round}試合`;

    let message;
    if (result.winner === 'draw') {
        message = `第${result.round}試合: <b>${result.emperorCard}</b> vs <b>${result.slaveCard}</b> - 引き分け`;
    } else {
        message = `第${result.round}試合: <b>${result.emperorCard}</b> vs <b>${result.slaveCard}</b> - 勝者: <b>${result.winner === 'emperor' ? '皇帝側' : '奴隷側'}</b>`;
    }

    resultsDiv.innerHTML += `<p>${message}</p>`;

    if (result.isGameOver) {
        const winnerMessage = result.gameWinner === 'emperor' ? '皇帝側の勝利！' : '奴隷側の勝利！';
        resultsDiv.innerHTML += `<h2>${winnerMessage}</h2>`;
        cardsDiv.innerHTML = ''; // ゲーム終了後はカードを無効化
        nextMatchButton.style.display = 'none'; // 「次の試合へ」ボタン非表示
    } else {
        currentRound = result.round;
        updateCards(result.remainingCards.find(p => p.id === socket.id).cards);
    }
});

// 試合終了メッセージ
socket.on('gameOver', (data) => {
    resultsDiv.innerHTML += `<h2>${data.winner}</h2>`;
    cardsDiv.innerHTML = ''; // カードを無効化
    nextMatchButton.style.display = 'none';
});

// 次の試合メッセージ
socket.on('matchOver', (data) => {
    resultsDiv.innerHTML += `<p>${data.message}</p>`;
    nextMatchButton.style.display = 'block'; // 次の試合ボタンを表示
});

// 次の試合開始
socket.on('nextMatchStart', (data) => {
    resultsDiv.innerHTML += `<p>${data.message}</p>`;
    nextMatchButton.style.display = 'none'; // ボタンを非表示
    roundDisplay.textContent = `現在の試合: 第${currentRound}試合`;

    const player = data.players.find(p => p.id === socket.id);
    if (player) updateCards(player.cards);
});

// 相手の行動待機メッセージ
socket.on('waitForOpponent', (message) => {
    waitMessage.textContent = message;
    waitMessage.style.display = 'block';
});
