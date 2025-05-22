// game.js

// --- DOM 요소 참조 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const comboCountDisplay = document.getElementById('comboCountDisplay');
const comboMultiplierDisplay = document.getElementById('comboMultiplierDisplay');
const mainHomeScreen = document.getElementById('mainHomeScreen');
const playGameButton = document.getElementById('playGameButton');
const questsButton = document.getElementById('questsButton');
const shopButton = document.getElementById('shopButton');
const gemBalanceDisplaySpan = document.querySelector('#gemBalanceDisplay span');
const questCompletionMessagesDiv = document.getElementById('questCompletionMessages');
const startScreen = document.getElementById('startScreen'); 
const startButton = document.getElementById('startButton'); 
const gameContainer = document.getElementById('gameContainer');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const mainHomeButton = document.getElementById('mainHomeButton'); 

// --- Telegram WebApp 초기화 ---
const WebApp = window.Telegram.WebApp;
if (WebApp && WebApp.ready) {
    WebApp.ready();
} else {
    console.warn("Telegram WebApp API (WebApp.ready) is not available. Game might not interact with Telegram properly.");
}

// --- 게임 상태 및 설정 변수 ---
let score = 0;
let lives = 3;
// ... (이하 모든 전역 변수 선언은 이전 답변의 game.js와 동일하게 유지) ...
let gameSpeed = 1;
let villains = [];
let particles = [];
let sliceParticles = [];
let gameOver = true; 
let animationFrameId;
let isSlicing = false;
let currentSlicePath = [];
let sliceTrail = [];
const SLICE_TRAIL_MAX_POINTS = 30;
const SLICE_TRAIL_FADE_SPEED = 0.08;
const MIN_SLICE_POINTS = 2;
let frameCount = 0;  
let isGoldRushActive = false;
let goldRushEndTime = 0;
const GOLD_RUSH_DURATION = 3000; 
let goldRushCoinColor = 'gold';   
const MAX_LIVES = 3; 
let lifeBonusCoinColor = 'lightpink'; 
let bombCoinColor = 'black';
let iceCoinColor = 'aqua'; 
let isFrozen = false;        
let frozenEndTime = 0;
const FROZEN_DURATION = 1500;
let currentComboCount = 0;
let currentScoreMultiplier = 1.0;
const BASE_COIN_SCORE = 10; 
const COMBO_THRESHOLD = 10;   
const COMBO_MULTIPLIER_INCREMENT = 0.2; 
const MAX_COMBO_MULTIPLIER = 3.0; 
let comboResetTimer = null;     
const COMBO_RESET_DELAY = 2000; 
let playerGems = 0;
const quests = {
    q1_beginner_slasher: { id: 'q1_beginner_slasher', name: "Beginner Slasher", description: "Reach 1,000 points in a single game.", reward: 10, isCompleted: false, conditionMet: (stats) => stats.score >= 1000 },
    q2_coin_collector: { id: 'q2_coin_collector', name: "Coin Collector", description: "Slash 25 special positive coins in a single game.", reward: 20, isCompleted: false, conditionMet: (stats) => stats.specialPositiveCoinsSlashed >= 25 },
    q3_perfect_slash: { id: 'q3_perfect_slash', name: "Perfect Slash", description: "Slash 10+ coins in a single swipe.", reward: 20, isCompleted: false, conditionMet: (stats) => stats.maxCoinsInSingleSwipe >= 10 },
    q4_survival_expert: { id: 'q4_survival_expert', name: "Survival Expert", description: "Reach 3,000 points without losing a life.", reward: 50, isCompleted: false, conditionMet: (stats) => stats.score >= 3000 && stats.livesLost === 0 },
    q5_bomb_dodger: { id: 'q5_bomb_dodger', name: "Bomb Dodger", description: "Reach 3,000 points without slashing any Bomb Coins.", reward: 50, isCompleted: false, conditionMet: (stats) => stats.score >= 3000 && stats.bombsSlashed === 0 }
};
let currentGameStats = {};

