const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

const TILE_SIZE = 64;
const FOV = Math.PI / 3;
const NUM_RAYS = 300;
const MAX_DEPTH = 800;

const map = [
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,0,0,1],
  [1,0,1,0,1,0,1,0,1,0,0,1],
  [1,0,1,0,0,0,1,0,1,0,0,1],
  [1,0,1,1,1,1,1,0,1,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1]
];

let player = {
  x: TILE_SIZE * 2,
  y: TILE_SIZE * 2,
  angle: 0,
  speed: 0,
  turnSpeed: 0
};

let enemy = {
  x: TILE_SIZE * 6,
  y: TILE_SIZE * 3,
  health: 100,
  maxHealth: 100
};

let bullets = [];
let weaponFlash = 0;
let isReloading = false;
let reloadFrame = 0;
let weaponOffsetY = 0;
let lookOffset = 0;
let mouseY = 0;

function castRays() {
  const angleStep = FOV / NUM_RAYS;
  let rayAngle = player.angle - FOV / 2;

  for (let i = 0; i < NUM_RAYS; i++) {
    let rayX = player.x;
    let rayY = player.y;
    let sin = Math.sin(rayAngle);
    let cos = Math.cos(rayAngle);

    for (let d = 0; d < MAX_DEPTH; d++) {
      let targetX = Math.floor(rayX / TILE_SIZE);
      let targetY = Math.floor(rayY / TILE_SIZE);

      if (map[targetY] && map[targetY][targetX] === 1) {
        const dist = d * Math.cos(rayAngle - player.angle);
        const wallHeight = (TILE_SIZE * 277) / dist;
        ctx.fillStyle = `rgb(${100 + (25500 / dist)}, ${100 + (25500 / dist)}, ${100 + (25500 / dist)})`;
        ctx.fillRect(i * (canvas.width / NUM_RAYS), (canvas.height - wallHeight) / 2 + lookOffset, (canvas.width / NUM_RAYS), wallHeight);
        break;
      }

      rayX += cos;
      rayY += sin;
    }
    rayAngle += angleStep;
  }
}

function renderScenario() {
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2 + lookOffset);

  ctx.fillStyle = "#55aa55";
  ctx.fillRect(0, canvas.height / 2 + lookOffset, canvas.width, canvas.height / 2 - lookOffset);

  ctx.fillStyle = "#8B4513";
  ctx.fillRect(0, (canvas.height / 2) + 50 + lookOffset, canvas.width, canvas.height / 2);

  drawTree(150, canvas.height / 2 - 60 + lookOffset);
  drawTree(450, canvas.height / 2 - 80 + lookOffset);
  drawTree(700, canvas.height / 2 - 70 + lookOffset);
}

function drawTree(x, y) {
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(x, y, 20, 60);

  ctx.fillStyle = "#228B22";
  ctx.fillRect(x - 30, y - 40, 80, 50);
}

function renderEnemy() {
  let dx = enemy.x - player.x;
  let dy = enemy.y - player.y;
  let angleToEnemy = Math.atan2(dy, dx);
  let distance = Math.sqrt(dx * dx + dy * dy);

  let relativeAngle = angleToEnemy - player.angle;
  if (Math.abs(relativeAngle) < FOV / 2 && distance > 0.5) {
    let screenX = (0.5 + relativeAngle / FOV) * canvas.width;
    let size = 9000 / distance;
    const centerX = screenX;
    const centerY = canvas.height / 2 + lookOffset;

    const colorBody = enemy.health > 0 ? "#880000" : "#444";
    const colorHead = enemy.health > 0 ? "#ffccaa" : "#666";

    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.fillStyle = colorBody;
    ctx.fillRect(-size * 0.15, size * 0.2, size * 0.1, size * 0.4);
    ctx.fillRect(size * 0.05, size * 0.2, size * 0.1, size * 0.4);

    ctx.fillRect(-size * 0.2, -size * 0.1, size * 0.4, size * 0.3);
    ctx.fillRect(-size * 0.35, -size * 0.1, size * 0.15, size * 0.25);
    ctx.fillRect(size * 0.2, -size * 0.1, size * 0.15, size * 0.25);

    ctx.fillStyle = colorHead;
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 🛠️ Adição da barra de vida em cima da cabeça
    ctx.fillStyle = "#000";
    ctx.fillRect(-size * 0.2, -size * 0.5, size * 0.4, 5);

    ctx.fillStyle = "#f00";
    ctx.fillRect(-size * 0.2, -size * 0.5, size * 0.4 * (enemy.health / enemy.maxHealth), 5);

    ctx.restore();
  }
}

