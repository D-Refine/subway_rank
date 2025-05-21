const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameContainer = document.getElementById('gameContainer');
const homeButton = document.getElementById('homeButton');

const WebApp = window.Telegram.WebApp;
WebApp.ready();

let score = 0;
let lives = 3;
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

let isGoldRushActive = false;
let goldRushEndTime = 0;
const GOLD_RUSH_DURATION = 3000; 
let goldRushCoinColor = 'gold';   
let frameCount = 0;               

const MAX_LIVES = 3; 
let lifeBonusCoinColor = 'lightpink'; 

function resizeCanvas() {
    const containerRect = gameContainer.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
}

class Villain {
    constructor(x, y, radius, color, velocity, isGoldRush = false, isLifeBonus = false) {
        this.x = x; this.y = y; this.radius = radius;
        this.originalColor = color; 
        this.velocity = velocity; this.sliced = false;
        this.gravity = 0.05 * (canvas.height / 800); this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1; this.spawnTime = Date.now();
        this.isGoldRushCoin = isGoldRush;
        this.isLifeBonusCoin = isLifeBonus;

        if (this.isGoldRushCoin) {
            this.color = goldRushCoinColor;
        } else if (this.isLifeBonusCoin) {
            this.color = lifeBonusCoinColor;
        } else {
            this.color = color; 
        }
    }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        const timeSinceSpawn = Date.now() - this.spawnTime;
        const scale = Math.min(1, timeSinceSpawn / 200); ctx.scale(scale, scale);
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2, false);
        
        const gradient = ctx.createRadialGradient(0, 0, this.radius * 0.1, 0, 0, this.radius);
        if (this.isGoldRushCoin) {
            gradient.addColorStop(0, 'rgba(255, 255, 150, 0.9)');
            gradient.addColorStop(0.6, this.color); 
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0.5)');
            ctx.shadowColor = 'yellow'; ctx.shadowBlur = 15;
        } else if (this.isLifeBonusCoin) { 
            gradient.addColorStop(0, 'rgba(255, 182, 193, 0.9)'); 
            gradient.addColorStop(0.5, this.color); 
            gradient.addColorStop(1, 'rgba(255, 105, 180, 0.7)'); 
            ctx.shadowColor = 'deeppink'; ctx.shadowBlur = 15;
        } else { 
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.6, this.originalColor); 
            gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
        }
        ctx.fillStyle = gradient; ctx.fill();
        
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = this.radius * 0.05; ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.font = `bold ${this.radius * 0.7}px 'Press Start 2P'`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        let symbol = '$'; 
        if (this.isGoldRushCoin) symbol = '★';
        else if (this.isLifeBonusCoin) symbol = '♥'; 
        ctx.fillText(symbol, 0, this.radius * 0.05); 

        ctx.restore();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    }
    update() {
        this.x += this.velocity.x * gameSpeed; this.y += this.velocity.y * gameSpeed;
        this.velocity.y += this.gravity * gameSpeed; this.rotation += this.rotationSpeed * gameSpeed;
        if (!this.sliced) this.draw();
    }
}

function spawnVillain(forceNormal = false) {
    if (gameOver && !isGoldRushActive) return;
    if (isGoldRushActive && Date.now() > goldRushEndTime) {
         isGoldRushActive = false; console.log("Gold Rush ended during spawn attempt."); return;
    }

    const radius = Math.random() * (canvas.width * 0.04) + (canvas.width * 0.055);
    const side = Math.floor(Math.random() * 3); let x, y; let velocityX, velocityY;
    const speedMultiplier = canvas.height / 800;
    if (side === 0) { 
        x = 0 - radius; y = Math.random() * (canvas.height * 0.6) + (canvas.height * 0.2);
        velocityX = (Math.random() * 1.5 + 1.5) * speedMultiplier; velocityY = (Math.random() * -2.5 - 3.5) * speedMultiplier;
    } else if (side === 1) { 
        x = Math.random() * (canvas.width - radius * 2) + radius; y = canvas.height + radius;
        velocityX = (Math.random() - 0.5) * 3 * speedMultiplier; velocityY = (Math.random() * -2.5 - 5.5) * speedMultiplier;
    } else { 
        x = canvas.width + radius; y = Math.random() * (canvas.height * 0.6) + (canvas.height * 0.2);
        velocityX = (Math.random() * -1.5 - 1.5) * speedMultiplier; velocityY = (Math.random() * -2.5 - 3.5) * speedMultiplier;
    }
    
    let isThisAGoldRushCoin = false;
    let isThisAnExtraLifeCoin = false; 
    let villainColor; 

    if (!forceNormal && !isGoldRushActive) {
        const specialCoinRoll = Math.random();
        if (specialCoinRoll < 0.05) { 
            isThisAnExtraLifeCoin = true;
            console.log("Spawning Extra Life Coin!");
        } else if (specialCoinRoll < 0.15) { 
            isThisAGoldRushCoin = true;
            console.log("Spawning Gold Rush Coin!");
        }
    }
    
    if (isThisAGoldRushCoin) {
        villainColor = goldRushCoinColor; // 실제 색상 지정은 Villain 생성자에서 함
    } else if (isThisAnExtraLifeCoin) {
        villainColor = lifeBonusCoinColor; // 실제 색상 지정은 Villain 생성자에서 함
    } else {
        villainColor = `hsl(${Math.random() * 60 + 25}, 100%, 60%)`; 
    }
    villains.push(new Villain(x, y, radius, villainColor, { x: velocityX, y: velocityY }, isThisAGoldRushCoin, isThisAnExtraLifeCoin));
}