// --- Canvas 크기 조절 함수 ---
function resizeCanvas() {
    if (!gameContainer || !canvas) {
        console.error("Error: gameContainer or canvas element not found for resizeCanvas.");
        return;
    }
    const containerRect = gameContainer.getBoundingClientRect();
    if (containerRect.width > 0 && containerRect.height > 0) {
        canvas.width = containerRect.width;
        canvas.height = containerRect.height;
        console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
    } else {
        console.warn("resizeCanvas called while gameContainer might be hidden or has no dimensions. Canvas might not be sized correctly until game starts or gameContainer is visible.");
    }
}

// --- 데이터 저장/로드 함수 ---
function saveData() {
    try {
        localStorage.setItem('rankingSlasher_gems', playerGems.toString());
        const completedQuestsStatus = {};
        for (const questId in quests) {
            if (quests.hasOwnProperty(questId)) {
                completedQuestsStatus[questId] = quests[questId].isCompleted;
            }
        }
        localStorage.setItem('rankingSlasher_quests', JSON.stringify(completedQuestsStatus));
        console.log("Data saved:", {gems: playerGems, quests: completedQuestsStatus});
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
    }
}

function loadData() {
    try {
        const savedGems = localStorage.getItem('rankingSlasher_gems');
        if (savedGems !== null) {
            playerGems = parseInt(savedGems, 10);
            if (isNaN(playerGems)) playerGems = 0;
        } else {
            playerGems = 0; 
        }
        const savedQuestsStatus = localStorage.getItem('rankingSlasher_quests');
        if (savedQuestsStatus) {
            const completedStatus = JSON.parse(savedQuestsStatus);
            for (const questId in quests) {
                if (quests.hasOwnProperty(questId) && completedStatus.hasOwnProperty(questId)) {
                    quests[questId].isCompleted = completedStatus[questId];
                }
            }
        }
    } catch (e) {
        console.error("Error loading data from localStorage:", e);
        playerGems = 0; 
        for (const questId in quests) {
            if (quests.hasOwnProperty(questId)) quests[questId].isCompleted = false;
        }
    }
    updateGemDisplay();
    console.log("Data loaded:", {gems: playerGems, quests});
}

// --- UI 업데이트 함수 ---
function updateGemDisplay() {
    if (gemBalanceDisplaySpan) {
        gemBalanceDisplaySpan.textContent = playerGems;
    } else {
        console.warn("gemBalanceDisplaySpan not found.");
    }
}

function showScreen(screenToShow) {
    console.log("showScreen called for:", screenToShow ? screenToShow.id : "a null screen");
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('show');
    });
    if (screenToShow) {
        screenToShow.classList.add('show');
        console.log(screenToShow.id + " classList after adding 'show':", screenToShow.classList.toString());
        console.log(screenToShow.id + " display style:", window.getComputedStyle(screenToShow).display);
    } else {
        console.warn("showScreen called with null screenToShow");
    }
}

// --- 게임 통계 및 퀘스트 로직 함수 ---
function resetCurrentGameStats() {
    currentGameStats = {
        score: 0, specialPositiveCoinsSlashed: 0, maxCoinsInSingleSwipe: 0,
        livesLost: 0, bombsSlashed: 0
    };
}

function checkAndAwardQuests() {
    console.log("Checking quests. Current game stats:", currentGameStats); 
    let questMessagesHtml = ""; let newGemsEarned = 0;
    currentGameStats.score = score; 
    for (const questId in quests) {
        if (quests.hasOwnProperty(questId)) {
            const quest = quests[questId];
            if (!quest.isCompleted && quest.conditionMet(currentGameStats)) {
                quest.isCompleted = true; playerGems += quest.reward; newGemsEarned += quest.reward;
                const message = `🏆 Quest Complete: ${quest.name} (+${quest.reward} Gems!)`;
                console.log(message); questMessagesHtml += `<p>${message}</p>`;
            }
        }
    }
    if (questCompletionMessagesDiv) { 
        questCompletionMessagesDiv.innerHTML = questMessagesHtml; 
        console.log("Quest messages updated to DOM.");
    } else {
        console.warn("questCompletionMessagesDiv not found.");
    }
    if (newGemsEarned > 0) { updateGemDisplay(); saveData(); console.log("New gems earned and data saved.");}
    else { console.log("No new quests completed in this session."); }
}

