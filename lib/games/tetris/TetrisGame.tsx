'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import {
  emptyBoard, randomPiece, isValid, placePiece, clearLines, rotate,
  BOARD_COLS, BOARD_ROWS, DROP_SPEED, scoreLines,
  type Board, type Tetromino, type TetrominoType,
} from './logic';
import { LogPiece, computeOuterPolygon, type Cell } from './LogPiece';
import type { GameProps } from '@/lib/types';

const WIN_SCORE: Record<number, number> = { 1: 500, 2: 800, 3: 1200, 4: 1800, 5: 2500 };

// ── Connected-component detection (same-type adjacent cells) ──────────────
type Component = { type: TetrominoType; cells: Cell[] };

function findComponents(board: Board): Component[] {
  const visited = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(false));
  const result: Component[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (visited[r][c] || !board[r][c]) continue;
      const type = board[r][c]!;
      const cells: Cell[] = [];
      const q = [{ row: r, col: c }];
      while (q.length) {
        const { row, col } = q.pop()!;
        if (visited[row][col]) continue;
        visited[row][col] = true;
        cells.push({ row, col });
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS
            && !visited[nr][nc] && board[nr][nc] === type) q.push({ row: nr, col: nc });
        }
      }
      result.push({ type, cells });
    }
  }
  return result;
}

// ── Board scene (3D) ──────────────────────────────────────────────────────
function BoardScene({
  board, current, ghostRow,
}: { board: Board; current: Tetromino; ghostRow: number }) {
  const components = findComponents(board);

  const activeCells: Cell[] = current.cells
    .map(([dr, dc]) => ({ row: current.row + dr, col: current.col + dc }))
    .filter(c => c.row >= 0 && c.row < BOARD_ROWS);

  const ghostCells: Cell[] = current.cells
    .map(([dr, dc]) => ({ row: ghostRow + dr, col: current.col + dc }))
    .filter(c => c.row >= 0 && c.row < BOARD_ROWS);

  const showGhost = ghostRow !== current.row;

  // Board center: col 0..9, row 0..19 → Three.js X=0..9, Y=0..-19
  // Camera looks at center (4.5, -9.5, 0)
  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={0.55} />
      {/* Main sun — top-right-front */}
      <directionalLight
        position={[8, 6, 14]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-6}
        shadow-camera-right={16}
        shadow-camera-top={4}
        shadow-camera-bottom={-24}
      />
      {/* Warm fill — left side */}
      <pointLight position={[-3, -8, 8]} intensity={0.5} color="#e8b060" />
      {/* Cool rim — back */}
      <pointLight position={[5, -5, -4]} intensity={0.25} color="#88aacc" />

      {/* ── Board background plane ── */}
      <mesh position={[4.5, -9.5, -0.12]} receiveShadow>
        <planeGeometry args={[BOARD_COLS + 0.4, BOARD_ROWS + 0.4]} />
        <meshStandardMaterial color={0x030d03} roughness={1} metalness={0} />
      </mesh>

      {/* ── Subtle cell grid (empty squares) ── */}
      {Array.from({ length: BOARD_ROWS }, (_, r) =>
        Array.from({ length: BOARD_COLS }, (_, c) => {
          if (board[r][c]) return null;
          return (
            <mesh key={`${r}-${c}`} position={[c + 0.5, -r - 0.5, -0.08]}>
              <planeGeometry args={[0.92, 0.92]} />
              <meshStandardMaterial color={0x060f06} roughness={1} />
            </mesh>
          );
        })
      )}

      {/* ── Locked pieces ── */}
      {components.map((comp, i) => (
        <LogPiece key={i} cells={comp.cells} type={comp.type} />
      ))}

      {/* ── Ghost ── */}
      {showGhost && ghostCells.length > 0 && (
        <LogPiece cells={ghostCells} type={current.type} ghost />
      )}

      {/* ── Active piece ── */}
      {activeCells.length > 0 && (
        <LogPiece cells={activeCells} type={current.type} />
      )}
    </>
  );
}

