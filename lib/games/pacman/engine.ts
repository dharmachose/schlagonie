import type { DifficultyLevel } from '@/lib/types';
import type { GameState, Direction, Vec2, TilePos, Particle } from './types';
import { DIR_VECTORS, OPPOSITE_DIR, dist2, vecFromTile, tileFromVec } from './types';
import { getMazeDef, buildMaze, countDots } from './mazes';
import { createGhosts, updateGhost, frightenAllGhosts, updateScatterChase, endFrightenedMode } from './ghosts';
import {
  LEVEL_CONFIG, SCATTER_CHASE_SEQUENCE, READY_DURATION, DEATH_ANIM_DURATION,
  DOT_SCORE, POWER_SCORE, GHOST_COMBO_SCORES, FRUIT_DURATION,
  FRUIT_DOT_THRESHOLDS, INITIAL_LIVES, FLASH_DURATION,
} from './config';

export function createGameState(level: DifficultyLevel): GameState {
  const mazeDef = getMazeDef(level);
  const maze = buildMaze(mazeDef);
  const cfg = LEVEL_CONFIG[level];
  const dotsTotal = countDots(mazeDef);
  const pacSpawn = vecFromTile(mazeDef.pacmanSpawn);

  const state: GameState = {
    phase: 'ready',
    maze,
    mazeDef,
    pacman: {
      pos: { ...pacSpawn },
      tilePos: { ...mazeDef.pacmanSpawn },
      dir: 'left',
      nextDir: 'left',
      speed: cfg.pacmanSpeed,
      mouthAngle: 0.2,
      mouthOpening: true,
    },
    ghosts: [],
    score: 0,
    lives: INITIAL_LIVES,
    dotsTotal,
    dotsEaten: 0,
    ghostCombo: 0,
    fruit: {
      active: false,
      pos: { ...mazeDef.fruitPos },
      points: cfg.fruitPoints,
      timer: 0,
      emoji: cfg.fruitEmoji,
    },
    scaredTimer: 0,
    scatterChaseTimer: SCATTER_CHASE_SEQUENCE[0].duration,
    scatterChaseIndex: 0,
    isScatterMode: true,
    readyTimer: READY_DURATION,
    deathAnimTimer: 0,
    deathPos: null,
    particles: [],
    elapsed: 0,
    level,
    flashTimer: 0,
  };

  // Temporarily set ghost count for createGhosts
  state.ghosts = new Array(cfg.ghostCount).fill(null);
  state.ghosts = createGhosts(state);

  // Set ghost speeds
  for (const g of state.ghosts) g.speed = cfg.ghostSpeed;

  return state;
}

export function tickGame(state: GameState, dt: number): void {
  // Cap dt to prevent huge jumps (tab backgrounded)
  dt = Math.min(dt, 0.1);
  state.elapsed += dt * 1000;

  if (state.flashTimer > 0) state.flashTimer -= dt * 1000;

  switch (state.phase) {
    case 'ready':
      state.readyTimer -= dt * 1000;
      animateMouth(state, dt);
      if (state.readyTimer <= 0) state.phase = 'playing';
      break;

    case 'playing':
      movePacman(state, dt);
      for (const g of state.ghosts) updateGhost(g, state, dt);
      checkDotCollection(state);
      checkFruitCollection(state);
      checkGhostCollisions(state);
      updateScatterChase(state, dt);
      updateFrightened(state, dt);
      updateFruitTimer(state, dt);
      updateParticles(state, dt);
      animateMouth(state, dt);
      break;

    case 'dying':
      state.deathAnimTimer -= dt * 1000;
      if (state.deathAnimTimer <= 0) {
        if (state.lives <= 0) {
          state.phase = 'gameOver';
        } else {
          resetPositions(state);
          state.phase = 'ready';
          state.readyTimer = 1500;
        }
      }
      break;
  }
}

function isWalkable(state: GameState, pos: TilePos): boolean {
  const { maze, mazeDef } = state;
  // Tunnel wrapping
  for (const t of mazeDef.tunnels) {
    if (pos.row === t.row && (pos.col < 0 || pos.col >= mazeDef.cols)) return true;
  }
  if (pos.row < 0 || pos.row >= mazeDef.rows || pos.col < 0 || pos.col >= mazeDef.cols) return false;
  const tile = maze[pos.row][pos.col];
  return tile !== 'wall' && tile !== 'ghostHouse';
}

function movePacman(state: GameState, dt: number): void {
  const pac = state.pacman;
  const speed = pac.speed;

  // At tile center: try to change direction
  const atCenter = Math.abs(pac.pos.x - Math.round(pac.pos.x)) < 0.05 &&
                   Math.abs(pac.pos.y - Math.round(pac.pos.y)) < 0.05;

  if (atCenter) {
    pac.pos.x = Math.round(pac.pos.x);
    pac.pos.y = Math.round(pac.pos.y);
    pac.tilePos = tileFromVec(pac.pos);

    // Try desired direction first
    const wantDv = DIR_VECTORS[pac.nextDir];
    const wantTile: TilePos = { row: pac.tilePos.row + wantDv.y, col: pac.tilePos.col + wantDv.x };
    if (isWalkable(state, wantTile)) {
      pac.dir = pac.nextDir;
    } else {
      // Try current direction
      const curDv = DIR_VECTORS[pac.dir];
      const curTile: TilePos = { row: pac.tilePos.row + curDv.y, col: pac.tilePos.col + curDv.x };
      if (!isWalkable(state, curTile)) {
        return; // Stopped — wall ahead
      }
    }
  }

  // Advance
  const dv = DIR_VECTORS[pac.dir];
  pac.pos.x += dv.x * speed * dt;
  pac.pos.y += dv.y * speed * dt;

  // Tunnel wrapping
  for (const t of state.mazeDef.tunnels) {
    if (Math.round(pac.pos.y) === t.row) {
      if (pac.pos.x < t.leftCol - 0.5) pac.pos.x = t.rightCol + 0.5;
      else if (pac.pos.x > t.rightCol + 0.5) pac.pos.x = t.leftCol - 0.5;
    }
  }

  pac.tilePos = tileFromVec(pac.pos);
}