function renderWeapon() {
  const cx = canvas.width / 2;
  const cy = canvas.height + weaponOffsetY + lookOffset;

  ctx.fillStyle = "#444";
  ctx.fillRect(cx - 30, cy - 100, 60, 70);
  ctx.fillStyle = "#666";
  ctx.fillRect(cx - 30, cy - 100, 10, 70);
  ctx.fillRect(cx + 20, cy - 100, 10, 70);

  ctx.strokeStyle = "#999";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy - 90);
  ctx.lineTo(cx + 20, cy - 90);
  ctx.moveTo(cx - 20, cy - 70);
  ctx.lineTo(cx + 20, cy - 70);
  ctx.stroke();

  ctx.fillStyle = "#aaa";
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 120);
  ctx.lineTo(cx + 5, cy - 120);
  ctx.lineTo(cx + 4, cy - 100);
  ctx.lineTo(cx - 4, cy - 100);
  ctx.closePath();
  ctx.fill();

  if (weaponFlash > 0) {
    ctx.fillStyle = "rgba(255, 255, 150, 0.9)";
    ctx.beginPath();
    ctx.arc(cx, cy - 130, 30, 0, Math.PI * 2);
    ctx.fill();
    weaponFlash--;
  }

  if (isReloading) {
    reloadFrame++;
    if (reloadFrame < 10) weaponOffsetY = 10;
    else if (reloadFrame < 20) weaponOffsetY = 20;
    else if (reloadFrame < 30) weaponOffsetY = 10;
    else {
      weaponOffsetY = 0;
      isReloading = false;
      reloadFrame = 0;
    }
  }
}

function renderBullets() {
  bullets.forEach((b, i) => {
    b.x += Math.cos(b.angle) * 5;
    b.y += Math.sin(b.angle) * 5;

    let dx = enemy.x - b.x;
    let dy = enemy.y - b.y;
    if (enemy.health > 0 && Math.sqrt(dx * dx + dy * dy) < 20) {
      enemy.health -= 20;
      bullets.splice(i, 1);
    }
  });
}

function render() {
  renderScenario();
  castRays();
  renderEnemy();
  renderBullets();
  renderWeapon();
}

function update() {
  player.angle += player.turnSpeed;
  
  const nextX = player.x + Math.cos(player.angle) * player.speed;
  const nextY = player.y + Math.sin(player.angle) * player.speed;

  const tileX = Math.floor(nextX / TILE_SIZE);
  const tileY = Math.floor(player.y / TILE_SIZE);
  if (map[tileY] && map[tileY][tileX] === 0) player.x = nextX;

  const tileY2 = Math.floor(nextY / TILE_SIZE);
  const tileX2 = Math.floor(player.x / TILE_SIZE);
  if (map[tileY2] && map[tileY2][tileX2] === 0) player.y = nextY;
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", e => {
  if (e.key === "w" || e.key === "W") player.speed = 2;
  if (e.key === "s" || e.key === "S") player.speed = -2;
  if (e.key === "a" || e.key === "A") player.turnSpeed = -0.05;
  if (e.key === "d" || e.key === "D") player.turnSpeed = 0.05;

  if (e.key === "r" || e.key === "R") {
    if (!isReloading) {
      isReloading = true;
      reloadFrame = 0;
    }
  }
});

document.addEventListener("keyup", e => {
  if (e.key === "w" || e.key === "s" || e.key === "W" || e.key === "S") player.speed = 0;
  if (e.key === "a" || e.key === "d" || e.key === "A" || e.key === "D") player.turnSpeed = 0;
});

document.addEventListener("mousedown", e => {
  if (!isReloading && e.button === 0) {
    bullets.push({ x: player.x, y: player.y, angle: player.angle });
    weaponFlash = 5;
  }
});

document.addEventListener("mousemove", e => {
  const sensitivity = 0.002;
  player.angle += e.movementX * sensitivity;

  const sensitivityY = 0.1;
  const deltaY = e.movementY;
  mouseY += deltaY * sensitivityY;
  if (mouseY > 100) mouseY = 100;
  if (mouseY < -100) mouseY = -100;
  lookOffset = mouseY;
});

canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
canvas.onclick = () => canvas.requestPointerLock();

gameLoop();