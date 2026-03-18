'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/lib/types';
import type { Direction, GameState } from './types';
import { createGameState, tickGame, isGameWon, isGameOver } from './engine';
import { renderFrame } from './renderer';

interface HudState {
  score: number;
  lives: number;
  dotsLeft: number;
  scared: boolean;
  scaredTimer: number;
}

export default function PacmanGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const tileSizeRef = useRef(20);
  const callbacksFired = useRef({ complete: false, over: false });
  const startTimeRef = useRef(Date.now());

  const [hud, setHud] = useState<HudState>({ score: 0, lives: 3, dotsLeft: 0, scared: false, scaredTimer: 0 });
  const [pressedDir, setPressedDir] = useState<Direction | null>(null);

  // Initialize game state
  useEffect(() => {
    const state = createGameState(level);
    stateRef.current = state;
    startTimeRef.current = Date.now();
    setHud({
      score: state.score,
      lives: state.lives,
      dotsLeft: state.dotsTotal - state.dotsEaten,
      scared: false,
      scaredTimer: 0,
    });
  }, [level]);

  // ResizeObserver for responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const state = stateRef.current;
      if (!state) return;
      const { cols, rows } = state.mazeDef;
      const rect = container.getBoundingClientRect();
      // Leave space for HUD (40px) and D-pad (160px)
      const availH = rect.height - 200;
      const availW = rect.width - 8;
      const byW = Math.floor(availW / cols);
      const byH = Math.floor(availH / rows);
      tileSizeRef.current = Math.max(Math.min(byW, byH, 28), 10);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = cols * tileSizeRef.current;
        canvas.height = rows * tileSizeRef.current;
      }
    };

    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    // Initial
    setTimeout(updateSize, 50);
    return () => ro.disconnect();
  }, []);

  // Game loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId = 0;
    let hudCounter = 0;

    const loop = (now: number) => {
      const state = stateRef.current;
      const canvas = canvasRef.current;
      if (!state || !canvas) { animId = requestAnimationFrame(loop); return; }

      const dt = (now - lastTime) / 1000;
      lastTime = now;

      tickGame(state, dt);

      // Check win/lose
      if (isGameWon(state) && !callbacksFired.current.complete) {
        callbacksFired.current.complete = true;
        state.phase = 'levelComplete';
        onLevelComplete(Date.now() - startTimeRef.current);
      }
      if (isGameOver(state) && !callbacksFired.current.over) {
        callbacksFired.current.over = true;
        onGameOver();
      }

      // Render
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Ensure canvas dimensions match
        const expectedW = state.mazeDef.cols * tileSizeRef.current;
        const expectedH = state.mazeDef.rows * tileSizeRef.current;
        if (canvas.width !== expectedW || canvas.height !== expectedH) {
          canvas.width = expectedW;
          canvas.height = expectedH;
        }
        renderFrame(ctx, state, tileSizeRef.current);
      }

      // Update HUD ~4x/s to avoid excessive re-renders
      hudCounter++;
      if (hudCounter % 15 === 0) {
        setHud({
          score: state.score,
          lives: state.lives,
          dotsLeft: state.dotsTotal - state.dotsEaten,
          scared: state.scaredTimer > 0,
          scaredTimer: state.scaredTimer,
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onLevelComplete, onGameOver]);

  // Keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      const dir = map[e.key];
      if (dir && stateRef.current) {
        e.preventDefault();
        stateRef.current.pacman.nextDir = dir;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Touch swipe
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !stateRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      stateRef.current.pacman.nextDir = dx > 0 ? 'right' : 'left';
    } else {
      stateRef.current.pacman.nextDir = dy > 0 ? 'down' : 'up';
    }
  }, []);

  // D-pad handler
  const handleDpad = useCallback((dir: Direction) => {
    if (stateRef.current) stateRef.current.pacman.nextDir = dir;
    setPressedDir(dir);
    setTimeout(() => setPressedDir(null), 120);
  }, []);

  const livesDisplay = [];
  for (let i = 0; i < hud.lives; i++) livesDisplay.push('🟡');

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        height: '100%', gap: 6, padding: '6px 4px',
        background: '#0d1a0d',
      }}
    >
      {/* HUD */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center', fontSize: 13,
        padding: '4px 12px', borderRadius: 8,
        background: 'rgba(0,0,0,0.4)',
        minHeight: 32,
      }}>
        <span style={{ color: '#FFD700', fontWeight: 700, fontFamily: 'monospace' }}>
          {hud.score.toString().padStart(5, '0')}
        </span>
        <span style={{ color: '#999', letterSpacing: 2 }}>{livesDisplay.join('')}</span>
        <span style={{ color: '#666', fontSize: 11 }}>
          {hud.dotsLeft > 0 ? `${hud.dotsLeft} restants` : 'Terminé !'}
        </span>
        {hud.scared && (
          <span style={{
            color: '#87CEEB',
            animation: hud.scaredTimer < 2000 ? 'none' : undefined,
            fontWeight: 700,
          }}>
            PEUR !
          </span>
        )}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction: 'none',
          userSelect: 'none',
          borderRadius: 6,
          border: '2px solid #228B22',
          maxWidth: '100%',
        }}
      />

      {/* D-pad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 56px)',
        gridTemplateRows: 'repeat(3, 56px)',
        gap: 4,
        marginTop: 4,
      }}>
        {([
          [null, 'up', null],
          ['left', null, 'right'],
          [null, 'down', null],
        ] as (Direction | null)[][]).flat().map((dir, i) => (
          <button
            key={i}
            disabled={!dir}
            onPointerDown={() => dir && handleDpad(dir)}
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: dir
                ? pressedDir === dir
                  ? 'linear-gradient(180deg, #2e7d32, #1b5e20)'
                  : 'linear-gradient(180deg, #1a1a1a, #111)'
                : 'transparent',
              border: dir ? '2px solid #333' : 'none',
              color: '#FFD700',
              fontSize: 22,
              cursor: dir ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
              visibility: dir ? 'visible' : 'hidden',
              transition: 'transform 0.1s, background 0.1s',
              transform: pressedDir === dir ? 'scale(0.9)' : 'scale(1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {dir === 'up' ? '▲' : dir === 'down' ? '▼' : dir === 'left' ? '◀' : '▶'}
          </button>
        ))}
      </div>
    </div>
  );
}
