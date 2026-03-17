'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  buildMaze, countDots, moveGhost, getNeighbors,
  ROWS, COLS, GHOST_SPEED, PACMAN_SPEED, GHOST_COUNT, GHOST_EMOJIS,
  type Cell, type Direction, type GhostState, type Pos,
} from './logic';
import type { GameProps } from '@/lib/types';

const SCARED_DURATION = 8000;

export default function PacmanGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [maze, setMaze] = useState<Cell[][]>(() => buildMaze());
  const [pacPos, setPacPos] = useState<Pos>({ row: 14, col: 9 });
  const [pacDir, setPacDir] = useState<Direction>('right');
  const [nextDir, setNextDir] = useState<Direction>('right');
  const [ghosts, setGhosts] = useState<GhostState[]>(() =>
    GHOST_EMOJIS.slice(0, GHOST_COUNT[level]).map((emoji, i) => ({
      pos: { row: 8 + (i % 2), col: 8 + i },
      dir: 'left' as Direction,
      scared: false,
      emoji,
    }))
  );
  const [score, setScore] = useState(0);
  const [dotsLeft, setDotsLeft] = useState(() => countDots(buildMaze()));
  const [lives, setLives] = useState(3);
  const [scaredTimer, setScaredTimer] = useState(0);
  const [dead, setDead] = useState(false);
  const startRef = useRef(Date.now());
  const mazeRef = useRef(maze);
  const pacRef = useRef(pacPos);
  const nextDirRef = useRef(nextDir);
  const ghostsRef = useRef(ghosts);
  mazeRef.current = maze;
  pacRef.current = pacPos;
  nextDirRef.current = nextDir;
  ghostsRef.current = ghosts;

  // Viewport size
  const [cellSize, setCellSize] = useState(18);
  useEffect(() => {
    const update = () => setCellSize(Math.floor(Math.min(window.innerWidth - 8, window.innerHeight - 160) / Math.max(ROWS, COLS)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const dirOffsets: Record<Direction, Pos> = {
    up: { row: -1, col: 0 }, down: { row: 1, col: 0 },
    left: { row: 0, col: -1 }, right: { row: 0, col: 1 },
  };

  // Pacman movement
  useEffect(() => {
    if (dead) return;
    const interval = setInterval(() => {
      const m = mazeRef.current;
      const pos = pacRef.current;
      const wantedDir = nextDirRef.current;
      const wantedOffset = dirOffsets[wantedDir];
      const wantedPos = { row: pos.row + wantedOffset.row, col: pos.col + wantedOffset.col };

      let newPos = pos;
      let newDir = pacDir;

      if (wantedPos.row >= 0 && wantedPos.row < ROWS && wantedPos.col >= 0 && wantedPos.col < COLS
        && m[wantedPos.row][wantedPos.col] !== 'wall') {
        newPos = wantedPos;
        newDir = wantedDir;
      } else {
        const curOffset = dirOffsets[pacDir];
        const straight = { row: pos.row + curOffset.row, col: pos.col + curOffset.col };
        if (straight.row >= 0 && straight.row < ROWS && straight.col >= 0 && straight.col < COLS
          && m[straight.row][straight.col] !== 'wall') {
          newPos = straight;
        }
      }

      if (newPos !== pos) {
        setPacDir(newDir);
        setPacPos(newPos);

        // Eat dot/power
        const cell = m[newPos.row][newPos.col];
        if (cell === 'dot' || cell === 'power') {
          const newMaze = m.map((r) => [...r]);
          newMaze[newPos.row][newPos.col] = 'empty';
          setMaze(newMaze);
          mazeRef.current = newMaze;

          const pts = cell === 'power' ? 50 : 10;
          setScore((s) => s + pts);
          setDotsLeft((d) => {
            const left = d - 1;
            if (left <= 0) onLevelComplete(Date.now() - startRef.current);
            return left;
          });

          if (cell === 'power') setScaredTimer(SCARED_DURATION);
        }
      }
    }, PACMAN_SPEED[level]);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, dead, pacDir]);

  // Scare timer countdown
  useEffect(() => {
    if (scaredTimer <= 0) return;
    const t = setTimeout(() => setScaredTimer((s) => Math.max(0, s - 100)), 100);
    return () => clearTimeout(t);
  }, [scaredTimer]);

  // Ghost movement
  useEffect(() => {
    if (dead) return;
    const interval = setInterval(() => {
      const scared = scaredTimer > 0;
      setGhosts((gs) =>
        gs.map((g) => moveGhost(mazeRef.current, g, pacRef.current, scared))
      );
    }, GHOST_SPEED[level]);
    return () => clearInterval(interval);
  }, [level, dead, scaredTimer]);

  // Collision detection
  useEffect(() => {
    const scared = scaredTimer > 0;
    ghosts.forEach((g) => {
      if (g.pos.row === pacPos.row && g.pos.col === pacPos.col) {
        if (scared) {
          setScore((s) => s + 200);
          setGhosts((gs) => gs.map((gh) =>
            gh.pos.row === g.pos.row && gh.pos.col === g.pos.col
              ? { ...gh, pos: { row: 8, col: 9 } } : gh
          ));
        } else {
          // Pacman dies
          if (lives <= 1) {
            setDead(true);
            onGameOver();
          } else {
            setLives((l) => l - 1);
            setPacPos({ row: 14, col: 9 });
          }
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacPos, ghosts]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      if (map[e.key]) { e.preventDefault(); setNextDir(map[e.key]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Touch swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      setNextDir(dx > 0 ? 'right' : 'left');
    } else {
      setNextDir(dy > 0 ? 'down' : 'up');
    }
  };

  const cellBg = (cell: Cell) => {
    if (cell === 'wall') return 'var(--rasta-green)';
    return 'var(--bg-dark)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', gap: '8px', padding: '8px' }}>
      {/* HUD */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '14px' }}>
        <span style={{ color: 'var(--rasta-gold)', fontWeight: 700 }}>🍒 {score}</span>
        <span style={{ color: 'var(--text-muted)' }}>{'❤️'.repeat(lives)}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>🟡 {dotsLeft}</span>
        {scaredTimer > 0 && <span style={{ color: '#87CEEB', animation: 'pulse-gold 0.5s infinite' }}>⚡ PEUR !</span>}
      </div>

      {/* Maze */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
          border: '2px solid var(--rasta-green)',
          borderRadius: '4px',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        {maze.map((row, r) =>
          row.map((cell, c) => {
            const isPac = pacPos.row === r && pacPos.col === c;
            const ghost = ghosts.find((g) => g.pos.row === r && g.pos.col === c);
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: cellBg(cell),
                  borderRadius: cell === 'wall' ? '2px' : 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: cellSize * 0.55,
                  lineHeight: 1,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isPac && <span>🏃</span>}
                {!isPac && ghost && <span>{scaredTimer > 0 ? '💙' : ghost.emoji}</span>}
                {!isPac && !ghost && cell === 'dot' && (
                  <div style={{ width: cellSize * 0.18, height: cellSize * 0.18, borderRadius: '50%', background: 'var(--rasta-gold)' }} />
                )}
                {!isPac && !ghost && cell === 'power' && (
                  <div style={{ width: cellSize * 0.42, height: cellSize * 0.42, borderRadius: '50%', background: 'var(--rasta-gold)', boxShadow: '0 0 4px var(--rasta-gold)' }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* D-pad for mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 44px)', gridTemplateRows: 'repeat(3, 44px)', gap: '4px' }}>
        {[
          [null, 'up', null],
          ['left', null, 'right'],
          [null, 'down', null],
        ].flat().map((dir, i) => (
          <button
            key={i}
            disabled={!dir}
            onClick={() => dir && setNextDir(dir as Direction)}
            style={{
              width: 44, height: 44, borderRadius: '10px',
              background: dir ? 'var(--bg-card)' : 'transparent',
              border: dir ? '2px solid var(--border-color)' : 'none',
              color: 'var(--rasta-gold)', fontSize: '20px',
              cursor: dir ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
              visibility: dir ? 'visible' : 'hidden',
            }}
          >
            {dir === 'up' ? '▲' : dir === 'down' ? '▼' : dir === 'left' ? '◀' : '▶'}
          </button>
        ))}
      </div>
    </div>
  );
}
