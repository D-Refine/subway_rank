// --- DOM 요소 참조 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// ... (기존 scoreDisplay, livesDisplay 등 참조는 동일)
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const comboCountDisplay = document.getElementById('comboCountDisplay');
const comboMultiplierDisplay = document.getElementById('comboMultiplierDisplay');

// ⭐️ 새로운 화면 및 UI 요소 참조
const mainHomeScreen = document.getElementById('mainHomeScreen');
const playGameButton = document.getElementById('playGameButton'); // 메인 홈의 플레이 버튼
const questsButton = document.getElementById('questsButton');     // 메인 홈의 퀘스트 버튼
const shopButton = document.getElementById('shopButton');       // 메인 홈의 샵 버튼
const gemBalanceDisplaySpan = document.querySelector('#gemBalanceDisplay span'); // 젬 표시 span
const questCompletionMessagesDiv = document.getElementById('questCompletionMessages');

const startScreen = document.getElementById('startScreen'); // 기존 시작 화면
const startButton = document.getElementById('startButton'); // 기존 시작 화면의 시작 버튼

const gameContainer = document.getElementById('gameContainer');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const mainHomeButton = document.getElementById('mainHomeButton'); // 게임오버 화면의 홈 버튼

const WebApp = window.Telegram.WebApp;
WebApp.ready();

// --- 게임 상태 변수 ---
// ... (기존 score, lives 등 변수는 동일)
let score = 0;
let lives = 3;
let gameSpeed = 1;
let villains = [];
let particles = [];
let sliceParticles = [];
let gameOver = true; // 초기에는 게임오버 상태 (메인 홈 표시)
let animationFrameId;
let isSlicing = false;
let currentSlicePath = [];
let sliceTrail = [];
const SLICE_TRAIL_MAX_POINTS = 30;
const SLICE_TRAIL_FADE_SPEED = 0.08;
const MIN_SLICE_POINTS = 2;
let isGoldRushActive = false;
let goldRushEndTime = 0;
const GOLD_RUSH_DURATION = 3000; 
let goldRushCoinColor = 'gold';   
let frameCount = 0;               
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

// --- ⭐️ 젬 및 퀘스트 관련 변수 ---
let playerGems = 0;
const quests = {
    q1_beginner_slasher: {
        id: 'q1_beginner_slasher', name: "Beginner Slasher",
        description: "Reach 1,000 points in a single game.", reward: 10, isCompleted: false,
        conditionMet: (stats) => stats.score >= 1000
    },
    q2_coin_collector: {
        id: 'q2_coin_collector', name: "Coin Collector",
        description: "Slash 25 special positive coins in a single game.", reward: 20, isCompleted: false,
        conditionMet: (stats) => stats.specialPositiveCoinsSlashed >= 25
    },
    q3_perfect_slash: {
        id: 'q3_perfect_slash', name: "Perfect Slash",
        description: "Slash 10+ coins in a single swipe.", reward: 20, isCompleted: false,
        conditionMet: (stats) => stats.maxCoinsInSingleSwipe >= 10
    },
    q4_survival_expert: {
        id: 'q4_survival_expert', name: "Survival Expert",
        description: "Reach 3,000 points without losing a life.", reward: 50, isCompleted: false,
        conditionMet: (stats) => stats.score >= 3000 && stats.livesLost === 0
    },
    q5_bomb_dodger: {
        id: 'q5_bomb_dodger', name: "Bomb Dodger",
        description: "Reach 3,000 points without slashing any Bomb Coins.", reward: 50, isCompleted: false,
        conditionMet: (stats) => stats.score >= 3000 && stats.bombsSlashed === 0
    }
};
let currentGameStats = {}; // 현재 게임 세션 동안의 통계 기록

// --- ⭐️ 데이터 저장/로드 함수 (localStorage 사용) ---
function saveData() {
    localStorage.setItem('rankingSlasher_gems', playerGems.toString());
    // 퀘스트 완료 상태만 저장
    const completedQuestsStatus = {};
    for (const questId in quests) {
        completedQuestsStatus[questId] = quests[questId].isCompleted;
    }
    localStorage.setItem('rankingSlasher_quests', JSON.stringify(completedQuestsStatus));
    console.log("Data saved:", {gems: playerGems, quests: completedQuestsStatus});
}

