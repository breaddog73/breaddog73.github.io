// 게임 상태
let gameState = {
    cards: [],
    revealed: [],
    matched: [],
    isPeekTime: true,
    isGameActive: false,
    firstCard: null,
    secondCard: null,
    canClick: false,
    round: 1,
    sold: 0,
    targetSold: 8,
    gameStartTime: null,
    peekDuration: 3000, // 3초
    timerInterval: null,
    remainingTime: 0,
    // ms for rounds: 1->3:00, 2->2:30, 3->2:30
    roundDurations: [180000, 150000, 150000],
    // 목표 판매량을 라운드별로 지정 (1라운드, 2라운드, 3라운드)
    roundTargets: [8, 8, 12],
    basePairs: 8
};

// 만두 종류 (쌍으로 필요)
const mandoTypes = ['🥟', '🥠', '🍛', '🍜', '🍱', '🥘', '🍲', '🥙', '🍩', '🍪', '🍰', '🍧'];

// DOM 요소
const gameBoard = document.getElementById('gameBoard');
const gameStatus = document.getElementById('gameStatus');
const roundDisplay = document.getElementById('round');
const soldDisplay = document.getElementById('sold');
const targetDisplay = document.getElementById('target');
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const retryBtn = document.getElementById('retryBtn');

// 게임 시작
function startGame() {
    gameState = {
        cards: [],
        revealed: [],
        matched: [],
        isPeekTime: true,
        isGameActive: true,
        firstCard: null,
        secondCard: null,
        canClick: false,
        round: 1,
        sold: 0,
        targetSold: 8,
        gameStartTime: Date.now(),
        peekDuration: 3000,
        timerInterval: null,
        remainingTime: 0,
        roundDurations: [180000, 150000, 150000],
            roundTargets: [8, 8, 12],
            basePairs: 8
    };

    initializeRound();
    startBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    retryBtn.style.display = 'none';
    gameStatus.textContent = '🔍 카드를 살펴보세요...';
    gameStatus.className = 'game-status info';
}

// 라운드 초기화
function initializeRound() {
    // 카드 생성
    gameState.cards = [];
    // set targetSold according to roundTargets if available
    if (Array.isArray(gameState.roundTargets) && gameState.roundTargets[gameState.round - 1] != null) {
        gameState.targetSold = gameState.roundTargets[gameState.round - 1];
    }
    // determine number of pairs for this round
    let pairs = gameState.basePairs || 8;
    if (gameState.round === 3) {
        // round 3: add 4 pairs (8 cards)
        pairs += 4;
    }

    // ensure we have enough mando types
    const available = [...mandoTypes].sort(() => Math.random() - 0.5);
    const selectedTypes = available.slice(0, pairs);

    // create pairs and shuffle
    const deck = selectedTypes.flatMap(type => [type, type]).sort(() => Math.random() - 0.5);

    deck.forEach((mando, index) => {
        gameState.cards.push({
            id: index,
            type: mando,
            revealed: true // 처음에는 모두 공개
        });
    });

    gameState.revealed = new Array(gameState.cards.length).fill(false);
    gameState.matched = [];
    gameState.firstCard = null;
    gameState.secondCard = null;
    gameState.canClick = false;
    gameState.isPeekTime = true;

    roundDisplay.textContent = gameState.round;
    targetDisplay.textContent = gameState.targetSold;
    soldDisplay.textContent = gameState.sold;
    updateGameBoard();

    // 3초 후 카드 뒤집기
    setTimeout(() => {
        flipAllCards();
    }, gameState.peekDuration);
}

// 모든 카드를 뒤집기 (찜기 뚜껑 닫기)
function flipAllCards() {
    gameState.isPeekTime = false;
    gameState.canClick = true;

    gameState.cards.forEach(card => {
        card.revealed = false;
    });

    updateGameBoard();
    gameStatus.textContent = '🎮 짝을 찾아보세요!';
    gameStatus.className = 'game-status info';
    // start round timer
    startTimerForRound(gameState.round);
}