// --- 게임 요소 클래스 정의 (Villain, Particle, SliceParticle) ---
class Villain { /* ... (이전 답변의 Villain 클래스 코드 전체) ... */ 
    constructor(x, y, radius, color, velocity, isGoldRush = false, isLifeBonus = false, isBomb = false, isIce = false) {
        this.x = x; this.y = y; this.radius = radius; this.originalColor = color; 
        this.velocity = velocity; this.sliced = false; this.gravity = 0.05 * (canvas.height > 0 ? canvas.height / 800 : 0.05); 
        this.rotation = Math.random() * Math.PI * 2; this.rotationSpeed = (Math.random() - 0.5) * 0.1; 
        this.spawnTime = Date.now(); this.isGoldRushCoin = isGoldRush; this.isLifeBonusCoin = isLifeBonus;
        this.isBombCoin = isBomb; this.isIceCoin = isIce;
        if (this.isGoldRushCoin) this.color = goldRushCoinColor;
        else if (this.isLifeBonusCoin) this.color = lifeBonusCoinColor;
        else if (this.isBombCoin) this.color = bombCoinColor;
        else if (this.isIceCoin) this.color = iceCoinColor;
        else this.color = color; 
    }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        const timeSinceSpawn = Date.now() - this.spawnTime; const scale = Math.min(1, timeSinceSpawn / 200); 
        ctx.scale(scale, scale); ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2, false);
        const gradient = ctx.createRadialGradient(0, 0, this.radius * 0.1, 0, 0, this.radius);
        if (this.isGoldRushCoin) { gradient.addColorStop(0, 'rgba(255, 255, 150, 0.9)'); gradient.addColorStop(0.6, this.color); gradient.addColorStop(1, 'rgba(255, 215, 0, 0.5)'); ctx.shadowColor = 'yellow'; ctx.shadowBlur = 15; }
        else if (this.isLifeBonusCoin) { gradient.addColorStop(0, 'rgba(255, 182, 193, 0.9)'); gradient.addColorStop(0.5, this.color); gradient.addColorStop(1, 'rgba(255, 105, 180, 0.7)'); ctx.shadowColor = 'deeppink'; ctx.shadowBlur = 15; }
        else if (this.isBombCoin) { gradient.addColorStop(0, 'rgba(100, 100, 100, 0.9)'); gradient.addColorStop(0.5, this.color); gradient.addColorStop(1, 'rgba(50, 50, 50, 0.7)'); ctx.shadowColor = 'darkred'; ctx.shadowBlur = 15; }
        else if (this.isIceCoin) { gradient.addColorStop(0, 'rgba(173, 216, 230, 0.9)'); gradient.addColorStop(0.5, this.color); gradient.addColorStop(1, 'rgba(0, 191, 255, 0.7)'); ctx.shadowColor = 'cyan'; ctx.shadowBlur = 20; }
        else { gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); gradient.addColorStop(0.6, this.originalColor); gradient.addColorStop(1, 'rgba(0,0,0,0.3)');}
        ctx.fillStyle = gradient; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = this.radius * 0.05; ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.font = `bold ${this.radius * 0.7}px 'Press Start 2P'`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let symbol = '$'; 
        if (this.isGoldRushCoin) symbol = '★'; else if (this.isLifeBonusCoin) symbol = '♥';
        else if (this.isBombCoin) symbol = '☠'; else if (this.isIceCoin) symbol = '❄';  
        ctx.fillText(symbol, 0, this.radius * 0.05); 
        ctx.restore(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    }
    update() { this.x += this.velocity.x * gameSpeed; this.y += this.velocity.y * gameSpeed; this.velocity.y += this.gravity * gameSpeed; this.rotation += this.rotationSpeed * gameSpeed; if (!this.sliced) this.draw(); }
}

