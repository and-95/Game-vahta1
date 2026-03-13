const canvas = document.getElementById('weldCanvas');
const ctx = canvas.getContext('2d');

const qualityValue = document.getElementById('qualityValue');
const progressValue = document.getElementById('progressValue');
const timeValue = document.getElementById('timeValue');
const bestValue = document.getElementById('bestValue');
const message = document.getElementById('message');
const qualityBar = document.getElementById('qualityBar');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const difficultySelect = document.getElementById('difficultySelect');
const overlay = document.getElementById('overlay');
const orientationHint = document.getElementById('orientationHint');

const BASE_WIDTH = 1100;
const BASE_HEIGHT = 560;
const BEST_KEY = 'weld-game-best-quality';

const levels = {
  easy: { duration: 55, penalty: 0.009, reward: 0.033, tolerance: 16 },
  normal: { duration: 45, penalty: 0.013, reward: 0.028, tolerance: 13 },
  hard: { duration: 35, penalty: 0.017, reward: 0.021, tolerance: 10 }
};

const gameState = {
  running: false,
  pointerDown: false,
  elapsed: 0,
  duration: levels.normal.duration,
  progress: 0,
  quality: 100,
  previousX: null,
  tip: { x: 120, y: 280 },
  path: [],
  particles: [],
  difficulty: 'normal',
  best: Number(localStorage.getItem(BEST_KEY) || 0)
};

function createGuidePath() {
  const points = [];
  const startX = 90;
  const endX = BASE_WIDTH - 90;
  const level = levels[gameState.difficulty];
  const amp = gameState.difficulty === 'hard' ? 56 : gameState.difficulty === 'easy' ? 34 : 44;

  for (let x = startX; x <= endX; x += 15) {
    const t = (x - startX) / (endX - startX);
    const wave = Math.sin(t * Math.PI * 2.1) * amp + Math.sin(t * Math.PI * 7.2) * (amp * 0.23);
    const y = BASE_HEIGHT / 2 + wave;
    points.push({ x, y, tolerance: level.tolerance });
  }
  return points;
}

let guidePath = createGuidePath();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resetGame() {
  gameState.running = false;
  gameState.pointerDown = false;
  gameState.elapsed = 0;
  gameState.progress = 0;
  gameState.quality = 100;
  gameState.previousX = null;
  gameState.tip = { ...guidePath[0] };
  gameState.path = [];
  gameState.particles = [];
  updateHud();
}

function setDifficulty(level) {
  gameState.difficulty = level;
  gameState.duration = levels[level].duration;
  guidePath = createGuidePath();
  resetGame();
  message.textContent = `Режим: ${difficultySelect.selectedOptions[0].text}. Нажмите «Старт».`;
}

function startGame() {
  resetGame();
  gameState.running = true;
  overlay.classList.add('hidden');
  message.textContent = 'Зажмите и ведите горелку вдоль линии слева направо без резких уходов в сторону.';
  restartBtn.disabled = false;
}

function updateHud() {
  qualityValue.textContent = `${Math.round(gameState.quality)}%`;
  progressValue.textContent = `${Math.round(gameState.progress)}%`;
  const remaining = Math.max(0, Math.ceil(gameState.duration - gameState.elapsed));
  timeValue.textContent = `${remaining}с`;
  bestValue.textContent = `${Math.round(gameState.best)}%`;
  qualityBar.style.transform = `scaleX(${gameState.quality / 100})`;
}

function getNearestPoint(x) {
  let nearest = guidePath[0];
  let minDist = Infinity;
  for (const point of guidePath) {
    const dist = Math.abs(point.x - x);
    if (dist < minDist) {
      minDist = dist;
      nearest = point;
    }
  }
  return nearest;
}

function addSpark(x, y, good) {
  const count = good ? 2 : 3;
  for (let i = 0; i < count; i += 1) {
    gameState.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -Math.random() * 1.8,
      life: 24 + Math.random() * 22,
      size: 1.2 + Math.random() * 2.3,
      color: good ? '251, 191, 36' : '248, 113, 113'
    });
  }
}

function getCanvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * BASE_WIDTH,
    y: ((clientY - rect.top) / rect.height) * BASE_HEIGHT
  };
}

function getAdjustedPoint(event) {
  const point = getCanvasPoint(event.clientX, event.clientY);

  if (event.pointerType !== 'touch') return point;

  const touchOffsetX = BASE_WIDTH * 0.075;
  const touchOffsetY = BASE_HEIGHT * 0.14;

  return {
    x: clamp(point.x - touchOffsetX, 0, BASE_WIDTH),
    y: clamp(point.y - touchOffsetY, 0, BASE_HEIGHT)
  };
}

function updateOrientationHint() {
  const isPortraitMobile = window.matchMedia('(max-width: 940px) and (orientation: portrait)').matches;
  orientationHint.classList.toggle('show', isPortraitMobile);
}

