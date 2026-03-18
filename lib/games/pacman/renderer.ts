import type { GameState, Ghost, Direction } from './types';
import { COLORS, DEATH_ANIM_DURATION, ENEMY_EMOJIS } from './config';

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
  drawBonusItem(ctx, state, tileSize);

  // Draw enemies (eaten = just eyes)
  for (const g of state.ghosts) {
    if (g.mode !== 'eaten') drawEnemy(ctx, g, state, tileSize);
  }
  for (const g of state.ghosts) {
    if (g.mode === 'eaten') drawEatenEnemy(ctx, g, tileSize);
  }

  // Draw Shlagonie
  if (state.phase !== 'dying') {
    drawShlagonie(ctx, state, tileSize);
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

      ctx.fillStyle = COLORS.wallFill;
      ctx.beginPath();
      roundRect(ctx, x + pad, y + pad, ts - pad * 2, ts - pad * 2, 3);
      ctx.fill();

      ctx.strokeStyle = COLORS.wallStroke;
      ctx.lineWidth = 1.5;

      if (r === 0 || maze[r - 1][c] !== 'wall') {
        ctx.beginPath(); ctx.moveTo(x + pad, y + pad); ctx.lineTo(x + ts - pad, y + pad); ctx.stroke();
      }
      if (r === mazeDef.rows - 1 || maze[r + 1]?.[c] !== 'wall') {
        ctx.beginPath(); ctx.moveTo(x + pad, y + ts - pad); ctx.lineTo(x + ts - pad, y + ts - pad); ctx.stroke();
      }
      if (c === 0 || maze[r][c - 1] !== 'wall') {
        ctx.beginPath(); ctx.moveTo(x + pad, y + pad); ctx.lineTo(x + pad, y + ts - pad); ctx.stroke();
      }
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
        // Petit pot de Nutella (point)
        // Pot marron
        ctx.fillStyle = '#5C3317';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.12, 0, Math.PI * 2);
        ctx.fill();
        // Reflet doré (couvercle Nutella)
        ctx.fillStyle = 'rgba(255,215,0,0.6)';
        ctx.beginPath();
        ctx.arc(cx, cy - ts * 0.04, ts * 0.06, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 'power') {
        // Munster puant (power pellet) — fait fuir les légumes !
        const pulse = 0.85 + 0.15 * Math.sin(elapsed * 0.006);
        const radius = ts * 0.32 * pulse;
        ctx.save();
        ctx.shadowColor = 'rgba(255,140,0,0.5)';
        ctx.shadowBlur = 10;
        // Orange circle (munster)
        ctx.fillStyle = COLORS.powerPellet;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        // Stink lines
        ctx.strokeStyle = 'rgba(150,200,50,0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const angle = -Math.PI / 2 + (i - 1) * 0.4;
          const wave = Math.sin(elapsed * 0.008 + i * 2) * 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
          ctx.quadraticCurveTo(
            cx + Math.cos(angle) * (radius + ts * 0.2) + wave,
            cy + Math.sin(angle) * (radius + ts * 0.2),
            cx + Math.cos(angle) * (radius + ts * 0.35),
            cy + Math.sin(angle) * (radius + ts * 0.35) + wave,
          );
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
}

function drawShlagonie(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  const { pacman } = state;
  const cx = pacman.pos.x * ts + ts / 2;
  const cy = pacman.pos.y * ts + ts / 2;
  const emojiSize = ts * 1.1;

  ctx.save();
  ctx.translate(cx, cy);

  // Subtle bob
  const bob = Math.sin(state.elapsed * 0.008) * ts * 0.03;

  // Golden glow behind the queen
  ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
  ctx.shadowBlur = ts * 0.5;

  // Pulsing glow
  const glowPulse = 0.3 + 0.15 * Math.sin(state.elapsed * 0.004);
  ctx.fillStyle = `rgba(255, 215, 0, ${glowPulse})`;
  ctx.beginPath();
  ctx.arc(0, bob, ts * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Direction flip: face left if going left
  if (pacman.dir === 'left') {
    ctx.scale(-1, 1);
  }

  // Draw queen emoji — large and visible
  ctx.shadowColor = 'rgba(255, 215, 0, 1)';
  ctx.shadowBlur = ts * 0.6;
  ctx.font = `${emojiSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👑', 0, bob);

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, ghost: Ghost, state: GameState, ts: number): void {
  const cx = ghost.pos.x * ts + ts / 2;
  const cy = ghost.pos.y * ts + ts / 2;
  const isFrightened = ghost.mode === 'frightened';
  const emojiSize = ts * 0.75;

  ctx.save();

  if (isFrightened) {
    // Frightened: blue tinted, flashing when about to end
    const flashPhase = state.scaredTimer < 2000;
    const visible = !flashPhase || Math.floor(state.elapsed / 150) % 2 === 0;

    if (visible) {
      // Draw scared emoji with blue tint
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = COLORS.ghostFrightened;
      ctx.beginPath();
      ctx.arc(cx, cy, ts * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Scared face
      ctx.font = `${emojiSize * 0.7}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('😰', cx, cy);
    }
  } else {
    // Normal: draw vegetable/fruit emoji
    const emoji = ENEMY_EMOJIS[ghost.name] || '🥬';

    // Subtle bounce
    const bounce = Math.sin(state.elapsed * 0.005 + ghost.bobOffset) * ts * 0.04;

    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, cx, cy + bounce);
  }

  ctx.restore();
}

function drawEatenEnemy(ctx: CanvasRenderingContext2D, ghost: Ghost, ts: number): void {
  // Just a small wilted leaf returning to base
  const cx = ghost.pos.x * ts + ts / 2;
  const cy = ghost.pos.y * ts + ts / 2;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.font = `${ts * 0.4}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🥀', cx, cy);
  ctx.restore();
}

function drawBonusItem(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  if (!state.fruit.active) return;
  const { row, col } = state.fruit.pos;
  const cx = col * ts + ts / 2;
  const cy = row * ts + ts / 2;

  // Pulsing bonus
  const pulse = 0.9 + 0.1 * Math.sin(state.elapsed * 0.006);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.font = `${ts * 0.75}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.fruit.emoji, 0, 0);
  ctx.restore();
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

  // Crown emoji above
  ctx.font = `${ts * 1.5}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👑', cx, cy - ts * 1.2);

  // "FUYEZ !" text
  ctx.font = `bold ${ts * 1.0}px monospace`;
  ctx.fillStyle = COLORS.readyText;
  ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText('FUYEZ !', cx, cy);

  ctx.restore();
}

function drawDeathAnimation(ctx: CanvasRenderingContext2D, state: GameState, ts: number): void {
  if (!state.deathPos) return;
  const cx = state.deathPos.x * ts + ts / 2;
  const cy = state.deathPos.y * ts + ts / 2;
  const progress = 1 - state.deathAnimTimer / DEATH_ANIM_DURATION;

  const shrink = Math.max(0, 1 - progress * 1.3);
  const spin = progress * Math.PI * 3;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.scale(shrink, shrink);
  ctx.globalAlpha = shrink;

  ctx.font = `${ts * 1.1}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👑', 0, 0);

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