function spawnVillain(forceNormal = false) { /* ... (이전 답변과 동일, canvas.width/height 0 체크 추가) ... */
    if (gameOver && !isGoldRushActive) return; if (isGoldRushActive && Date.now() > goldRushEndTime) { isGoldRushActive = false; console.log("Gold Rush ended during spawn attempt."); return; }
    if(!canvas || canvas.width === 0 || canvas.height === 0) { console.warn("Canvas not ready for spawning villains."); return; }
    const radius = Math.random() * (canvas.width * 0.04) + (canvas.width * 0.055); const side = Math.floor(Math.random() * 3); let x, y; let velocityX, velocityY; const speedMultiplier = canvas.height / 800;
    if (side === 0) { x = 0 - radius; y = Math.random() * (canvas.height * 0.6) + (canvas.height * 0.2); velocityX = (Math.random() * 1.5 + 1.5) * speedMultiplier; velocityY = (Math.random() * -2.5 - 3.5) * speedMultiplier; }
    else if (side === 1) { x = Math.random() * (canvas.width - radius * 2) + radius; y = canvas.height + radius; velocityX = (Math.random() - 0.5) * 3 * speedMultiplier; velocityY = (Math.random() * -2.5 - 5.5) * speedMultiplier; }
    else { x = canvas.width + radius; y = Math.random() * (canvas.height * 0.6) + (canvas.height * 0.2); velocityX = (Math.random() * -1.5 - 1.5) * speedMultiplier; velocityY = (Math.random() * -2.5 - 3.5) * speedMultiplier; }
    let isThisAGoldRushCoin = false; let isThisAnExtraLifeCoin = false; let isThisABombCoin = false; let isThisAnIceCoin = false; let villainColor; 
    if (!forceNormal && !isGoldRushActive) { const specialCoinRoll = Math.random();
        if (specialCoinRoll < 0.05) { isThisAnExtraLifeCoin = true; console.log("Spawning Extra Life Coin!"); }
        else if (specialCoinRoll < 0.12) { isThisAGoldRushCoin = true; console.log("Spawning Gold Rush Coin!"); }
        else if (specialCoinRoll < 0.19) { isThisABombCoin = true; console.log("Spawning Bomb Coin!"); }
        else if (specialCoinRoll < 0.25) { isThisAnIceCoin = true; console.log("Spawning Ice Coin!"); }
    }
    if (isThisAGoldRushCoin) villainColor = goldRushCoinColor; else if (isThisAnExtraLifeCoin) villainColor = lifeBonusCoinColor; else if (isThisABombCoin) villainColor = bombCoinColor; else if (isThisAnIceCoin) villainColor = iceCoinColor; else villainColor = `hsl(${Math.random() * 60 + 25}, 100%, 60%)`; 
    villains.push(new Villain(x, y, radius, villainColor, { x: velocityX, y: velocityY }, isThisAGoldRushCoin, isThisAnExtraLifeCoin, isThisABombCoin, isThisAnIceCoin));
}

