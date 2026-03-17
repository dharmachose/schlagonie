'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { GameProps, DifficultyLevel } from '@/lib/types';
import type { GameState, Tower, TowerType, Tile, Pos } from './types';
import { LEVELS } from './levels';
import { TILE_SIZE, TOWER_DEFS, TOWER_COSTS, TOWER_LABELS, PLACEMENT_DURATION } from './config';
import { tileCenter, buildSpawnQueue, updateBattle } from './engine';

// ─── Canvas dimensions ────────────────────────────────────────────────────────
const CANVAS_W = 16 * TILE_SIZE; // 640
const CANVAS_H = 11 * TILE_SIZE; // 440

// ─── Tile colors ──────────────────────────────────────────────────────────────
const TILE_COLORS: Record<string, string> = {
  BUILD:   '#2d5a1b',
  PATH:    '#8B6914',
  BLOCKED: '#1a3a0a',
  CORE:    '#8B0000',
};

const TOWER_TYPES: TowerType[] = ['canon', 'baffe', 'piege', 'mortier', 'glace'];

let _idCounter = 0;
const uid = () => `t${++_idCounter}`;

export default function TowerGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const lvlIdx = (level as number) - 1;
  const levelConfig = LEVELS[lvlIdx];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    phase: 'placement',
    wave: 0,
    lives: levelConfig.startLives,
    gold: levelConfig.startGold,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    placementTimer: PLACEMENT_DURATION,
    spawnedCount: 0,
  });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const waveStartRef = useRef<number>(0); // ms since wave start
  const gameOverFiredRef = useRef(false);
  const victoryFiredRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  const [selectedTower, setSelectedTower] = useState<TowerType>('canon');
  const [, forceUpdate] = useState(0);
  const tick = useCallback(() => forceUpdate(n => n + 1), []);

  // ─── Rendering ──────────────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;
    const cfg = levelConfig;

    // scale for mobile
    const scale = canvas.clientWidth / CANVAS_W;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    // ── Draw grid ──
    for (let row = 0; row < cfg.rows; row++) {
      for (let col = 0; col < cfg.cols; col++) {
        const tileType = cfg.grid[row]?.[col] ?? 'BUILD';
        ctx.fillStyle = TILE_COLORS[tileType] ?? TILE_COLORS.BUILD;
        ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // subtle grid lines
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // ── Highlight buildable cells on hover (placement phase) ──
    if (state.phase === 'placement') {
      for (let row = 0; row < cfg.rows; row++) {
        for (let col = 0; col < cfg.cols; col++) {
          const tileType = cfg.grid[row]?.[col];
          if (tileType !== 'BUILD') continue;
          const occupied = state.towers.some(t => t.col === col && t.row === row);
          if (!occupied) {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(col * TILE_SIZE + 1, row * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          }
        }
      }
    }

    // ── Draw CORE (Mairie) emoji ──
    for (let row = 0; row < cfg.rows; row++) {
      for (let col = 0; col < cfg.cols; col++) {
        if (cfg.grid[row]?.[col] === 'CORE') {
          ctx.font = `${TILE_SIZE * 0.8}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🏛️', col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
        }
      }
    }

    // ── Draw towers ──
    for (const tower of state.towers) {
      const cx = tower.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = tower.row * TILE_SIZE + TILE_SIZE / 2;
      const r = TILE_SIZE * 0.44;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = tower.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `${TILE_SIZE * 0.55}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tower.emoji, cx, cy);
    }

    // ── Draw projectiles ──
    for (const proj of state.projectiles) {
      ctx.beginPath();
      ctx.arc(proj.pos.x, proj.pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.fill();
    }

    // ── Draw enemies ──
    for (const enemy of state.enemies) {
      if (!enemy.alive || !enemy.spawned || enemy.reached) continue;

      // HP bar background
      const barW = 28;
      const barH = 4;
      const barX = enemy.pos.x - barW / 2;
      const barY = enemy.pos.y - 18;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);

      // HP bar fill
      const hpPct = enemy.hp / enemy.maxHp;
      ctx.fillStyle = hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(barX, barY, barW * hpPct, barH);

      // Frozen overlay
      if (enemy.frozen) {
        ctx.fillStyle = 'rgba(79,195,247,0.4)';
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Slowed overlay
      if (enemy.slow < 1 && !enemy.frozen) {
        ctx.fillStyle = 'rgba(0,150,200,0.3)';
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Enemy emoji
      const sz = enemy.type === 'boss' ? TILE_SIZE * 0.85 : TILE_SIZE * 0.6;
      ctx.font = `${sz}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(enemy.emoji, enemy.pos.x, enemy.pos.y);
    }

    // ── Draw particles ──
    const now = Date.now();
    for (const p of state.particles) {
      const age = now - p.createdAt;
      const alpha = 1 - age / p.duration;
      ctx.globalAlpha = Math.max(0, alpha);
      const scale = p.scale + age / p.duration * 0.5;
      ctx.font = `${TILE_SIZE * 0.6 * scale}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, p.pos.x, p.pos.y - age * 0.04);
      ctx.globalAlpha = 1;
    }

    void scale; // used via CSS
  }, [levelConfig]);

  // ─── Game loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const state = stateRef.current;

    // init first wave queue
    state.enemies = buildSpawnQueue(levelConfig.waves[0], levelConfig.paths);
    waveStartRef.current = 0;
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dtMs = Math.min(now - lastTimeRef.current, 50); // cap at 50ms
      lastTimeRef.current = now;

      if (state.phase === 'placement') {
        state.placementTimer = Math.max(0, state.placementTimer - dtMs);
        if (state.placementTimer <= 0) {
          startWave();
        }
      } else if (state.phase === 'battle') {
        waveStartRef.current += dtMs;
        const result = updateBattle(state, levelConfig, dtMs, now, waveStartRef.current);

        state.lives = Math.max(0, state.lives - result.livesLost);
        state.gold += result.goldEarned;

        if (state.lives <= 0 && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true;
          state.phase = 'defeat';
          tick();
          onGameOver();
          return;
        }

        if (result.waveComplete) {
          const nextWave = state.wave + 1;
          if (nextWave >= levelConfig.waves.length) {
            // Victory!
            if (!victoryFiredRef.current) {
              victoryFiredRef.current = true;
              state.phase = 'victory';
              tick();
              onLevelComplete(Date.now() - startTimeRef.current);
            }
            return;
          } else {
            state.wave = nextWave;
            state.phase = 'wave_end';
            state.placementTimer = PLACEMENT_DURATION;
            state.enemies = buildSpawnQueue(levelConfig.waves[nextWave], levelConfig.paths);
            state.projectiles = [];
            waveStartRef.current = 0;
            tick();
          }
        }
      } else if (state.phase === 'wave_end') {
        state.placementTimer = Math.max(0, state.placementTimer - dtMs);
        if (state.placementTimer <= 0) startWave();
      }

      render();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Start a wave ─────────────────────────────────────────────────────────
  function startWave() {
    const state = stateRef.current;
    state.phase = 'battle';
    waveStartRef.current = 0;
    tick();
  }

  // ─── Canvas click → place tower ──────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    if (state.phase !== 'placement' && state.phase !== 'wave_end') return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    const tileType = levelConfig.grid[row]?.[col];
    if (tileType !== 'BUILD') return;

    const cost = TOWER_COSTS[selectedTower];
    if (state.gold < cost) return;

    const occupied = state.towers.some(t => t.col === col && t.row === row);
    if (occupied) return;

    const def = TOWER_DEFS[selectedTower];
    const tower: Tower = {
      ...def,
      id: uid(),
      col,
      row,
      lastShot: 0,
    };
    state.towers.push(tower);
    state.gold -= cost;
    tick();
  }, [selectedTower, levelConfig, tick]);

  // ─── Render stats from ref ────────────────────────────────────────────────
  const state = stateRef.current;
  const isPlacing = state.phase === 'placement' || state.phase === 'wave_end';
  const timerSec = Math.ceil(state.placementTimer / 1000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a1a0a', overflow: 'hidden' }}>
      {/* ── Top HUD ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px', background: '#111', borderBottom: '1px solid #333',
        fontSize: 14, flexShrink: 0, gap: 8,
      }}>
        <span>❤️ <strong style={{ color: '#f44336' }}>{state.lives}</strong></span>
        <span>💰 <strong style={{ color: '#FFD700' }}>{state.gold}g</strong></span>
        <span style={{ color: '#aaa', fontSize: 12 }}>
          Vague <strong style={{ color: '#fff' }}>{state.wave + 1}</strong>/{levelConfig.waves.length}
        </span>
        {state.phase === 'battle' && (
          <span style={{ color: '#ff9800', fontWeight: 'bold', fontSize: 12 }}>⚔️ Bataille !</span>
        )}
        {isPlacing && (
          <span style={{ color: '#4caf50', fontWeight: 'bold', fontSize: 12 }}>🏗️ {timerSec}s</span>
        )}
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handleCanvasClick}
          style={{
            width: '100%',
            maxWidth: CANVAS_W,
            imageRendering: 'pixelated',
            cursor: isPlacing ? 'crosshair' : 'default',
            display: 'block',
          }}
        />
      </div>

      {/* ── Tower selection + launch button ── */}
      <div style={{
        background: '#111', borderTop: '1px solid #333',
        padding: '8px', flexShrink: 0,
      }}>
        {/* Tower picker */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          {TOWER_TYPES.map(type => {
            const def = TOWER_DEFS[type];
            const cost = TOWER_COSTS[type];
            const canAfford = state.gold >= cost;
            const selected = selectedTower === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedTower(type)}
                title={`${TOWER_LABELS[type]} — ${cost}g\nDMG:${def.damage} RNG:${def.range} FR:${def.fireRate}/s`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '4px 6px', borderRadius: 8, border: selected ? `2px solid ${def.color}` : '2px solid #333',
                  background: selected ? '#222' : '#1a1a1a',
                  color: canAfford ? '#fff' : '#666',
                  cursor: 'pointer', minWidth: 52, opacity: canAfford ? 1 : 0.5,
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: 20 }}>{def.emoji}</span>
                <span style={{ fontSize: 10, color: '#FFD700' }}>{cost}g</span>
              </button>
            );
          })}
        </div>

        {/* Selected tower info + launch button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: '#888' }}>
            {TOWER_LABELS[selectedTower]} · {TOWER_COSTS[selectedTower]}g
          </span>
          {isPlacing && (
            <button
              onClick={startWave}
              style={{
                padding: '6px 16px', borderRadius: 8,
                background: '#4caf50', color: '#fff',
                border: 'none', fontWeight: 'bold', fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ⚔️ Lancer la vague {state.wave + 1}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
