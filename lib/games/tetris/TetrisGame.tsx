'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  emptyBoard, randomPiece, isValid, placePiece, clearLines, rotate,
  BOARD_COLS, BOARD_ROWS, DROP_SPEED, PIECES, scoreLines,
  type Board, type Tetromino, type TetrominoType,
} from './logic';
import type { GameProps } from '@/lib/types';

const WIN_SCORE: Record<number, number> = { 1: 500, 2: 800, 3: 1200, 4: 1800, 5: 2500 };

export default function TetrisGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [current, setCurrent] = useState<Tetromino>(() => randomPiece());
  const [next, setNext] = useState<Tetromino>(() => randomPiece());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [cellSize, setCellSize] = useState(24);
  const startRef = useRef(Date.now());
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const dropRef = useRef<NodeJS.Timeout | null>(null);
  const boardRef = useRef(board);
  const currentRef = useRef(current);
  const scoreRef = useRef(score);
  boardRef.current = board;
  currentRef.current = current;
  scoreRef.current = score;

  // Guard against double-lock (hard drop timer + setTimeout race condition)
  const isLockingRef = useRef(false);
  // Always points to latest lock (avoids stale closure in setTimeout calls)
  const lockFnRef = useRef<() => void>(() => {});

  // Reset guard after each successful lock (board changed = lock completed)
  useEffect(() => { isLockingRef.current = false; }, [board]);

  // ResizeObserver: compute cell size from actual available container
  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const byW = Math.floor((width - 4) / BOARD_COLS);
      const byH = Math.floor((height - 4) / BOARD_ROWS);
      setCellSize(Math.max(Math.min(byW, byH, 32), 18));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lock = useCallback(() => {
    // Prevent double-lock: drop timer + hard-drop setTimeout can both fire
    if (isLockingRef.current) return;
    isLockingRef.current = true;

    const piece = currentRef.current;
    const b = boardRef.current;
    const newBoard = placePiece(b, piece);
    const { board: cleared, linesCleared } = clearLines(newBoard);
    const newScore = scoreRef.current + scoreLines(linesCleared);
    setBoard(cleared);
    setScore(newScore);
    scoreRef.current = newScore;

    const np = next;
    if (!isValid(cleared, np.cells, np.row, np.col)) {
      setGameOver(true);
      onGameOver();
      return;
    }
    if (newScore >= WIN_SCORE[level]) {
      onLevelComplete(Date.now() - startRef.current);
      return;
    }
    setCurrent(np);
    setNext(randomPiece());
  }, [next, level, onGameOver, onLevelComplete]);

  // Keep lockFnRef in sync with latest lock (for setTimeout calls)
  lockFnRef.current = lock;

  // Drop timer
  useEffect(() => {
    if (gameOver) return;
    dropRef.current = setInterval(() => {
      const piece = currentRef.current;
      const b = boardRef.current;
      const moved = { ...piece, row: piece.row + 1 };
      if (isValid(b, piece.cells, moved.row, moved.col)) {
        setCurrent(moved);
      } else {
        lock();
      }
    }, DROP_SPEED[level]);
    return () => { if (dropRef.current) clearInterval(dropRef.current); };
  }, [level, gameOver, lock]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameOver) return;
      const piece = currentRef.current;
      const b = boardRef.current;
      if (e.key === 'ArrowLeft') {
        const m = { ...piece, col: piece.col - 1 };
        if (isValid(b, piece.cells, m.row, m.col)) setCurrent(m);
      } else if (e.key === 'ArrowRight') {
        const m = { ...piece, col: piece.col + 1 };
        if (isValid(b, piece.cells, m.row, m.col)) setCurrent(m);
      } else if (e.key === 'ArrowDown') {
        const m = { ...piece, row: piece.row + 1 };
        if (isValid(b, piece.cells, m.row, m.col)) setCurrent(m);
        else lock();
      } else if (e.key === 'ArrowUp') {
        const rotated = rotate(piece.cells);
        if (isValid(b, rotated, piece.row, piece.col)) setCurrent({ ...piece, cells: rotated });
      } else if (e.key === ' ') {
        let r = piece.row;
        while (isValid(b, piece.cells, r + 1, piece.col)) r++;
        setCurrent({ ...piece, row: r });
        setTimeout(() => lockFnRef.current(), 50);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameOver, lock]);

  // Touch controls
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const piece = currentRef.current;
    const b = boardRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 20) {
        const dir = dx > 0 ? 1 : -1;
        const m = { ...piece, col: piece.col + dir };
        if (isValid(b, piece.cells, m.row, m.col)) setCurrent(m);
      }
    } else {
      if (dy > 30) {
        let r = piece.row;
        while (isValid(b, piece.cells, r + 1, piece.col)) r++;
        setCurrent({ ...piece, row: r });
        setTimeout(() => lockFnRef.current(), 50);
      } else if (dy < -30) {
        const rotated = rotate(piece.cells);
        if (isValid(b, rotated, piece.row, piece.col)) setCurrent({ ...piece, cells: rotated });
      }
    }
  };

  // Ghost piece
  const ghostRow = (() => {
    let r = current.row;
    while (isValid(board, current.cells, r + 1, current.col)) r++;
    return r;
  })();

  // Build display board
  type DisplayCell = { type: TetrominoType; ghost: boolean } | null;
  const displayBoard: DisplayCell[][] = board.map((row) =>
    row.map((c) => (c ? { type: c, ghost: false } : null))
  );
  current.cells.forEach(([dr, dc]) => {
    const nr = ghostRow + dr;
    const nc = current.col + dc;
    if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS && !displayBoard[nr][nc]) {
      displayBoard[nr][nc] = { type: current.type, ghost: true };
    }
  });
  current.cells.forEach(([dr, dc]) => {
    const nr = current.row + dr;
    const nc = current.col + dc;
    if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
      displayBoard[nr][nc] = { type: current.type, ghost: false };
    }
  });

  // Next piece preview (4×4 grid)
  const nextGrid: (TetrominoType | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
  next.cells.forEach(([dr, dc]) => {
    const r = dr + 1;
    const c = dc + 2;
    if (r >= 0 && r < 4 && c >= 0 && c < 4) nextGrid[r][c] = next.type;
  });

  const winScore = WIN_SCORE[level];
  const progress = Math.min((score / winScore) * 100, 100);

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '20px',
    padding: '12px 8px',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    lineHeight: 1,
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '6px 8px',
      gap: '6px',
      boxSizing: 'border-box',
    }}>
      {/* Top bar: score + next piece */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {/* Score */}
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '6px 12px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</div>
          <div style={{ color: '#FFD700', fontWeight: 900, fontSize: '22px', lineHeight: 1.1, fontFamily: 'monospace' }}>{score}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>/ {winScore}</div>
          <div style={{ marginTop: '5px', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #00C851, #FFD700)',
              borderRadius: '99px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Next piece */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          minWidth: '66px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px' }}>Next</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 11px)',
            gridTemplateRows: 'repeat(4, 11px)',
            gap: '1px',
          }}>
            {nextGrid.flat().map((c, i) => {
              const p = c ? PIECES[c] : null;
              return (
                <div key={i} style={{
                  width: 11,
                  height: 11,
                  borderRadius: '2px',
                  background: p ? p.wood.bg : 'rgba(255,255,255,0.03)',
                  boxShadow: p
                    ? `inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.45)`
                    : 'none',
                }} />
              );
            })}
          </div>
        </div>
      </div>

      {/* Board container */}
      <div
        ref={boardContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${BOARD_COLS}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${BOARD_ROWS}, ${cellSize}px)`,
            gap: '1px',
            background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            overflow: 'hidden',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          {displayBoard.flat().map((cell, i) => {
            if (!cell) {
              return (
                <div key={i} style={{
                  width: cellSize,
                  height: cellSize,
                  background: '#050e05',
                }} />
              );
            }
            const p = PIECES[cell.type];
            if (cell.ghost) {
              return (
                <div key={i} style={{
                  width: cellSize,
                  height: cellSize,
                  background: 'transparent',
                  border: `1px dashed ${p.wood.border}70`,
                  borderRadius: '2px',
                  boxSizing: 'border-box',
                }} />
              );
            }
            return (
              <div key={i} style={{
                width: cellSize,
                height: cellSize,
                background: p.wood.bg,
                borderRadius: '2px',
                boxShadow: `inset 2px 2px 0 rgba(255,255,255,0.28), inset -2px -2px 0 rgba(0,0,0,0.45), inset 0 0 5px rgba(0,0,0,0.15)`,
              }} />
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button
          style={{ ...btnStyle, flex: 'none', padding: '10px 8px', borderRadius: '10px', fontSize: '16px', letterSpacing: '0.5px' }}
          onClick={() => {
            const rotated = rotate(currentRef.current.cells);
            if (isValid(boardRef.current, rotated, currentRef.current.row, currentRef.current.col))
              setCurrent({ ...currentRef.current, cells: rotated });
          }}
        >
          🔄 Tourner
        </button>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button style={btnStyle}
            onClick={() => {
              const m = { ...currentRef.current, col: currentRef.current.col - 1 };
              if (isValid(boardRef.current, m.cells, m.row, m.col)) setCurrent(m);
            }}>◀</button>
          <button style={btnStyle}
            onClick={() => {
              let r = currentRef.current.row;
              while (isValid(boardRef.current, currentRef.current.cells, r + 1, currentRef.current.col)) r++;
              setCurrent({ ...currentRef.current, row: r });
              setTimeout(() => lockFnRef.current(), 50);
            }}>⬇</button>
          <button style={btnStyle}
            onClick={() => {
              const m = { ...currentRef.current, col: currentRef.current.col + 1 };
              if (isValid(boardRef.current, m.cells, m.row, m.col)) setCurrent(m);
            }}>▶</button>
        </div>
      </div>
    </div>
  );
}