class Particle { 
    constructor(x, y, color, sizeMultiplier = 1) { this.x = x; this.y = y; this.size = (Math.random() * 3 + 2) * sizeMultiplier; this.color = color; this.velocity = { x: (Math.random() - 0.5) * (Math.random() * 8), y: (Math.random() - 0.5) * (Math.random() * 8) }; this.alpha = 1; this.friction = 0.97; this.gravity = 0.1;}
    draw() { ctx.save(); ctx.globalAlpha = this.alpha; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); ctx.restore(); }
    update() { this.velocity.x *= this.friction; this.velocity.y *= this.friction; this.velocity.y += this.gravity; this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= 0.03; if (this.alpha > 0) this.draw(); }
}
class SliceParticle { 
    constructor(x, y) { this.x = x; this.y = y; this.size = Math.random() * 2 + 1; this.color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`; this.velocity = { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 }; this.alpha = 1; }
    draw() { ctx.save(); ctx.globalAlpha = this.alpha; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); ctx.restore(); }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= 0.05; if (this.alpha > 0) this.draw(); }
 }
function updateAndDrawParticles(particleArray) { 
    for (let i = particleArray.length - 1; i >= 0; i--) { particleArray[i].update(); if (particleArray[i].alpha <= 0) particleArray.splice(i, 1); }
 }
function drawSliceTrail() { 
    if (sliceTrail.length < 2) return; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < sliceTrail.length; i++) { const p1 = sliceTrail[i-1], p2 = sliceTrail[i]; const age = (i / sliceTrail.length), alpha = Math.max(0, (1 - age) * 0.8); const lineWidth = Math.max(1, (1 - age) * (canvas.width * 0.03)); if (alpha <= 0 || lineWidth <= 0) continue; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); const trailGradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y); trailGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`); trailGradient.addColorStop(0.5, `rgba(139, 227, 255, ${alpha * 0.6})`); trailGradient.addColorStop(1, `rgba(74, 222, 128, ${alpha * 0.4})`); ctx.strokeStyle = trailGradient; ctx.lineWidth = lineWidth; ctx.shadowColor = `rgba(139, 227, 255, ${alpha * 0.7})`; ctx.shadowBlur = lineWidth * 1.5; ctx.stroke(); }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    if (sliceTrail.length > 0) { sliceTrail.forEach(p => p.alpha = (p.alpha || 1) - SLICE_TRAIL_FADE_SPEED); sliceTrail = sliceTrail.filter(p => p.alpha > 0); }
}