// Timer functions
function startTimerForRound(round) {
    stopTimer();
    const idx = Math.max(0, Math.min(round - 1, gameState.roundDurations.length - 1));
    gameState.remainingTime = gameState.roundDurations[idx];
    updateTimerDisplay();
    gameState.timerInterval = setInterval(() => {
        gameState.remainingTime -= 1000;
        if (gameState.remainingTime <= 0) {
            gameState.remainingTime = 0;
            updateTimerDisplay();
            stopTimer();
            timeUp();
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const ms = gameState.remainingTime || 0;
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    timerDisplay.textContent = `${String(min).padStart(1, '0')}:${String(sec).padStart(2, '0')}`;
}

function timeUp() {
    gameState.isGameActive = false;
    gameState.canClick = false;
    gameStatus.textContent = `⏰ 시간 종료! 판매: ${gameState.sold}/${gameState.targetSold}`;
    gameStatus.className = 'game-status failure';
    retryBtn.style.display = 'inline-block';
}

// 게임 보드 업데이트
function updateGameBoard() {
    gameBoard.innerHTML = '';

    gameState.cards.forEach((card, index) => {
        const cardElement = document.createElement('button');
        cardElement.className = 'card';

        if (gameState.matched.includes(index)) {
            cardElement.classList.add('matched');
            cardElement.textContent = '✓';
            cardElement.disabled = true;
        } else if (card.revealed || gameState.isPeekTime) {
            cardElement.classList.add('revealed');
            cardElement.textContent = card.type;
            cardElement.disabled = !gameState.canClick || gameState.isPeekTime;
        } else {
            cardElement.classList.add('flipped');
            cardElement.textContent = '🍚'; // 찜기 뚜껑 표현
            cardElement.disabled = !gameState.canClick;
        }

        cardElement.onclick = () => flipCard(index, cardElement);
        gameBoard.appendChild(cardElement);
    });
}

// 카드 클릭
function flipCard(index, cardElement) {
    // 이미 공개되었거나 매칭된 카드는 클릭 불가
    if (gameState.cards[index].revealed || gameState.matched.includes(index)) {
        return;
    }

    // 이미 2개를 클릭했으면 대기
    if (gameState.firstCard !== null && gameState.secondCard !== null) {
        return;
    }

    // 같은 카드를 두 번 클릭하지 않도록
    if (gameState.firstCard === index || gameState.secondCard === index) {
        return;
    }

    // 카드 공개
    gameState.cards[index].revealed = true;
    cardElement.classList.add('revealed');
    cardElement.textContent = gameState.cards[index].type;
    cardElement.disabled = true;

    if (gameState.firstCard === null) {
        gameState.firstCard = index;
    } else {
        gameState.secondCard = index;
        checkMatch();
    }
}

// 짝 확인
function checkMatch() {
    const first = gameState.cards[gameState.firstCard];
    const second = gameState.cards[gameState.secondCard];

    if (first.type === second.type) {
        // 짝이 맞음
        gameState.matched.push(gameState.firstCard, gameState.secondCard);
        gameState.sold++;
        soldDisplay.textContent = gameState.sold;

        gameStatus.textContent = `✨ 만두를 팔았습니다! (${gameState.sold}/${gameState.targetSold})`;
        gameStatus.className = 'game-status success';

        gameState.firstCard = null;
        gameState.secondCard = null;

        updateGameBoard();

        // 모든 카드가 매칭되었거나 목표량을 도달했는지 확인
        if (gameState.matched.length === gameState.cards.length) {
            // 모든 카드 매칭됨
            roundComplete();
        } else if (gameState.sold >= gameState.targetSold) {
            // 목표량 도달
            roundComplete();
        }
    } else {
        // 짝이 틀림
        gameStatus.textContent = '❌ 다시 시도하세요!';
        gameStatus.className = 'game-status failure';

        setTimeout(() => {
            gameState.cards[gameState.firstCard].revealed = false;
            gameState.cards[gameState.secondCard].revealed = false;
            gameState.firstCard = null;
            gameState.secondCard = null;
            updateGameBoard();
            gameStatus.textContent = '🎮 짝을 찾아보세요!';
            gameStatus.className = 'game-status info';
        }, 1000);
    }
}

// 라운드 완료
function roundComplete() {
    gameState.isGameActive = false;
    stopTimer();

    if (gameState.sold >= gameState.targetSold) {
        gameStatus.textContent = `🎉 라운드 ${gameState.round} 클리어! 목표: ${gameState.sold}/${gameState.targetSold}`;
        gameStatus.className = 'game-status success';
        nextBtn.style.display = 'inline-block';
    } else {
        gameStatus.textContent = `💔 라운드 ${gameState.round} 실패... 목표: ${gameState.sold}/${gameState.targetSold}`;
        gameStatus.className = 'game-status failure';
        retryBtn.style.display = 'inline-block';
    }
}

// 다음 라운드
function nextRound() {
    gameState.round++;
    gameState.sold = 0;
    // set target for the new round (use roundTargets if provided)
    if (Array.isArray(gameState.roundTargets) && gameState.roundTargets[gameState.round - 1] != null) {
        gameState.targetSold = gameState.roundTargets[gameState.round - 1];
    }
    gameState.isGameActive = true;
    gameState.gameStartTime = Date.now();
    stopTimer();

    nextBtn.style.display = 'none';
    retryBtn.style.display = 'none';

    gameStatus.textContent = '🔍 카드를 살펴보세요...';
    gameStatus.className = 'game-status info';

    initializeRound();
}

// 라운드 재시도
function retryRound() {
    gameState.sold = 0;
    gameState.isGameActive = true;
    // ensure target remains the same for retry
    if (Array.isArray(gameState.roundTargets) && gameState.roundTargets[gameState.round - 1] != null) {
        gameState.targetSold = gameState.roundTargets[gameState.round - 1];
    }
    gameState.gameStartTime = Date.now();
    stopTimer();

    nextBtn.style.display = 'none';
    retryBtn.style.display = 'none';

    gameStatus.textContent = '🔍 카드를 살펴보세요...';
    gameStatus.className = 'game-status info';

    initializeRound();
}