function animateMouth(state: GameState, dt: number): void {
  const pac = state.pacman;
  const speed = 6;
  if (pac.mouthOpening) {
    pac.mouthAngle += speed * dt;
    if (pac.mouthAngle >= 1) { pac.mouthAngle = 1; pac.mouthOpening = false; }
  } else {
    pac.mouthAngle -= speed * dt;
    if (pac.mouthAngle <= 0.05) { pac.mouthAngle = 0.05; pac.mouthOpening = true; }
  }
}

function checkDotCollection(state: GameState): void {
  const { pacman, maze, mazeDef } = state;
  const { row, col } = pacman.tilePos;
  if (row < 0 || row >= mazeDef.rows || col < 0 || col >= mazeDef.cols) return;

  const tile = maze[row][col];
  if (tile === 'dot') {
    maze[row][col] = 'empty';
    state.score += DOT_SCORE;
    state.dotsEaten++;
    spawnDotParticles(state, pacman.pos);
    checkFruitSpawn(state);
  } else if (tile === 'power') {
    maze[row][col] = 'empty';
    state.score += POWER_SCORE;
    state.dotsEaten++;
    state.scaredTimer = LEVEL_CONFIG[state.level].frightenedDuration;
    frightenAllGhosts(state);
    spawnDotParticles(state, pacman.pos, '#87CEEB');
    checkFruitSpawn(state);
  }
}

function checkFruitSpawn(state: GameState): void {
  if (state.fruit.active) return;
  if (FRUIT_DOT_THRESHOLDS.includes(state.dotsEaten)) {
    state.fruit.active = true;
    state.fruit.timer = FRUIT_DURATION;
  }
}

function checkFruitCollection(state: GameState): void {
  if (!state.fruit.active) return;
  const pac = state.pacman.tilePos;
  if (pac.row === state.fruit.pos.row && pac.col === state.fruit.pos.col) {
    state.score += state.fruit.points;
    state.fruit.active = false;
    spawnDotParticles(state, state.pacman.pos, '#FF4444');
  }
}

function checkGhostCollisions(state: GameState): void {
  for (const g of state.ghosts) {
    if (g.inHouse || g.mode === 'eaten') continue;
    const d = dist2(g.pos, state.pacman.pos);
    if (d > 0.35) continue;

    if (g.mode === 'frightened') {
      // Eat ghost
      const combo = Math.min(state.ghostCombo, GHOST_COMBO_SCORES.length - 1);
      state.score += GHOST_COMBO_SCORES[combo];
      state.ghostCombo++;
      g.mode = 'eaten';
      spawnDotParticles(state, g.pos, g.color);
    } else {
      // Pacman dies
      state.lives--;
      state.phase = 'dying';
      state.deathAnimTimer = DEATH_ANIM_DURATION;
      state.deathPos = { ...state.pacman.pos };
      state.flashTimer = FLASH_DURATION;
      return;
    }
  }
}

function updateFrightened(state: GameState, dt: number): void {
  if (state.scaredTimer <= 0) return;
  state.scaredTimer -= dt * 1000;
  if (state.scaredTimer <= 0) {
    state.scaredTimer = 0;
    endFrightenedMode(state);
  }
}

function updateFruitTimer(state: GameState, dt: number): void {
  if (!state.fruit.active) return;
  state.fruit.timer -= dt * 1000;
  if (state.fruit.timer <= 0) state.fruit.active = false;
}

function updateParticles(state: GameState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function spawnDotParticles(state: GameState, pos: Vec2, color = '#FFD700'): void {
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 2;
    state.particles.push({
      x: pos.x + 0.5,
      y: pos.y + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color,
      size: 2 + Math.random() * 2,
    });
  }
}

function resetPositions(state: GameState): void {
  const cfg = LEVEL_CONFIG[state.level];
  const { mazeDef } = state;
  const pacSpawn = vecFromTile(mazeDef.pacmanSpawn);

  state.pacman.pos = { ...pacSpawn };
  state.pacman.tilePos = { ...mazeDef.pacmanSpawn };
  state.pacman.dir = 'left';
  state.pacman.nextDir = 'left';

  // Reset ghosts
  state.ghosts = createGhosts(state);
  for (const g of state.ghosts) g.speed = cfg.ghostSpeed;

  state.scaredTimer = 0;
  state.ghostCombo = 0;
  state.particles = [];
}

export function isGameWon(state: GameState): boolean {
  return state.dotsEaten >= state.dotsTotal;
}

export function isGameOver(state: GameState): boolean {
  return state.phase === 'gameOver';
}
