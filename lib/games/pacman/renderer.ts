import type { GameState, Ghost, Direction } from './types';
import { COLORS, DEATH_ANIM_DURATION } from './config';

const DIR_ROTATION: Record<Direction, number> = {
  right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2,
};

export function renderFrame(ctx: CanvasRenderingContext2D, state: GameState, tileSize: number): void {
  const w = state.mazeDef.cols * tileSize;
  const h = state.mazeDef.rows * tileSize;
  ctx.clearRect(0, 0, w, h);

  // Flash effect
  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.flashTimer * 0.003})`;
    ctx.fillRect(0, 0, w, h);
  }

  drawMaze(ctx, state, tileSize);
  drawDots(ctx, state, tileSize);
  drawFruit(ctx, state, tileSize);

  // Draw ghosts (eaten ghosts = just eyes, draw on top)
  for (const g of state.ghosts) {
    if (g.mode !== 'eaten') drawGhost(ctx, g, state, tileSize);
  }
  for (const g of state.ghosts) {
    if (g.mode === 'eaten') drawGhostEyes(ctx, g, tileSize);
  }

  // Draw Pacman (except during death anim — handled separately)
  if (state.phase !== 'dying') {
    drawPacman(ctx, state, tileSize);
  } else {
    drawDeathAnimation(ctx, state, tileSize);
  }

  drawParticles(ctx, state, tileSize);

  if (state.phase === 'ready') {
    drawReadyText(ctx, state, tileSize);
  }
}

function drawMaze(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  const { maze, mazeDef } = state;
  ctx.save();

  for (let r = 0; r < mazeDef.rows; r++) {
    for (let c = 0; c < mazeDef.cols; c++) {
      if (maze[r][c] !== 'wall') continue;

      const x = c * ts;
      const y = r * ts;
      const pad = 1;

      // Fill
      ctx.fillStyle = COLORS.wallFill;
      ctx.beginPath();
      roundRect(ctx, x + pad, y + pad, ts - pad * 2, ts - pad * 2, 3);
      ctx.fill();

      // Only draw borders on sides facing non-wall tiles
      ctx.strokeStyle = COLORS.wallStroke;
      ctx.lineWidth = 1.5;

      // Top border
      if (r === 0 || maze[r - 1][c] !== 'wall') {
        ctx.beginPath(); ctx.moveTo(x + pad, y + pad); ctx.lineTo(x + ts - pad, y + pad); ctx.stroke();
      }
      // Bottom border
      if (r === mazeDef.rows - 1 || maze[r + 1]?.[c] !== 'wall') {
        ctx.beginPath(); ctx.moveTo(x + pad, y + ts - pad); ctx.lineTo(x + ts - pad, y + ts - pad); ctx.stroke();
      }
      // Left border
      if (c === 0 || maze[r][c - 1] !== 'wall') {
        ctx.beginPath(); ctx.moveTo(x + pad, y + pad); ctx.lineTo(x + pad, y + ts - pad); ctx.stroke();
      }
      // Right border
      if (c === mazeDef.cols - 1 || maze[r][c + 1] !== 'wall') {
        ctx.beginPath(); ctx.moveTo(x + ts - pad, y + pad); ctx.lineTo(x + ts - pad, y + ts - pad); ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function drawDots(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  const { maze, mazeDef, elapsed } = state;

  for (let r = 0; r < mazeDef.rows; r++) {
    for (let c = 0; c < mazeDef.cols; c++) {
      const tile = maze[r][c];
      const cx = c * ts + ts / 2;
      const cy = r * ts + ts / 2;

      if (tile === 'dot') {
        ctx.fillStyle = COLORS.dot;
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 'power') {
        const pulse = 0.8 + 0.2 * Math.sin(elapsed * 0.005);
        const radius = ts * 0.3 * pulse;
        ctx.save();
        ctx.shadowColor = COLORS.dotGlow;
        ctx.shadowBlur = 8;
        ctx.fillStyle = COLORS.powerPellet;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

function drawPacman(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  const { pacman } = state;
  const cx = pacman.pos.x * ts + ts / 2;
  const cy = pacman.pos.y * ts + ts / 2;
  const radius = ts * 0.42;
  const rotation = DIR_ROTATION[pacman.dir];
  const mouthAngle = pacman.mouthAngle * (Math.PI / 4);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // Body
  ctx.fillStyle = COLORS.pacman;
  ctx.beginPath();
  ctx.arc(0, 0, radius, mouthAngle, Math.PI * 2 - mouthAngle);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(radius * 0.2, -radius * 0.35, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGhost(ctx: CanvasRenderingContext2D, ghost: Ghost, state: GameState, ts: number): void {
  const cx = ghost.pos.x * ts + ts / 2;
  const cy = ghost.pos.y * ts + ts / 2;
  const r = ts * 0.42;
  const isFrightened = ghost.mode === 'frightened';

  // Color
  let bodyColor = ghost.color;
  if (isFrightened) {
    const flashPhase = state.scaredTimer < 2000;
    if (flashPhase) {
      bodyColor = Math.floor(state.elapsed / 150) % 2 === 0 ? COLORS.ghostFrightened : COLORS.ghostFrightenedFlash;
    } else {
      bodyColor = COLORS.ghostFrightened;
    }
  }

  ctx.save();

  // Body: semicircle top + rect bottom + scallops
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  // Top arc
  ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0);
  // Right side down
  ctx.lineTo(cx + r, cy + r * 0.7);
  // Bottom scallops (3)
  const scW = (r * 2) / 3;
  for (let i = 2; i >= 0; i--) {
    const sx = cx - r + scW * i + scW / 2;
    ctx.arc(sx, cy + r * 0.7, scW / 2, 0, Math.PI, false);
  }
  ctx.lineTo(cx - r, cy - r * 0.15);
  ctx.closePath();
  ctx.fill();

  // Eyes
  if (!isFrightened) {
    drawGhostEyesInner(ctx, ghost, cx, cy, r);
  } else {
    // Frightened face: simple dots
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.1, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Wavy mouth
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.4, cy + r * 0.25);
    for (let i = 0; i < 4; i++) {
      const sx = cx - r * 0.4 + (r * 0.8 / 4) * (i + 0.5);
      const sy = cy + r * 0.25 + (i % 2 === 0 ? -r * 0.1 : r * 0.1);
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawGhostEyes(ctx: CanvasRenderingContext2D, ghost: Ghost, ts: number): void {
  const cx = ghost.pos.x * ts + ts / 2;
  const cy = ghost.pos.y * ts + ts / 2;
  const r = ts * 0.42;
  drawGhostEyesInner(ctx, ghost, cx, cy, r);
}

function drawGhostEyesInner(ctx: CanvasRenderingContext2D, ghost: Ghost, cx: number, cy: number, r: number): void {
  const dir = ghost.dir;
  const eyeOffX = dir === 'left' ? -0.12 : dir === 'right' ? 0.12 : 0;
  const eyeOffY = dir === 'up' ? -0.12 : dir === 'down' ? 0.12 : 0;

  // White part
  ctx.fillStyle = COLORS.ghostEyes;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * r * 0.28, cy - r * 0.1, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pupils
  ctx.fillStyle = COLORS.ghostPupil;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * r * 0.28 + eyeOffX * r, cy - r * 0.1 + eyeOffY * r, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFruit(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  if (!state.fruit.active) return;
  const { row, col } = state.fruit.pos;
  const cx = col * ts + ts / 2;
  const cy = row * ts + ts / 2;

  ctx.font = `${ts * 0.7}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.fruit.emoji, cx, cy);
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * ts, p.y * ts, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawReadyText(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  const cx = (state.mazeDef.cols * ts) / 2;
  const cy = (state.mazeDef.rows * ts) / 2 + ts;

  const alpha = Math.min(1, state.readyTimer / 500);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${ts * 1.2}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.readyText;
  ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText('PRÊT !', cx, cy);
  ctx.restore();
}

function drawDeathAnimation(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  if (!state.deathPos) return;
  const cx = state.deathPos.x * ts + ts / 2;
  const cy = state.deathPos.y * ts + ts / 2;
  const radius = ts * 0.42;
  const progress = 1 - state.deathAnimTimer / DEATH_ANIM_DURATION;

  const shrink = Math.max(0, 1 - progress * 1.3);
  const spin = progress * Math.PI * 3;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.scale(shrink, shrink);

  ctx.fillStyle = COLORS.pacman;
  ctx.beginPath();
  // Mouth opens wider as dying
  const mouthAngle = progress * Math.PI;
  ctx.arc(0, 0, radius, mouthAngle, Math.PI * 2 - mouthAngle);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
