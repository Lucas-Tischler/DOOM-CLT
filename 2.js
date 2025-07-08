let gameStarted = false;

function startGame() {
  document.getElementById('startScreen').style.display = 'none';
  gameStarted = true;
  gameLoop(); // começa o jogo aqui
}

const chaoImg = new Image();
let chaoPattern = null;

chaoImg.onload = function () {
    chaoPattern = ctx.createPattern(chaoImg, 'repeat');
};
chaoImg.src = 'chao.png'; // Caminho da sua textura

const paredeTexture = new Image();
paredeTexture.src = 'parede.png';

// Carrega a imagem do projétil do inimigo
const projetilImg = new Image();
projetilImg.src = 'projetil_inimigo.png';

// Carrega a imagem da arma do inimigo
const armaInimigoImg = new Image();
armaInimigoImg.src = "arma_inimigo.png";

let vida = 5;
const vidaMaxima = 5;

const vidaImg = new Image();
vidaImg.src = "vida.png";

const armaImg = new Image();
armaImg.src = 'arma.png';

const flashImg = new Image();
flashImg.src = 'flash.png';

const enemyImage = new Image();
enemyImage.src = "inimigo.png";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

const TILE_SIZE = 64;
const FOV = Math.PI / 3;
const NUM_RAYS = 300;
const MAX_DEPTH = 800;



const map = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

let inimigoAtirando = true;

// Lista de projéteis ativos
let projeteis = [];

function dispararProjetil(inimigo) {
  const dx = player.x - inimigo.x;
  const dy = player.y - inimigo.y;
  const angulo = Math.atan2(dy, dx);
  projeteis.push({
    x: inimigo.x,
    y: inimigo.y,
    velX: Math.cos(angulo) * 5,
    velY: Math.sin(angulo) * 5,
    angulo: 0,
    rotacao: 0.2
  });
}

let player = {
  x: TILE_SIZE * 2,
  y: TILE_SIZE * 2,
  angle: 0,
  speed: 0,
  strafeSpeed: 0,
  turnSpeed: 0,
  isJumping: false,
  jumpVelocity: 0,
  z: 0 // altura do pulo
};

let enemyDirection = Math.random() * Math.PI * 2; // direção aleatória
let enemySpeed = 1; // velocidade de patrulha
let enemyChangeTimer = 0;
let enemyVisionRange = 250;

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
let weaponBobTimer = 0;


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

      // Verifica se o raio atingiu uma parede
      if (map[targetY] && map[targetY][targetX] === 1) {
        const dist = d * Math.cos(rayAngle - player.angle);
        const wallHeight = (TILE_SIZE * 277) / dist;

        // Posição da textura na horizontal (para fazer o efeito de repetição)
        const textureX = Math.floor((rayX % TILE_SIZE) / TILE_SIZE * paredeTexture.width);

        // Desenha a textura da parede
        ctx.drawImage(paredeTexture, textureX, 0, 1, paredeTexture.height, 
                      i * (canvas.width / NUM_RAYS), (canvas.height - wallHeight) / 2 + lookOffset, 
                      (canvas.width / NUM_RAYS), wallHeight);
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

  const pattern = ctx.createPattern(chaoImg, 'repeat');
ctx.fillStyle = pattern;
ctx.fillRect(0, canvas.height / 2 + lookOffset, canvas.width, canvas.height / 2 - lookOffset);


  ctx.fillStyle = "#8B4513";
  ctx.fillRect(0, (canvas.height / 2) + 50 + lookOffset, canvas.width, canvas.height / 2);

  drawTree(150, canvas.height / 2 - 60 + lookOffset);
  drawTree(450, canvas.height / 2 - 80 + lookOffset);
  drawTree(700, canvas.height / 2 - 70 + lookOffset);


  if (chaoPattern) {
    ctx.fillStyle = chaoPattern;
    ctx.fillRect(0, canvas.height / 2 + lookOffset, canvas.width, canvas.height / 2 - lookOffset);
} else {
    ctx.fillStyle = '#000'; // fallback enquanto não carrega
    ctx.fillRect(0, canvas.height / 2 + lookOffset, canvas.width, canvas.height / 2 - lookOffset);
}
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

  // Corrige o ângulo relativo para manter entre -PI e PI
  let relativeAngle = angleToEnemy - player.angle;
  relativeAngle = Math.atan2(Math.sin(relativeAngle), Math.cos(relativeAngle));

  // Verifica se o inimigo está no campo de visão (FOV)
  if (Math.abs(relativeAngle) < FOV / 2 && distance > 0.5) {

    // Verifica se há uma parede entre o jogador e o inimigo
    const step = 5; // Tamanho do passo para verificar a linha
    let clearLine = true;
    for (let d = 0; d < distance; d += step) {
      let checkX = player.x + Math.cos(angleToEnemy) * d;
      let checkY = player.y + Math.sin(angleToEnemy) * d;

      let targetX = Math.floor(checkX / TILE_SIZE);
      let targetY = Math.floor(checkY / TILE_SIZE);

      if (map[targetY] && map[targetY][targetX] === 1) {
        clearLine = false;
        break; // Se houver uma parede, não desenha o inimigo
      }
    }

    if (clearLine) {
      let screenX = (0.5 + relativeAngle / FOV) * canvas.width;
      let size = 9000 / distance;
      const centerX = screenX - size / 2;
      const centerY = canvas.height / 2 - size / 2 + lookOffset;

      ctx.drawImage(enemyImage, centerX, centerY, size, size);

      if (enemy.health > 0) {
        // Barra de vida
        ctx.fillStyle = "#000";
        ctx.fillRect(centerX, centerY - 10, size, 5);
        ctx.fillStyle = "#f00";
        ctx.fillRect(centerX, centerY - 10, size * (enemy.health / enemy.maxHealth), 5);

        // Arma do inimigo
        const armaLargura = size * 0.9;
        const armaAltura = size * 0.6;
        const armaX = centerX + size * 0.8;
        const armaY = centerY + size * 0.0;
        ctx.drawImage(armaInimigoImg, armaX, armaY, armaLargura, armaAltura);

        let yRender = player.y - player.z;
      }
    }
  }
}