class Particle { /* ... (이전 답변과 동일) ... */ constructor(x, y, color, sizeMultiplier = 1) { this.x = x; this.y = y; this.size = (Math.random() * 3 + 2) * sizeMultiplier; this.color = color; this.velocity = { x: (Math.random() - 0.5) * (Math.random() * 8), y: (Math.random() - 0.5) * (Math.random() * 8) }; this.alpha = 1; this.friction = 0.97; this.gravity = 0.1;} draw() { ctx.save(); ctx.globalAlpha = this.alpha; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); ctx.restore(); } update() { this.velocity.x *= this.friction; this.velocity.y *= this.friction; this.velocity.y += this.gravity; this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= 0.03; if (this.alpha > 0) this.draw(); }}
class SliceParticle { /* ... (이전 답변과 동일) ... */ constructor(x, y) { this.x = x; this.y = y; this.size = Math.random() * 2 + 1; this.color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`; this.velocity = { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 }; this.alpha = 1; } draw() { ctx.save(); ctx.globalAlpha = this.alpha; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); ctx.restore(); } update() { this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= 0.05; if (this.alpha > 0) this.draw(); }}
function updateAndDrawParticles(particleArray) { /* ... (이전 답변과 동일) ... */ for (let i = particleArray.length - 1; i >= 0; i--) { particleArray[i].update(); if (particleArray[i].alpha <= 0) particleArray.splice(i, 1); }}
function drawSliceTrail() { /* ... (이전 답변과 동일) ... */ if (sliceTrail.length < 2) return; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (let i = 1; i < sliceTrail.length; i++) { const p1 = sliceTrail[i-1], p2 = sliceTrail[i]; const age = (i / sliceTrail.length), alpha = Math.max(0, (1 - age) * 0.8); const lineWidth = Math.max(1, (1 - age) * (canvas.width * 0.03)); if (alpha <= 0 || lineWidth <= 0) continue; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); const trailGradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y); trailGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`); trailGradient.addColorStop(0.5, `rgba(139, 227, 255, ${alpha * 0.6})`); trailGradient.addColorStop(1, `rgba(74, 222, 128, ${alpha * 0.4})`); ctx.strokeStyle = trailGradient; ctx.lineWidth = lineWidth; ctx.shadowColor = `rgba(139, 227, 255, ${alpha * 0.7})`; ctx.shadowBlur = lineWidth * 1.5; ctx.stroke(); } ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; if (sliceTrail.length > 0) { sliceTrail.forEach(p => p.alpha = (p.alpha || 1) - SLICE_TRAIL_FADE_SPEED); sliceTrail = sliceTrail.filter(p => p.alpha > 0); }}
function updateComboDisplay() { /* ... (이전 답변과 동일) ... */ if(comboCountDisplay && comboMultiplierDisplay) { comboCountDisplay.textContent = currentComboCount; comboMultiplierDisplay.textContent = currentScoreMultiplier.toFixed(1); }}
function resetCombo() { /* ... (이전 답변과 동일) ... */ if (currentComboCount > 0) { console.log(`Combo reset from ${currentComboCount}. Multiplier was x${currentScoreMultiplier.toFixed(1)}`); } currentComboCount = 0; currentScoreMultiplier = 1.0; if (comboResetTimer) { clearTimeout(comboResetTimer); comboResetTimer = null; } updateComboDisplay(); }