// ── Next-piece mini scene ─────────────────────────────────────────────────
function NextScene({ next }: { next: Tetromino }) {
  const cells: Cell[] = next.cells.map(([dr, dc]) => ({ row: dr + 1, col: dc + 1 }));
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 3, 6]} intensity={1.2} />
      <LogPiece cells={cells} type={next.type} />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function TetrisGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [board,    setBoard]    = useState<Board>(emptyBoard());
  const [current,  setCurrent]  = useState<Tetromino>(() => randomPiece());
  const [next,     setNext]     = useState<Tetromino>(() => randomPiece());
  const [score,    setScore]    = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const startRef = useRef(Date.now());
  const boardRef   = useRef(board);
  const currentRef = useRef(current);
  const scoreRef   = useRef(score);
  boardRef.current   = board;
  currentRef.current = current;
  scoreRef.current   = score;

  const isLockingRef = useRef(false);
  useEffect(() => { isLockingRef.current = false; }, [board]);

  const lockFnRef = useRef<() => void>(() => {});

  const lock = useCallback(() => {
    if (isLockingRef.current) return;
    isLockingRef.current = true;
    const piece    = currentRef.current;
    const newBoard = placePiece(boardRef.current, piece);
    const { board: cleared, linesCleared } = clearLines(newBoard);
    const newScore = scoreRef.current + scoreLines(linesCleared);
    setBoard(cleared);
    setScore(newScore);
    scoreRef.current = newScore;
    if (!isValid(cleared, next.cells, next.row, next.col)) { setGameOver(true); onGameOver(); return; }
    if (newScore >= WIN_SCORE[level]) { onLevelComplete(Date.now() - startRef.current); return; }
    setCurrent(next);
    setNext(randomPiece());
  }, [next, level, onGameOver, onLevelComplete]);

  lockFnRef.current = lock;

  // Auto-drop
  useEffect(() => {
    if (gameOver) return;
    const id = setInterval(() => {
      const p = currentRef.current;
      const b = boardRef.current;
      if (isValid(b, p.cells, p.row + 1, p.col)) setCurrent({ ...p, row: p.row + 1 });
      else lock();
    }, DROP_SPEED[level]);
    return () => clearInterval(id);
  }, [level, gameOver, lock]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (gameOver) return;
      const p = currentRef.current;
      const b = boardRef.current;
      if (e.key === 'ArrowLeft')  { const m = { ...p, col: p.col - 1 }; if (isValid(b, p.cells, m.row, m.col)) setCurrent(m); }
      if (e.key === 'ArrowRight') { const m = { ...p, col: p.col + 1 }; if (isValid(b, p.cells, m.row, m.col)) setCurrent(m); }
      if (e.key === 'ArrowDown')  { const m = { ...p, row: p.row + 1 }; if (isValid(b, p.cells, m.row, m.col)) setCurrent(m); else lock(); }
      if (e.key === 'ArrowUp')    { const r = rotate(p.cells); if (isValid(b, r, p.row, p.col)) setCurrent({ ...p, cells: r }); }
      if (e.key === ' ')          { let r = p.row; while (isValid(b, p.cells, r + 1, p.col)) r++; setCurrent({ ...p, row: r }); setTimeout(() => lockFnRef.current(), 50); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [gameOver, lock]);

  // Touch
  const tx = useRef(0); const ty = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { tx.current = e.touches[0].clientX; ty.current = e.touches[0].clientY; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - tx.current;
    const dy = e.changedTouches[0].clientY - ty.current;
    const p  = currentRef.current;
    const b  = boardRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 18) { const m = { ...p, col: p.col + (dx > 0 ? 1 : -1) }; if (isValid(b, p.cells, m.row, m.col)) setCurrent(m); }
    } else {
      if (dy > 28)      { let r = p.row; while (isValid(b, p.cells, r + 1, p.col)) r++; setCurrent({ ...p, row: r }); setTimeout(() => lockFnRef.current(), 50); }
      if (dy < -28)     { const r = rotate(p.cells); if (isValid(b, r, p.row, p.col)) setCurrent({ ...p, cells: r }); }
    }
  };

  // Ghost row
  const ghostRow = (() => {
    let r = current.row;
    while (isValid(board, current.cells, r + 1, current.col)) r++;
    return r;
  })();

  const winScore = WIN_SCORE[level];
  const progress = Math.min((score / winScore) * 100, 100);

  // Camera: board spans X=[0,10], Y=[0,-20] (Three.js coords)
  // Center at (5, -10, 0). Camera slightly tilted for 3D depth.
  const BOARD_W = BOARD_COLS; // 10
  const BOARD_H = BOARD_ROWS; // 20

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '20px',
    padding: '12px 8px',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 1, lineHeight: 1,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '6px 8px', gap: '6px', boxSizing: 'border-box' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>

        {/* Score */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px 12px' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</div>
          <div style={{ color: '#DEB887', fontWeight: 900, fontSize: '22px', lineHeight: 1.1, fontFamily: 'monospace' }}>{score}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>/ {winScore}</div>
          <div style={{ marginTop: '5px', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#8B5E3C,#DEB887)', borderRadius: '99px', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Next piece preview (mini 3D canvas) */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '72px', overflow: 'hidden' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Next</div>
          <div style={{ flex: 1, width: '100%', minHeight: '60px' }}>
            <Canvas
              style={{ width: '100%', height: '100%' }}
              gl={{ antialias: true, alpha: true }}
              camera={{ position: [2.5, -2.5, 7], fov: 38 }}
            >
              <NextScene next={next} />
            </Canvas>
          </div>
        </div>
      </div>

      {/* ── 3D Board ── */}
      <div
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.08)' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Canvas
          shadows
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true }}
          camera={{
            position: [BOARD_W / 2, -BOARD_H / 2, 26],
            fov: 42,
            near: 0.1,
            far: 100,
          }}
        >
          <BoardScene board={board} current={current} ghostRow={ghostRow} />
        </Canvas>
      </div>

      {/* ── Controls ── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button
          style={{ ...btnStyle, flex: 'none', padding: '10px 8px', fontSize: '15px', letterSpacing: '0.5px' }}
          onClick={() => { const r = rotate(currentRef.current.cells); if (isValid(boardRef.current, r, currentRef.current.row, currentRef.current.col)) setCurrent({ ...currentRef.current, cells: r }); }}
        >
          🔄 Tourner
        </button>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button style={btnStyle} onClick={() => { const m = { ...currentRef.current, col: currentRef.current.col - 1 }; if (isValid(boardRef.current, m.cells, m.row, m.col)) setCurrent(m); }}>◀</button>
          <button style={btnStyle} onClick={() => { let r = currentRef.current.row; while (isValid(boardRef.current, currentRef.current.cells, r + 1, currentRef.current.col)) r++; setCurrent({ ...currentRef.current, row: r }); setTimeout(() => lockFnRef.current(), 50); }}>⬇</button>
          <button style={btnStyle} onClick={() => { const m = { ...currentRef.current, col: currentRef.current.col + 1 }; if (isValid(boardRef.current, m.cells, m.row, m.col)) setCurrent(m); }}>▶</button>
        </div>
      </div>
    </div>
  );
}