function renderProjetisInimigo() {
  projeteis.forEach((p, i) => {
    const nextX = p.x + Math.cos(p.angulo) * 5;
    const nextY = p.y + Math.sin(p.angulo) * 5;

    const tileX = Math.floor(nextX / TILE_SIZE);
    const tileY = Math.floor(nextY / TILE_SIZE);

    if (map[tileY] && map[tileY][tileX] === 1) {
      projeteis.splice(i, 1);
      return;
    }

    p.x = nextX;
    p.y = nextY;

    let dx = player.x - p.x;
    let dy = player.y - p.y;
    if (vida > 0 && Math.sqrt(dx * dx + dy * dy) < 20) {
      vida -= 1;
      projeteis.splice(i, 1);
    }
  });
}






function renderVida() {
  const coracaoLargura = 32;
  const coracaoAltura = 32;
  const margem = 10;

  for (let i = 0; i < vida; i++) {
    ctx.drawImage(vidaImg, margem + i * (coracaoLargura + 5), margem, coracaoLargura, coracaoAltura);
  }
}

function renderWeapon() {
  const cx = canvas.width / 2;
  const cy = canvas.height - 50 + weaponOffsetY ; // Usa lookOffset aqui

  const armaLargura = 200;
  const armaAltura = 200;

  // Desenha a arma centralizada e ajustada pela inclinação vertical
  ctx.drawImage(armaImg, cx - armaLargura / 2, cy - armaAltura, armaLargura, armaAltura);

  // Flash do tiro
  if (weaponFlash > 0) {
    const flashLargura = 150;
    const flashAltura = 80;
    ctx.drawImage(flashImg, cx - flashLargura / 2, cy - armaAltura - 40, flashLargura, flashAltura);
    weaponFlash--;
  }

  // Animação de recarregamento
  if (isReloading) {
    reloadFrame++;
    if (reloadFrame < 10) weaponOffsetY = 10;
    else if (reloadFrame < 20) weaponOffsetY = 20;
    else if (reloadFrame < 30) weaponOffsetY = 10;
    else {
      weaponOffsetY = 0;
      isReloading = false;
      reloadFrame = 0;


      function renderWeapon() {
        const arma = armas[armaAtual];
        const img = arma.imagem;
      
        ctx.drawImage(
          img,
          canvas.width / 2 - img.width / 2,
          canvas.height - img.height,

          function atirar() {
            const arma = armas[armaAtual];
          
            if (Date.now() - ultimoDisparo < arma.cadencia) return;
          
            // disparar...
            criarProjetil(arma.dano);
          
            ultimoDisparo = Date.now();
          }
        );
      }
    }
  }
}

