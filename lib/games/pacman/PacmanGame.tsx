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

const DPAD_BTN = 68;
const DPAD_GAP = 6;
const DPAD_HEIGHT = DPAD_BTN * 3 + DPAD_GAP * 2;

export default function PacmanGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const tileSizeRef = useRef(20);
  const callbacksFired = useRef({ complete: false, over: false });
  const startTimeRef = useRef(Date.now());
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // Reserve: HUD ~36px + cross D-pad + gaps
      const reserved = 36 + DPAD_HEIGHT + 24;
      const availH = rect.height - reserved;
      const availW = rect.width - 12;
      const byW = Math.floor(availW / cols);
      const byH = Math.floor(availH / rows);
      tileSizeRef.current = Math.max(Math.min(byW, byH), 10);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = cols * tileSizeRef.current;
        canvas.height = rows * tileSizeRef.current;
      }
    };

    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
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

      if (isGameWon(state) && !callbacksFired.current.complete) {
        callbacksFired.current.complete = true;
        state.phase = 'levelComplete';
        onLevelComplete(Date.now() - startTimeRef.current);
      }
      if (isGameOver(state) && !callbacksFired.current.over) {
        callbacksFired.current.over = true;
        onGameOver();
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const expectedW = state.mazeDef.cols * tileSizeRef.current;
        const expectedH = state.mazeDef.rows * tileSizeRef.current;
        if (canvas.width !== expectedW || canvas.height !== expectedH) {
          canvas.width = expectedW;
          canvas.height = expectedH;
        }
        renderFrame(ctx, state, tileSizeRef.current);
      }

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

  // Touch swipe on canvas
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

  // D-pad: press and hold support
  const handleDpadStart = useCallback((dir: Direction) => {
    if (stateRef.current) stateRef.current.pacman.nextDir = dir;
    setPressedDir(dir);
    if (navigator.vibrate) navigator.vibrate(18);
    holdIntervalRef.current = setInterval(() => {
      if (stateRef.current) stateRef.current.pacman.nextDir = dir;
    }, 80);
  }, []);

  const handleDpadEnd = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setPressedDir(null);
  }, []);

  // Cleanup hold interval on unmount
  useEffect(() => () => {
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
  }, []);

  const livesDisplay = [];
  for (let i = 0; i < hud.lives; i++) livesDisplay.push('👑');

  const dpadBtn = (dir: Direction, label: string) => {
    const pressed = pressedDir === dir;
    return (
      <button
        key={dir}
        onPointerDown={(e) => { e.preventDefault(); handleDpadStart(dir); }}
        onPointerUp={handleDpadEnd}
        onPointerLeave={handleDpadEnd}
        onPointerCancel={handleDpadEnd}
        style={{
          width: DPAD_BTN,
          height: DPAD_BTN,
          borderRadius: dir === 'up' ? '14px 14px 6px 6px'
            : dir === 'down' ? '6px 6px 14px 14px'
            : dir === 'left' ? '14px 6px 6px 14px'
            : '6px 14px 14px 6px',
          background: pressed
            ? 'linear-gradient(160deg, #2e7d32, #1b5e20)'
            : 'linear-gradient(160deg, #222, #141414)',
          border: `2px solid ${pressed ? '#4caf50' : '#333'}`,
          color: pressed ? '#fff' : '#FFD700',
          fontSize: 26,
          fontWeight: 700,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'none',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: pressed ? 'scale(0.88)' : 'scale(1)',
          transition: 'transform 0.08s, background 0.08s, border-color 0.08s, color 0.08s',
          boxShadow: pressed
            ? 'inset 0 2px 6px rgba(0,0,0,0.6)'
            : '0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center',
        height: '100%', gap: 4, padding: '4px 4px',
        paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
        background: '#0d1a0d',
        overflow: 'hidden',
      }}
    >
      {/* HUD */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', fontSize: 13,
        padding: '3px 10px', borderRadius: 8,
        background: 'rgba(0,0,0,0.4)',
        minHeight: 28, flexShrink: 0,
      }}>
        <span style={{ color: '#FFD700', fontWeight: 700, fontFamily: 'monospace' }}>
          🍫 {hud.score.toString().padStart(5, '0')}
        </span>
        <span style={{ letterSpacing: 2 }}>{livesDisplay.join('')}</span>
        <span style={{ color: '#666', fontSize: 11 }}>
          {hud.dotsLeft > 0 ? `${hud.dotsLeft} 🍫` : 'Bravo !'}
        </span>
        {hud.scared && (
          <span style={{ color: '#FF8C00', fontWeight: 700, fontSize: 12 }}>
            🧀 MUNSTER !
          </span>
        )}
      </div>

      {/* Canvas */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', minHeight: 0,
      }}>
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
            maxHeight: '100%',
          }}
        />
      </div>

      {/* Cross D-pad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${DPAD_BTN}px)`,
        gridTemplateRows: `repeat(3, ${DPAD_BTN}px)`,
        gap: DPAD_GAP,
        flexShrink: 0,
      }}>
        {/* Row 1 */}
        <div />
        {dpadBtn('up', '▲')}
        <div />
        {/* Row 2 */}
        {dpadBtn('left', '◀')}
        <div style={{
          borderRadius: 8,
          background: 'radial-gradient(circle, #1a1a1a, #0d0d0d)',
          border: '2px solid #222',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8)',
        }} />
        {dpadBtn('right', '▶')}
        {/* Row 3 */}
        <div />
        {dpadBtn('down', '▼')}
        <div />
      </div>
    </div>
  );
}