function loadData() {
    const savedGems = localStorage.getItem('rankingSlasher_gems');
    if (savedGems !== null) {
        playerGems = parseInt(savedGems, 10);
    } else {
        playerGems = 0; // 기본값
    }

    const savedQuestsStatus = localStorage.getItem('rankingSlasher_quests');
    if (savedQuestsStatus) {
        const completedStatus = JSON.parse(savedQuestsStatus);
        for (const questId in quests) {
            if (completedStatus.hasOwnProperty(questId)) {
                quests[questId].isCompleted = completedStatus[questId];
            }
        }
    }
    updateGemDisplay();
    console.log("Data loaded:", {gems: playerGems, quests});
}

// --- ⭐️ UI 업데이트 함수 ---
function updateGemDisplay() {
    if (gemBalanceDisplaySpan) {
        gemBalanceDisplaySpan.textContent = playerGems;
    }
}

function showScreen(screenToShow) {
    // 모든 화면 숨기기
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('show'));
    // 요청된 화면만 보이기
    if (screenToShow) {
        screenToShow.classList.add('show');
    }
}

// --- ⭐️ 게임 통계 및 퀘스트 로직 함수 ---
function resetCurrentGameStats() {
    currentGameStats = {
        score: 0, // 게임 점수는 전역 score 변수 사용 예정
        specialPositiveCoinsSlashed: 0,
        maxCoinsInSingleSwipe: 0,
        livesLost: 0,
        bombsSlashed: 0
    };
}

function checkAndAwardQuests() {
    let questMessagesHtml = "";
    let newGemsEarned = 0;

    // 현재 게임 점수를 currentGameStats에 반영
    currentGameStats.score = score; 

    for (const questId in quests) {
        const quest = quests[questId];
        if (!quest.isCompleted && quest.conditionMet(currentGameStats)) {
            quest.isCompleted = true;
            playerGems += quest.reward;
            newGemsEarned += quest.reward;
            const message = `🏆 Quest Complete: ${quest.name} (+${quest.reward} Gems!)`;
            console.log(message);
            questMessagesHtml += `<p>${message}</p>`;
        }
    }
    if (questCompletionMessagesDiv) {
        questCompletionMessagesDiv.innerHTML = questMessagesHtml;
    }
    if (newGemsEarned > 0) {
        updateGemDisplay();
        saveData(); // 퀘스트 완료 및 젬 변경 사항 저장
    }
}


// --- 기존 게임 로직 함수들 (resizeCanvas, Villain, spawnVillain 등) ---
// (Villain, spawnVillain, Particle, SliceParticle, updateAndDrawParticles, drawSliceTrail, 
//  updateComboDisplay, resetCombo, getEventPosition, startSlicing, continueSlicing, endSlicing,
//  isLineIntersectingCircle 함수들은 이전 답변과 동일하게 유지됩니다. 내용이 길어 생략합니다.)
// (단, 이 함수들 내에서 currentGameStats를 업데이트 하는 로직이 추가되어야 합니다.)