function renderBullets() {
  bullets.forEach((b, i) => {
    // Calcula o próximo ponto onde o projétil vai se mover
    const nextX = b.x + Math.cos(b.angle) * 5;
    const nextY = b.y + Math.sin(b.angle) * 5;

    // Verifica se o projétil colide com a parede
    const tileX = Math.floor(nextX / TILE_SIZE);
    const tileY = Math.floor(nextY / TILE_SIZE);

    // Se houver uma parede na nova posição, o projétil vai parar
    if (map[tileY] && map[tileY][tileX] === 1) {
      // Remove o projétil, já que ele colidiu com a parede
      bullets.splice(i, 1);
      return; // Sai da iteração do projétil atual
    }

    // Caso contrário, move o projétil para a nova posição
    b.x = nextX;
    b.y = nextY;

    // Verifica colisão com o inimigo (já existente no seu código)
    let dx = enemy.x - b.x;
    let dy = enemy.y - b.y;
    if (enemy.health > 0 && Math.sqrt(dx * dx + dy * dy) < 20) {
      enemy.health -= 20;
      bullets.splice(i, 1);
    }
  });
}



function updateProjeteis() {
  let telaVermelha = false;

  projeteis.forEach((p, i) => {
    // Move o projétil
    p.x += p.velX;
    p.y += p.velY;
    p.angulo += p.rotacao;

    // Desenha o projétil com rotação
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angulo);
    const w = 30, h = 30;
    ctx.drawImage(projetilImg, -w / 2, -h / 2, w, h);
    ctx.restore();

    // Adicionando lógica para desenhar projétil apenas dentro do FOV
    let dx = p.x - player.x;
    let dy = p.y - player.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let angleToEnemy = Math.atan2(dy, dx);
    let relativeAngle = angleToEnemy - player.angle;
    relativeAngle = Math.atan2(Math.sin(relativeAngle), Math.cos(relativeAngle));

    // Só desenha se estiver dentro do FOV
    if (Math.abs(relativeAngle) < FOV / 2) {
      let screenX = (0.5 + relativeAngle / FOV) * canvas.width;
      let size = 5000 / distance;

      ctx.save();
      ctx.translate(screenX, canvas.height / 2 + lookOffset);
      ctx.rotate(p.angulo);
      ctx.drawImage(projetilImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    // Colisão com o jogador
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 40) {
        vida -= 0.5;
        telaVermelha = true;
        projeteis.splice(i, 1);
    }

    // Remove se sair da tela
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
        projeteis.splice(i, 1);
    }
  });

  // Efeito de tela vermelha
  if (telaVermelha) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

const armas = [
  {
    nome: 'Pistola',
    imagem: new Image(),
    sprite: 'pistola.png',
    cadencia: 500, // milissegundos
    dano: 1,
  },
  {
    nome: 'Rifle',
    imagem: new Image(),
    sprite: 'rifle.png',
    cadencia: 200,
    dano: 2,
  },
  {
    nome: 'Bazuca',
    imagem: new Image(),
    sprite: 'bazuca.png',
    cadencia: 1000,
    dano: 5,
  }
];

armas.forEach(arma => arma.imagem.src = arma.sprite);

let armaAtual = 0;


function render() {
  renderScenario();
  castRays();
  renderEnemy();
  renderProjetisInimigo(); // <-- adicione esta linha
  renderBullets();
  renderWeapon();
  renderVida();
  updateProjeteis();
}