function gameLoop() {
    if (gameOver) {
        cancelAnimationFrame(animationFrameId); showGameOverScreen(); isGoldRushActive = false; return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height); frameCount++;
    if (isGoldRushActive) {
        if (Date.now() > goldRushEndTime) {
            isGoldRushActive = false; console.log("Gold Rush Ended!");
        } else {
            if (frameCount % 10 === 0) { 
                for(let i=0; i < 2; i++) { spawnVillain(true); }
            }
        }
    }
    villains.forEach((villain, index) => {
        villain.update();
        if (villain.y - villain.radius > canvas.height && !villain.sliced) {
            villains.splice(index, 1);
            if (!gameOver) {
                if (!isGoldRushActive) { 
                    lives--; livesDisplay.textContent = lives;
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
function getEventPosition(event) { 
    const rect = canvas.getBoundingClientRect(); const clientX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX; const clientY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY; return { x: clientX - rect.left, y: clientY - rect.top };
}
function startSlicing(event) {
    if (gameOver) return; if (event.type.startsWith('touch')) event.preventDefault(); isSlicing = true; const pos = getEventPosition(event); currentSlicePath = [pos]; sliceTrail = [{...pos, alpha: 1}];
 }
function continueSlicing(event) { 
    if (!isSlicing || gameOver) return; if (event.type.startsWith('touch')) event.preventDefault(); const pos = getEventPosition(event); currentSlicePath.push(pos); if (sliceTrail.length > SLICE_TRAIL_MAX_POINTS) sliceTrail.shift(); sliceTrail.push({...pos, alpha: 1}); if (Math.random() < 0.5) sliceParticles.push(new SliceParticle(pos.x, pos.y));
}
function endSlicing(event) {
    if (!isSlicing || gameOver) return; isSlicing = false; if (currentSlicePath.length >= MIN_SLICE_POINTS) checkSliceCollisions(); currentSlicePath = [];
 }
function isLineIntersectingCircle(p1, p2, circleCenter, radius) { 
    const dx = p2.x - p1.x, dy = p2.y - p1.y, lenSq = dx * dx + dy * dy; if (lenSq === 0) return Math.hypot(p1.x - circleCenter.x, p1.y - circleCenter.y) < radius; let t = ((circleCenter.x - p1.x) * dx + (circleCenter.y - p1.y) * dy) / lenSq; t = Math.max(0, Math.min(1, t)); const closestX = p1.x + t * dx, closestY = p1.y + t * dy; return Math.hypot(circleCenter.x - closestX, circleCenter.y - closestY) < radius;
}

function checkSliceCollisions() {
    let slicedThisTurn = 0;
    for (let i = villains.length - 1; i >= 0; i--) {
        const villain = villains[i];
        if (villain.sliced) continue;
        for (let j = 0; j < currentSlicePath.length - 1; j++) {
            const p1 = currentSlicePath[j], p2 = currentSlicePath[j + 1];
            if (isLineIntersectingCircle(p1, p2, {x: villain.x, y: villain.y}, villain.radius)) {
                villain.sliced = true;
                for (let k = 0; k < 20; k++) {
                    particles.push(new Particle(villain.x, villain.y, villain.originalColor, villain.radius / 20));
                }
                
                if (villain.isGoldRushCoin) {
                    score += 50; 
                    if (!isGoldRushActive) {
                        isGoldRushActive = true;
                        goldRushEndTime = Date.now() + GOLD_RUSH_DURATION;
                        console.log("Gold Rush Activated! Ends at: ", new Date(goldRushEndTime).toLocaleTimeString());
                    }
                } else if (villain.isLifeBonusCoin) { 
                    score += 20; 
                    if (lives < MAX_LIVES) {
                        lives++;
                        livesDisplay.textContent = lives;
                        console.log("Life Gained! Current lives:", lives);
                    } else {
                        console.log("Sliced Life Bonus Coin, but lives are already full.");
                        score += 30; 
                    }
                } else { 
                    slicedThisTurn++;
                    score += 10 * slicedThisTurn; 
                }
                scoreDisplay.textContent = score; 
                break; 
            }
        }
    }
    villains = villains.filter(v => !v.sliced);
}

function startGame() {
    score = 0; lives = 3; villains = []; particles = []; sliceParticles = [];
    sliceTrail = []; currentSlicePath = []; gameOver = false; isSlicing = false; gameSpeed = 1;
    isGoldRushActive = false; goldRushEndTime = 0; frameCount = 0; 
    scoreDisplay.textContent = score; livesDisplay.textContent = lives;
    startScreen.classList.remove('show'); gameOverScreen.classList.remove('show');
    if (window.villainSpawnInterval) clearInterval(window.villainSpawnInterval);
    window.villainSpawnInterval = setInterval(() => {
        if (!isGoldRushActive) { spawnVillain(); }
    }, Math.max(250, 750 - score * 1.5));
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

function showGameOverScreen() {
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.add('show');
    if (window.villainSpawnInterval) clearInterval(window.villainSpawnInterval);
    isGoldRushActive = false; 
    try {
        if (WebApp && WebApp.sendData) {
            console.log("Attempting to send score to Telegram:", score);
            const scoreDataString = String(score); WebApp.sendData(scoreDataString);
            console.log("Score sent to Telegram successfully:", scoreDataString);
        } else { console.error("Telegram WebApp API is not available or sendData is not defined."); }
    } catch (e) { console.error("Error sending data to Telegram:", e); }
}

canvas.addEventListener('mousedown', startSlicing); 
canvas.addEventListener('mousemove', continueSlicing);
canvas.addEventListener('mouseup', endSlicing);
canvas.addEventListener('mouseleave', endSlicing);
canvas.addEventListener('touchstart', startSlicing, { passive: false });
canvas.addEventListener('touchmove', continueSlicing, { passive: false });
canvas.addEventListener('touchend', endSlicing);
canvas.addEventListener('touchcancel', endSlicing);

startButton.addEventListener('click', () => { resizeCanvas(); startGame(); });
restartButton.addEventListener('click', () => { resizeCanvas(); startGame(); });
if (homeButton) {
    homeButton.addEventListener('click', () => {
        gameOverScreen.classList.remove('show'); startScreen.classList.add('show');
    });
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