class Villain { /* ... 이전 답변의 Villain 클래스 코드 전체 ... */ 
    constructor(x, y, radius, color, velocity, isGoldRush = false, isLifeBonus = false, isBomb = false, isIce = false) {
        this.x = x; this.y = y; this.radius = radius; this.originalColor = color; 
        this.velocity = velocity; this.sliced = false; this.gravity = 0.05 * (canvas.height / 800); 
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
function spawnVillain(forceNormal = false) {
    if (gameOver && !isGoldRushActive) return; if (isGoldRushActive && Date.now() > goldRushEndTime) { isGoldRushActive = false; console.log("Gold Rush ended during spawn attempt."); return; }
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
class Particle { constructor(x, y, color, sizeMultiplier = 1) { this.x = x; this.y = y; this.size = (Math.random() * 3 + 2) * sizeMultiplier; this.color = color; this.velocity = { x: (Math.random() - 0.5) * (Math.random() * 8), y: (Math.random() - 0.5) * (Math.random() * 8) }; this.alpha = 1; this.friction = 0.97; this.gravity = 0.1;} draw() { ctx.save(); ctx.globalAlpha = this.alpha; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); ctx.restore(); } update() { this.velocity.x *= this.friction; this.velocity.y *= this.friction; this.velocity.y += this.gravity; this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= 0.03; if (this.alpha > 0) this.draw(); }}
class SliceParticle { constructor(x, y) { this.x = x; this.y = y; this.size = Math.random() * 2 + 1; this.color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`; this.velocity = { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 }; this.alpha = 1; } draw() { ctx.save(); ctx.globalAlpha = this.alpha; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); ctx.restore(); } update() { this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= 0.05; if (this.alpha > 0) this.draw(); }}
function updateAndDrawParticles(particleArray) { for (let i = particleArray.length - 1; i >= 0; i--) { particleArray[i].update(); if (particleArray[i].alpha <= 0) particleArray.splice(i, 1); }}
function drawSliceTrail() { if (sliceTrail.length < 2) return; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (let i = 1; i < sliceTrail.length; i++) { const p1 = sliceTrail[i-1], p2 = sliceTrail[i]; const age = (i / sliceTrail.length), alpha = Math.max(0, (1 - age) * 0.8); const lineWidth = Math.max(1, (1 - age) * (canvas.width * 0.03)); if (alpha <= 0 || lineWidth <= 0) continue; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); const trailGradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y); trailGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`); trailGradient.addColorStop(0.5, `rgba(139, 227, 255, ${alpha * 0.6})`); trailGradient.addColorStop(1, `rgba(74, 222, 128, ${alpha * 0.4})`); ctx.strokeStyle = trailGradient; ctx.lineWidth = lineWidth; ctx.shadowColor = `rgba(139, 227, 255, ${alpha * 0.7})`; ctx.shadowBlur = lineWidth * 1.5; ctx.stroke(); } ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; if (sliceTrail.length > 0) { sliceTrail.forEach(p => p.alpha = (p.alpha || 1) - SLICE_TRAIL_FADE_SPEED); sliceTrail = sliceTrail.filter(p => p.alpha > 0); }}
function updateComboDisplay() { if(comboCountDisplay && comboMultiplierDisplay) { comboCountDisplay.textContent = currentComboCount; comboMultiplierDisplay.textContent = currentScoreMultiplier.toFixed(1); }}
function resetCombo() { if (currentComboCount > 0) { console.log(`Combo reset from ${currentComboCount}. Multiplier was x${currentScoreMultiplier.toFixed(1)}`); } currentComboCount = 0; currentScoreMultiplier = 1.0; if (comboResetTimer) { clearTimeout(comboResetTimer); comboResetTimer = null; } updateComboDisplay(); }


function gameLoop() {
    if (gameOver) {
        cancelAnimationFrame(animationFrameId); showGameOverScreen(); 
        isGoldRushActive = false; isFrozen = false; 
        resetCombo(); 
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height); frameCount++;
    if (isFrozen && Date.now() > frozenEndTime) {
        isFrozen = false; console.log("Unfrozen!");
    }
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
                    lives--; 
                    currentGameStats.livesLost++; // ⭐️ 목숨 잃음 기록
                    livesDisplay.textContent = lives;
                    resetCombo(); 
                    if (lives <= 0) gameOver = true;
                } else {
                    console.log("Missed a coin during Gold Rush - no life lost.");
                }
            }
        }
    });
    updateAndDrawParticles(particles); updateAndDrawParticles(sliceParticles); drawSliceTrail();
    animationFrameId = requestAnimationFrame(gameLoop);
}
function getEventPosition(event) { const rect = canvas.getBoundingClientRect(); const clientX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX; const clientY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY; return { x: clientX - rect.left, y: clientY - rect.top };}

function startSlicing(event) {
    if (isFrozen || gameOver) return; 
    if (event.type.startsWith('touch')) event.preventDefault();
    isSlicing = true; const pos = getEventPosition(event); 
    currentSlicePath = [pos]; sliceTrail = [{...pos, alpha: 1}];
}
function continueSlicing(event) {
    if (isFrozen || !isSlicing || gameOver) return; 
    if (event.type.startsWith('touch')) event.preventDefault();
    const pos = getEventPosition(event); currentSlicePath.push(pos); 
    if (sliceTrail.length > SLICE_TRAIL_MAX_POINTS) sliceTrail.shift(); 
    sliceTrail.push({...pos, alpha: 1}); 
    if (Math.random() < 0.5) sliceParticles.push(new SliceParticle(pos.x, pos.y));
}
function endSlicing(event) {
    if (!isSlicing || gameOver) {
         isSlicing = false;
         currentSlicePath = []; 
         return;
    }
    const wasFrozen = isFrozen; 
    isSlicing = false; 
    if (!wasFrozen && currentSlicePath.length >= MIN_SLICE_POINTS) { 
        checkSliceCollisions();
    }
    currentSlicePath = [];
}
function isLineIntersectingCircle(p1, p2, circleCenter, radius) { const dx = p2.x - p1.x, dy = p2.y - p1.y, lenSq = dx * dx + dy * dy; if (lenSq === 0) return Math.hypot(p1.x - circleCenter.x, p1.y - circleCenter.y) < radius; let t = ((circleCenter.x - p1.x) * dx + (circleCenter.y - p1.y) * dy) / lenSq; t = Math.max(0, Math.min(1, t)); const closestX = p1.x + t * dx, closestY = p1.y + t * dy; return Math.hypot(circleCenter.x - closestX, circleCenter.y - closestY) < radius;}