function update() {
  player.angle += player.turnSpeed;

  // Movimento para frente/trás
  const forwardX = Math.cos(player.angle) * player.speed;
  const forwardY = Math.sin(player.angle) * player.speed;

  // Movimento lateral (strafe)
  const strafeX = Math.cos(player.angle + Math.PI / 2) * player.strafeSpeed;
  const strafeY = Math.sin(player.angle + Math.PI / 2) * player.strafeSpeed;

  const nextX = player.x + forwardX + strafeX;
  const nextY = player.y + forwardY + strafeY;

  const tileX = Math.floor(nextX / TILE_SIZE);
  const tileY = Math.floor(nextY / TILE_SIZE);

  if (map[tileY] && map[tileY][tileX] === 0) {
    player.x = nextX;
    player.y = nextY;
  }

  // Atualizar pulo
if (player.isJumping) {
  player.z += player.jumpVelocity;
  player.jumpVelocity -= 0.3; // gravidade

  if (player.z <= 0) {
      player.z = 0;
      player.isJumping = false;
      player.jumpVelocity = 0;
  }
}

  // Weapon bobbing
  if (player.speed !== 0 || player.strafeSpeed !== 0) {
    weaponBobTimer += 0.2;
    weaponOffsetY = Math.sin(weaponBobTimer) * 5;
  } else {
    weaponOffsetY *= 0.8;
  }
  // Movimento e ataque do inimigo, só se estiver vivo
if (enemy.health > 0) {
  let newEnemyX = enemy.x + Math.cos(enemyDirection) * enemySpeed;
  let newEnemyY = enemy.y + Math.sin(enemyDirection) * enemySpeed;

  let tileX = Math.floor(newEnemyX / TILE_SIZE);
  let tileY = Math.floor(newEnemyY / TILE_SIZE);

  if (map[tileY] && map[tileY][tileX] === 0) {
    enemy.x = newEnemyX;
    enemy.y = newEnemyY;
  } else {
    enemyDirection = Math.random() * Math.PI * 2;
  }

  // Se o jogador estiver perto e visível, atira
  let dx = player.x - enemy.x;
  let dy = player.y - enemy.y;
  let distToPlayer = Math.sqrt(dx * dx + dy * dy);

  if (distToPlayer < enemyVisionRange) {
    let canSee = true;
    const angleToPlayer = Math.atan2(dy, dx);
    for (let d = 0; d < distToPlayer; d += 5) {
      let checkX = enemy.x + Math.cos(angleToPlayer) * d;
      let checkY = enemy.y + Math.sin(angleToPlayer) * d;
      let tileX = Math.floor(checkX / TILE_SIZE);
      let tileY = Math.floor(checkY / TILE_SIZE);
      if (map[tileY][tileX] === 1) {
        canSee = false;
        break;
      }
    }

    if (canSee && Math.random() < 0.02) {
      dispararProjetil(enemy);
    }
  }
}
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}



document.addEventListener("keydown", (e) => {
  if (e.key === "w" || e.key === "W") player.speed = 2;
  if (e.key === "s" || e.key === "S") player.speed = -2;
  if (e.key === "a" || e.key === "A") player.strafeSpeed = -2;
  if (e.key === "d" || e.key === "D") player.strafeSpeed = 2;



  document.addEventListener('keydown', function (e) {
    if (e.key === '1') armaAtual = 0;
    if (e.key === '2') armaAtual = 1;
    if (e.key === '3') armaAtual = 2;
  });


if (e.key.toLowerCase() === "h") {
    if (vida > 0) vida--;
  }
  if (e.key.toLowerCase() === "g") {
    if (vida < vidaMaxima) vida++;
}

  if (e.key === "r" || e.key === "R") {
    if (!isReloading) {
      isReloading = true;
      reloadFrame = 0;
    }
  }
  
  if (e.key === "f" || e.key === "F") {
    inimigoAtirando = !inimigoAtirando; // alterna entre atirar ou não
  }

  // Reviver inimigo com tecla P
  if (e.key === "p" || e.key === "P") {
    enemy.health = enemy.maxHealth;
  }
  enemyChangeTimer--;
if (enemyChangeTimer <= 0) {
  enemyDirection = Math.random() * Math.PI * 2;
  enemyChangeTimer = 100 + Math.random() * 100;
}

if (e.code === "Space" && !player.isJumping) {
  player.isJumping = true;
  player.jumpVelocity = 5; // força do pulo
}

});



document.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "W") player.speed = 0;
  if (e.key === "s" || e.key === "S") player.speed = 0;
  if (e.key === "a" || e.key === "A") player.strafeSpeed = 0;
  if (e.key === "d" || e.key === "D") player.strafeSpeed = 0;
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
  mouseY -= deltaY * sensitivityY;  // 👈 inversão aqui
  if (mouseY > 100) mouseY = 100;
  if (mouseY < -100) mouseY = -100;
  lookOffset = mouseY;
});
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
canvas.onclick = () => canvas.requestPointerLock();

setInterval(() => {
  if (enemy && enemy.health > 0 && inimigoAtirando) {
    dispararProjetil(enemy);
  }
}, 2000);


// o jogo só começa ao clicar no botão