// --- 게임 루프 및 핵심 로직 (디버깅 로그 추가됨) ---
function gameLoop() { 
    console.log("gameLoop running, frame:", frameCount, "gameOver:", gameOver, "isFrozen:", isFrozen); 
    if (gameOver) {
        console.log("gameLoop: gameOver is true. Calling cancelAnimationFrame and showGameOverScreen."); 
        cancelAnimationFrame(animationFrameId); 
        showGameOverScreen(); 
        isGoldRushActive = false; isFrozen = false; resetCombo(); 
        return; 
    }
    if (!canvas || canvas.width === 0 || canvas.height === 0) { 
        console.warn("gameLoop: Canvas not ready or zero size. Requesting next frame.");
        animationFrameId = requestAnimationFrame(gameLoop); // 루프는 계속 시도
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    frameCount++;

    if (isFrozen && Date.now() > frozenEndTime) { isFrozen = false; console.log("Unfrozen!"); }
    if (isGoldRushActive) {
         if (Date.now() > goldRushEndTime) { isGoldRushActive = false; console.log("Gold Rush Ended!"); }
         else { if (frameCount % 10 === 0) { for(let i=0; i < 2; i++) { spawnVillain(true); }}}
     }
    villains.forEach((villain, index) => {
        villain.update();
        if (villain.y - villain.radius > canvas.height && !villain.sliced) {
            villains.splice(index, 1);
            if (!gameOver) {
                if (!isGoldRushActive) { 
                    lives--; currentGameStats.livesLost++; 
                    livesDisplay.textContent = lives; resetCombo(); 
                    if (lives <= 0) gameOver = true;
                } else { console.log("Missed a coin during Gold Rush - no life lost."); }
            }
        }
    });
    updateAndDrawParticles(particles); updateAndDrawParticles(sliceParticles); drawSliceTrail();
    
    // 테스트용 사각형 그리기 (이전 답변에서 제안)
    // ctx.fillStyle = 'red'; 
    // ctx.fillRect(10, 10, 150, 50); 
    // ctx.fillStyle = 'white'; 
    // ctx.font = "16px 'Press Start 2P'";
    // ctx.fillText(`Villains: ${villains.length}`, 15, 30); 
    // ctx.fillText(`Frame: ${frameCount}`, 15, 50);   

    animationFrameId = requestAnimationFrame(gameLoop);
}
function getEventPosition(event) { /* ... (이전 답변과 동일) ... */ const rect = canvas.getBoundingClientRect(); const clientX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX; const clientY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY; return { x: clientX - rect.left, y: clientY - rect.top };}

function startSlicing(event) { /* ... (이전 답변과 동일) ... */ 
    if (isFrozen || gameOver) return; 
    if (event.type.startsWith('touch')) event.preventDefault();
    isSlicing = true; const pos = getEventPosition(event); 
    currentSlicePath = [pos]; sliceTrail = [{...pos, alpha: 1}];
}
function continueSlicing(event) { /* ... (이전 답변과 동일) ... */ 
    if (isFrozen || !isSlicing || gameOver) return; 
    if (event.type.startsWith('touch')) event.preventDefault();
    const pos = getEventPosition(event); currentSlicePath.push(pos); 
    if (sliceTrail.length > SLICE_TRAIL_MAX_POINTS) sliceTrail.shift(); 
    sliceTrail.push({...pos, alpha: 1}); 
    if (Math.random() < 0.5) sliceParticles.push(new SliceParticle(pos.x, pos.y));
}
function endSlicing(event) { /* ... (이전 답변과 동일) ... */
    if (!isSlicing || gameOver) { isSlicing = false; currentSlicePath = []; return; }
    const wasFrozen = isFrozen; isSlicing = false; 
    if (!wasFrozen && currentSlicePath.length >= MIN_SLICE_POINTS) { checkSliceCollisions(); }
    currentSlicePath = [];
 }

function isLineIntersectingCircle(p1, p2, circleCenter, radius) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;

    // 선분이 점일 경우 (p1과 p2가 같은 위치)
    if (lenSq === 0) {
        // p1(또는 p2)과 circleCenter 사이의 거리를 확인
        return Math.hypot(p1.x - circleCenter.x, p1.y - circleCenter.y) < radius;
    }

    // t는 (circleCenter - p1) 벡터를 (p2 - p1) 벡터에 투영한 값 (0과 1 사이로 정규화됨)
    let t = ((circleCenter.x - p1.x) * dx + (circleCenter.y - p1.y) * dy) / lenSq;
    
    // t 값을 0과 1 사이로 제한하여 선분 내의 가장 가까운 점을 찾도록 함
    t = Math.max(0, Math.min(1, t));

    // 선분 위의 가장 가까운 점의 좌표
    const closestX = p1.x + t * dx;
    const closestY = p1.y + t * dy;

    // 이 가장 가까운 점과 circleCenter 사이의 거리를 확인
    return Math.hypot(circleCenter.x - closestX, circleCenter.y - closestY) < radius;
}