function checkSliceCollisions() {
    let slicedAnythingThisSwipe = false; 
    let pointsEarnedThisSwipe = 0;     
    let villainsSlicedInThisSwipe = 0; // ⭐️ 한 번의 스와이프로 몇 개를 베었는지 카운트

    for (let i = villains.length - 1; i >= 0; i--) {
        const villain = villains[i];
        if (villain.sliced) continue;
        for (let j = 0; j < currentSlicePath.length - 1; j++) {
            const p1 = currentSlicePath[j], p2 = currentSlicePath[j + 1];
            if (isLineIntersectingCircle(p1, p2, {x: villain.x, y: villain.y}, villain.radius)) {
                villain.sliced = true;
                slicedAnythingThisSwipe = true; 
                villainsSlicedInThisSwipe++; // ⭐️ 스와이프로 벤 악당 수 증가
                
                if (villain.isBombCoin) {
                    console.log("Bomb Sliced!");
                    currentGameStats.bombsSlashed++; // ⭐️ 폭탄 벰 기록
                    if (!gameOver) { 
                        lives--; currentGameStats.livesLost++; livesDisplay.textContent = lives;
                        for (let k = 0; k < 30; k++) particles.push(new Particle(villain.x, villain.y, 'orangered', villain.radius / 10));
                        if (lives <= 0) gameOver = true;
                    }
                    resetCombo(); 
                    pointsEarnedThisSwipe = 0; 
                    break; 
                } else if (villain.isIceCoin) { 
                    console.log("Ice Coin Sliced!");
                    isFrozen = true; frozenEndTime = Date.now() + FROZEN_DURATION;
                    pointsEarnedThisSwipe += 5; 
                    resetCombo(); 
                } else { 
                    for (let k = 0; k < 20; k++) particles.push(new Particle(villain.x, villain.y, villain.originalColor, villain.radius / 20));
                    currentComboCount++; 
                    let multiplierLevel = Math.floor((currentComboCount -1) / COMBO_THRESHOLD); 
                    currentScoreMultiplier = 1.0 + (multiplierLevel * COMBO_MULTIPLIER_INCREMENT);
                    if (MAX_COMBO_MULTIPLIER > 0) { 
                        currentScoreMultiplier = Math.min(currentScoreMultiplier, MAX_COMBO_MULTIPLIER);
                    }
                    updateComboDisplay(); 
                    let coinBaseScore = BASE_COIN_SCORE; 
                    if (villain.isGoldRushCoin || villain.isLifeBonusCoin) { // ⭐️ 긍정적 특수 코인
                        currentGameStats.specialPositiveCoinsSlashed++;
                        if (villain.isGoldRushCoin) {
                            coinBaseScore = 50; 
                            if (!isGoldRushActive) {
                                isGoldRushActive = true; goldRushEndTime = Date.now() + GOLD_RUSH_DURATION;
                                console.log("Gold Rush Activated! Ends at: ", new Date(goldRushEndTime).toLocaleTimeString());
                            }
                        } else if (villain.isLifeBonusCoin) { 
                            coinBaseScore = 20; 
                            if (lives < MAX_LIVES) {
                                lives++; livesDisplay.textContent = lives; console.log("Life Gained! Current lives:", lives);
                            } else {
                                console.log("Sliced Life Bonus Coin, but lives are already full.");
                                coinBaseScore += 30; 
                            }
                        }
                    }
                    pointsEarnedThisSwipe += Math.round(coinBaseScore * currentScoreMultiplier);
                }
                break; 
            }
        }
        if (villain.isBombCoin && villain.sliced) break; 
    }
    
    // ⭐️ 한 번의 스와이프로 벤 악당 수 기록 업데이트 (Perfect Slash 퀘스트용)
    if (villainsSlicedInThisSwipe > currentGameStats.maxCoinsInSingleSwipe) {
        currentGameStats.maxCoinsInSingleSwipe = villainsSlicedInThisSwipe;
    }

    if (pointsEarnedThisSwipe > 0) {
        score += pointsEarnedThisSwipe;
        scoreDisplay.textContent = score;
    }
    villains = villains.filter(v => !v.sliced);
    if (slicedAnythingThisSwipe && !gameOver && !isFrozen) { 
        if (comboResetTimer) clearTimeout(comboResetTimer);
        comboResetTimer = setTimeout(resetCombo, COMBO_RESET_DELAY);
    }
}