function handlePointer(event) {
  const { x, y } = getAdjustedPoint(event);

  if (!gameState.running || !gameState.pointerDown) return;

  const nearest = getNearestPoint(x);
  const deviation = Math.abs(y - nearest.y);
  const level = levels[gameState.difficulty];
  const isGood = deviation < nearest.tolerance;

  gameState.tip.x = x;
  gameState.tip.y = y;

  if (gameState.previousX == null || x >= gameState.previousX - 8) {
    const start = guidePath[0].x;
    const finish = guidePath[guidePath.length - 1].x;
    gameState.progress = clamp(((x - start) / (finish - start)) * 100, 0, 100);
    gameState.previousX = x;
  }

  const penalty = Math.max(0, deviation - 7) * level.penalty;
  const reward = deviation < 8 ? level.reward : 0;
  gameState.quality = clamp(gameState.quality - penalty + reward, 0, 100);

  gameState.path.push({ x, y, good: isGood });
  if (gameState.path.length > 1600) gameState.path.shift();

  addSpark(x, y, isGood);
  updateHud();

  if (gameState.progress >= 100 || gameState.elapsed >= gameState.duration || gameState.quality <= 0) {
    finishGame();
  }
}

function finishGame() {
  gameState.running = false;
  gameState.pointerDown = false;

  if (gameState.quality > gameState.best) {
    gameState.best = gameState.quality;
    localStorage.setItem(BEST_KEY, String(gameState.best.toFixed(2)));
  }

  if (gameState.quality > 88) {
    message.textContent = 'Идеально! Это шов уровня мастера 👏';
  } else if (gameState.quality > 70) {
    message.textContent = 'Отличный результат. Шов качественный и надёжный.';
  } else if (gameState.quality > 45) {
    message.textContent = 'Неплохо, но есть поры и отклонения. Попробуйте ещё.';
  } else {
    message.textContent = 'Шов с дефектами. Снизьте скорость и держитесь ближе к линии.';
  }

  overlay.classList.remove('hidden');
  updateHud();
}

function drawGuide() {
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.beginPath();
  guidePath.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.78)';
  ctx.shadowColor = 'rgba(34, 211, 238, 0.8)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  guidePath.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

function drawWeldPath() {
  if (gameState.path.length < 2) return;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < gameState.path.length; i += 1) {
    const prev = gameState.path[i - 1];
    const current = gameState.path[i];
    ctx.strokeStyle = current.good ? 'rgba(52, 211, 153, 0.96)' : 'rgba(248, 113, 113, 0.96)';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
  }
}

function drawTorch() {
  const { x, y } = gameState.tip;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-8, -25, 16, 32);
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(-6, 7, 12, 14);

  ctx.beginPath();
  ctx.moveTo(-7, 7);
  ctx.lineTo(7, 7);
  ctx.lineTo(0, 18);
  ctx.closePath();
  ctx.fillStyle = '#a5b4fc';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 18, 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
  ctx.fill();
  ctx.restore();
}

function drawSparks() {
  gameState.particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.04;
    particle.life -= 1;

    const alpha = clamp(particle.life / 46, 0, 1);
    ctx.fillStyle = `rgba(${particle.color}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });

  gameState.particles = gameState.particles.filter((p) => p.life > 0);
}

function drawFrame() {
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  const grad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  grad.addColorStop(0, 'rgba(30, 41, 59, 0.35)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  drawGuide();
  drawWeldPath();
  drawSparks();
  drawTorch();

  ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
  ctx.font = '600 18px Manrope';
  ctx.fillText('Держите шов ровным: зелёный = хорошо, красный = отклонение', 24, 36);
}

let lastTs = performance.now();
function tick(ts) {
  const delta = (ts - lastTs) / 1000;
  lastTs = ts;

  if (gameState.running) {
    gameState.elapsed += delta;
    updateHud();
    if (gameState.elapsed >= gameState.duration) finishGame();
  }

  drawFrame();
  requestAnimationFrame(tick);
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  gameState.pointerDown = true;
  handlePointer(event);
});

canvas.addEventListener('pointermove', (event) => {
  event.preventDefault();
  handlePointer(event);
});

canvas.addEventListener('pointerup', (event) => {
  canvas.releasePointerCapture(event.pointerId);
  gameState.pointerDown = false;
});

canvas.addEventListener('pointerleave', () => {
  gameState.pointerDown = false;
});

difficultySelect.addEventListener('change', () => {
  setDifficulty(difficultySelect.value);
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
window.addEventListener('resize', updateOrientationHint);
window.addEventListener('orientationchange', updateOrientationHint);

setDifficulty('normal');
updateOrientationHint();
requestAnimationFrame(tick);