function checkSliceCollisions() { /* ... (이전 답변과 동일) ... */
    let slicedAnythingThisSwipe = false; let pointsEarnedThisSwipe = 0; let villainsSlicedInThisSwipe = 0;
    for (let i = villains.length - 1; i >= 0; i--) {
        const villain = villains[i]; if (villain.sliced) continue;
        for (let j = 0; j < currentSlicePath.length - 1; j++) {
            const p1 = currentSlicePath[j], p2 = currentSlicePath[j + 1];
            if (isLineIntersectingCircle(p1, p2, {x: villain.x, y: villain.y}, villain.radius)) {
                villain.sliced = true; slicedAnythingThisSwipe = true; villainsSlicedInThisSwipe++;
                if (villain.isBombCoin) {
                    console.log("Bomb Sliced!"); currentGameStats.bombsSlashed++; 
                    if (!gameOver) { lives--; currentGameStats.livesLost++; livesDisplay.textContent = lives; for (let k = 0; k < 30; k++) particles.push(new Particle(villain.x, villain.y, 'orangered', villain.radius / 10)); if (lives <= 0) gameOver = true; }
                    resetCombo(); pointsEarnedThisSwipe = 0; break; 
                } else if (villain.isIceCoin) { 
                    console.log("Ice Coin Sliced!"); isFrozen = true; frozenEndTime = Date.now() + FROZEN_DURATION;
                    pointsEarnedThisSwipe += 5; resetCombo(); 
                } else { 
                    for (let k = 0; k < 20; k++) particles.push(new Particle(villain.x, villain.y, villain.originalColor, villain.radius / 20));
                    currentComboCount++; 
                    let multiplierLevel = Math.floor((currentComboCount -1) / COMBO_THRESHOLD); 
                    currentScoreMultiplier = 1.0 + (multiplierLevel * COMBO_MULTIPLIER_INCREMENT);
                    if (MAX_COMBO_MULTIPLIER > 0) { currentScoreMultiplier = Math.min(currentScoreMultiplier, MAX_COMBO_MULTIPLIER); }
                    updateComboDisplay(); let coinBaseScore = BASE_COIN_SCORE; 
                    if (villain.isGoldRushCoin || villain.isLifeBonusCoin) { 
                        currentGameStats.specialPositiveCoinsSlashed++; 
                        if (villain.isGoldRushCoin) {
                            coinBaseScore = 50; 
                            if (!isGoldRushActive) { isGoldRushActive = true; goldRushEndTime = Date.now() + GOLD_RUSH_DURATION; console.log("Gold Rush Activated! Ends at: ", new Date(goldRushEndTime).toLocaleTimeString()); }
                        } else if (villain.isLifeBonusCoin) { 
                            coinBaseScore = 20; 
                            if (lives < MAX_LIVES) { lives++; livesDisplay.textContent = lives; console.log("Life Gained! Current lives:", lives); }
                            else { console.log("Sliced Life Bonus Coin, but lives are already full."); coinBaseScore += 30; }
                        }
                    }
                    pointsEarnedThisSwipe += Math.round(coinBaseScore * currentScoreMultiplier);
                }
                break; 
            }
        }
        if (villain.isBombCoin && villain.sliced) break; 
    }
    if (villainsSlicedInThisSwipe > currentGameStats.maxCoinsInSingleSwipe) { 
        currentGameStats.maxCoinsInSingleSwipe = villainsSlicedInThisSwipe;
    }
    if (pointsEarnedThisSwipe > 0) { score += pointsEarnedThisSwipe; scoreDisplay.textContent = score; }
    villains = villains.filter(v => !v.sliced);
    if (slicedAnythingThisSwipe && !gameOver && !isFrozen) { if (comboResetTimer) clearTimeout(comboResetTimer); comboResetTimer = setTimeout(resetCombo, COMBO_RESET_DELAY); }
}