function startGame() {
    score = 0; lives = 3; villains = []; particles = []; sliceParticles = [];
    sliceTrail = []; currentSlicePath = []; 
    gameOver = false; // ⭐️ 게임 시작 시 gameOver는 false
    isSlicing = false; gameSpeed = 1;
    isGoldRushActive = false; goldRushEndTime = 0; frameCount = 0; 
    isFrozen = false; frozenEndTime = 0;
    
    resetCurrentGameStats(); // ⭐️ 현재 게임 통계 초기화
    resetCombo(); 
    updateComboDisplay(); 
    scoreDisplay.textContent = score; livesDisplay.textContent = lives;

    // 모든 화면 숨기고 게임 컨테이너만 보이기
    showScreen(gameContainer);
    // startScreen.classList.remove('show'); // 기존 시작화면은 이제 사용 안 함 (또는 필요시 다른 용도로)
    // gameOverScreen.classList.remove('show');
    // mainHomeScreen.classList.remove('show');


    if (window.villainSpawnInterval) clearInterval(window.villainSpawnInterval);
    window.villainSpawnInterval = setInterval(() => { if (!isGoldRushActive) { spawnVillain(); }}, Math.max(250, 750 - score * 1.5));
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

function showGameOverScreen() {
    finalScoreDisplay.textContent = score; 
    
    // ⭐️ 게임 오버 시 현재 게임 점수도 통계에 반영
    currentGameStats.score = score;
    checkAndAwardQuests(); // ⭐️ 퀘스트 달성 확인 및 보상 지급

    showScreen(gameOverScreen); // 게임 오버 화면 표시
    
    if (window.villainSpawnInterval) clearInterval(window.villainSpawnInterval);
    isGoldRushActive = false; isFrozen = false; 
    resetCombo(); 
    try { 
        if (WebApp && WebApp.sendData) { 
            console.log("Attempting to send score to Telegram:", score); 
            const scoreDataString = String(score); // 리더보드에는 순수 게임 점수만 전송
            WebApp.sendData(scoreDataString); 
            console.log("Score sent to Telegram successfully:", scoreDataString); 
        }
        else { console.error("Telegram WebApp API is not available or sendData is not defined."); }
    } catch (e) { console.error("Error sending data to Telegram:", e); }
}

// --- 이벤트 리스너 ---
canvas.addEventListener('mousedown', startSlicing); 
canvas.addEventListener('mousemove', continueSlicing);
canvas.addEventListener('mouseup', endSlicing);
canvas.addEventListener('mouseleave', endSlicing);
canvas.addEventListener('touchstart', startSlicing, { passive: false });
canvas.addEventListener('touchmove', continueSlicing, { passive: false });
canvas.addEventListener('touchend', endSlicing);
canvas.addEventListener('touchcancel', endSlicing);

// ⭐️ 메인 홈 화면의 "Play Game" 버튼
if (playGameButton) {
    playGameButton.addEventListener('click', () => {
        resizeCanvas(); 
        startGame();
    });
}

// 기존 startButton (startScreen 내부)의 이벤트 리스너도 유지 (만약 startScreen을 다른 용도로 쓴다면)
if (startButton) {
    startButton.addEventListener('click', () => {
        resizeCanvas(); 
        startGame();
    });
}

restartButton.addEventListener('click', () => { 
    // 게임 오버 화면에서 재시작 시, 바로 게임 시작
    resizeCanvas(); 
    startGame();
});

// ⭐️ 게임 오버 화면의 "Home" 버튼 -> 메인 홈 화면으로
if (mainHomeButton) { 
    mainHomeButton.addEventListener('click', () => {
        showScreen(mainHomeScreen); // 메인 홈 화면 표시
    });
}

// (미래 기능) 퀘스트, 상점 버튼 리스너
if (questsButton) {
    questsButton.addEventListener('click', () => {
        alert("Quests coming soon!"); // 임시 알림
        // 여기에 나중에 퀘스트 화면을 보여주는 로직 추가
    });
}
if (shopButton) {
    shopButton.addEventListener('click', () => {
        alert("Shop coming soon!"); // 임시 알림
        // 여기에 나중에 상점 화면을 보여주는 로직 추가
    });
}

window.addEventListener('resize', resizeCanvas);

// --- 초기화 ---
loadData(); // ⭐️ 페이지 로드 시 저장된 젬과 퀘스트 상태 불러오기
resizeCanvas();
updateComboDisplay(); 
showScreen(mainHomeScreen); // ⭐️ 페이지 로드 시 메인 홈 화면 표시