function startGame() {
    console.log("startGame() function called"); 
    score = 0; lives = 3; villains = []; particles = []; sliceParticles = [];
    sliceTrail = []; currentSlicePath = []; 
    gameOver = false; 
    console.log("gameOver flag set to:", gameOver); 
    isSlicing = false; gameSpeed = 1;
    isGoldRushActive = false; goldRushEndTime = 0; frameCount = 0; 
    isFrozen = false; frozenEndTime = 0;
    
    resetCurrentGameStats(); 
    resetCombo(); 
    updateComboDisplay(); 
    scoreDisplay.textContent = score; 
    livesDisplay.textContent = lives;

    if(questCompletionMessagesDiv) questCompletionMessagesDiv.innerHTML = ""; 
    
    showScreen(gameContainer); 
    console.log("showScreen(gameContainer) called"); 
    
    requestAnimationFrame(() => { 
        resizeCanvas(); // ⭐️ gameContainer가 표시된 후 호출
        if (window.villainSpawnInterval) clearInterval(window.villainSpawnInterval);
        window.villainSpawnInterval = setInterval(() => { if (!isGoldRushActive) { spawnVillain(); }}, Math.max(250, 750 - score * 1.5));
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(gameLoop);
        console.log("New animationFrameId requested for gameLoop.");
    });
    console.log("Game Started logic initiated!");
}

function showGameOverScreen() { 
    console.log("showGameOverScreen() called. Final score:", score); 
    if(finalScoreDisplay) finalScoreDisplay.textContent = score; 
    else console.warn("finalScoreDisplay element not found!");
    console.log("finalScoreDisplay updated."); 

    currentGameStats.score = score; 
    checkAndAwardQuests(); 
    console.log("checkAndAwardQuests() completed."); 

    showScreen(gameOverScreen); 
    console.log("#gameOverScreen should be visible now. Check its style in Elements tab if not visible."); 
    
    if (window.villainSpawnInterval) clearInterval(window.villainSpawnInterval);
    isGoldRushActive = false; isFrozen = false; resetCombo(); 
    
    try { 
        if (WebApp && WebApp.sendData) { 
            console.log("Attempting to send score to Telegram:", score); 
            const scoreDataString = String(score); 
            WebApp.sendData(scoreDataString); 
            console.log("Score sent to Telegram successfully:", scoreDataString); 
        } else { console.error("Telegram WebApp API is not available or sendData is not defined."); }
    } catch (e) { console.error("Error sending data to Telegram:", e); }
    console.log("showGameOverScreen() finished."); 
}

// --- 이벤트 리스너 ---
// DOM 요소들이 로드된 후에 이벤트 리스너를 추가하는 것이 안전합니다.
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed. Setting up event listeners and initial state.");

    if(canvas) {
        canvas.addEventListener('mousedown', startSlicing); 
        canvas.addEventListener('mousemove', continueSlicing);
        canvas.addEventListener('mouseup', endSlicing);
        canvas.addEventListener('mouseleave', endSlicing);
        canvas.addEventListener('touchstart', startSlicing, { passive: false });
        canvas.addEventListener('touchmove', continueSlicing, { passive: false });
        canvas.addEventListener('touchend', endSlicing);
        canvas.addEventListener('touchcancel', endSlicing);
    } else {
        console.error("Canvas element not found for attaching event listeners.");
    }

    if (playGameButton) { 
        playGameButton.addEventListener('click', () => {
            console.log("Main Home Screen 'Play Game' button clicked!");
            startGame(); 
        });
    }
    if (startButton) { 
        startButton.addEventListener('click', () => {
            console.log("Old Start Screen 'Start Game' button clicked!");
            startGame();
        });
    }
    if(restartButton) {
        restartButton.addEventListener('click', () => { 
            console.log("Restart button clicked!");
            startGame();
        });
    }
    if (mainHomeButton) { 
        mainHomeButton.addEventListener('click', () => {
            console.log("Game Over 'Home' button clicked!");
            if(questCompletionMessagesDiv) questCompletionMessagesDiv.innerHTML = ""; 
            showScreen(mainHomeScreen); 
        }); 
    }
    if (questsButton) { questsButton.addEventListener('click', () => { alert("Quests coming soon!"); });}
    if (shopButton) { shopButton.addEventListener('click', () => { alert("Shop coming soon!"); });}

    window.addEventListener('resize', resizeCanvas);

    // --- 초기화 ---
    loadData(); 
    updateComboDisplay(); 
    showScreen(mainHomeScreen); 
    resizeCanvas(); // DOM 로드 후, 홈 화면이 표시된 상태에서 호출
});
