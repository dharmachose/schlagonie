'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  emptyBoard, randomPiece, isValid, placePiece, clearLines, rotate,
  BOARD_COLS, BOARD_ROWS, DROP_SPEED, PIECES, scoreLines,
  type Board, type Tetromino,
} from './logic';
import type { GameProps } from '@/lib/types';

const WIN_SCORE: Record<number, number> = { 1: 500, 2: 800, 3: 1200, 4: 1800, 5: 2500 };

export default function TetrisGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [current, setCurrent] = useState<Tetromino>(() => randomPiece());
  const [next, setNext] = useState<Tetromino>(() => randomPiece());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const startRef = useRef(Date.now());

  const dropRef = useRef<NodeJS.Timeout | null>(null);
  const boardRef = useRef(board);
  const currentRef = useRef(current);
  const scoreRef = useRef(score);
  boardRef.current = board;
  currentRef.current = current;
  scoreRef.current = score;

  const lock = useCallback(() => {
    const piece = currentRef.current;
    const b = boardRef.current;
    const newBoard = placePiece(b, piece);
    const { board: cleared, linesCleared } = clearLines(newBoard);
    const newScore = scoreRef.current + scoreLines(linesCleared);
    setBoard(cleared);
    setScore(newScore);
    scoreRef.current = newScore;

    const np = next;
    // Check game over (can't place new piece)
    if (!isValid(cleared, np.cells, np.row, np.col)) {
      setGameOver(true);
      onGameOver();
      return;
    }

    // Check win
    if (newScore >= WIN_SCORE[level]) {
      onLevelComplete(Date.now() - startRef.current);
      return;
    }

    setCurrent(np);
    setNext(randomPiece());
  }, [next, level, onGameOver, onLevelComplete]);

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
        const moved = { ...piece, col: piece.col - 1 };
        if (isValid(b, piece.cells, moved.row, moved.col)) setCurrent(moved);
      } else if (e.key === 'ArrowRight') {
        const moved = { ...piece, col: piece.col + 1 };
        if (isValid(b, piece.cells, moved.row, moved.col)) setCurrent(moved);
      } else if (e.key === 'ArrowDown') {
        const moved = { ...piece, row: piece.row + 1 };
        if (isValid(b, piece.cells, moved.row, moved.col)) setCurrent(moved);
        else lock();
      } else if (e.key === 'ArrowUp') {
        const rotated = rotate(piece.cells);
        if (isValid(b, rotated, piece.row, piece.col)) setCurrent({ ...piece, cells: rotated });
      } else if (e.key === ' ') {
        // Hard drop
        let r = piece.row;
        while (isValid(b, piece.cells, r + 1, piece.col)) r++;
        setCurrent({ ...piece, row: r });
        setTimeout(lock, 50);
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
        const moved = { ...piece, col: piece.col + dir };
        if (isValid(b, piece.cells, moved.row, moved.col)) setCurrent(moved);
      }
    } else {
      if (dy > 30) {
        // Swipe down = hard drop
        let r = piece.row;
        while (isValid(b, piece.cells, r + 1, piece.col)) r++;
        setCurrent({ ...piece, row: r });
        setTimeout(lock, 50);
      } else if (dy < -30) {
        // Swipe up = rotate
        const rotated = rotate(piece.cells);
        if (isValid(b, rotated, piece.row, piece.col)) setCurrent({ ...piece, cells: rotated });
      }
    }
  };

  // Build display board (merge current piece)
  const displayBoard: (string | null)[][] = board.map((r) => [...r]);
  current.cells.forEach(([dr, dc]) => {
    const nr = current.row + dr;
    const nc = current.col + dc;
    if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
      displayBoard[nr][nc] = PIECES[current.type].color;
    }
  });

  const CELL_SIZE = Math.min(Math.floor((typeof window !== 'undefined' ? window.innerWidth - 120 : 260) / BOARD_COLS), 32);

  return (
    <div style={{ display: 'flex', height: '100%', gap: '8px', padding: '8px', alignItems: 'flex-start', justifyContent: 'center' }}>
      {/* Board */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${BOARD_ROWS}, ${CELL_SIZE}px)`,
          gap: '1px',
          background: 'var(--border-color)',
          border: '2px solid var(--border-color)',
          borderRadius: '8px',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {displayBoard.flat().map((cell, i) => (
          <div
            key={i}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              background: cell ?? 'var(--bg-dark)',
              transition: cell ? 'none' : 'background 0.1s',
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '80px' }}>
        <div className="card-vosges" style={{ padding: '8px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>SCORE</div>
          <div style={{ color: 'var(--rasta-gold)', fontWeight: 900, fontSize: '18px' }}>{score}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>/ {WIN_SCORE[level]}</div>
        </div>

        <div className="card-vosges" style={{ padding: '8px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>SUIVANT</div>
          <div style={{ fontSize: '24px' }}>{PIECES[next.type].emoji}</div>
        </div>

        {/* Touch controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button className="btn-rasta" style={{ padding: '8px', fontSize: '16px' }}
            onClick={() => { const rotated = rotate(currentRef.current.cells); if (isValid(boardRef.current, rotated, currentRef.current.row, currentRef.current.col)) setCurrent({ ...currentRef.current, cells: rotated }); }}>
            🔄
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <button className="btn-rasta" style={{ padding: '8px', fontSize: '16px' }}
              onClick={() => { const m = { ...currentRef.current, col: currentRef.current.col - 1 }; if (isValid(boardRef.current, m.cells, m.row, m.col)) setCurrent(m); }}>
              ◀
            </button>
            <button className="btn-rasta" style={{ padding: '8px', fontSize: '16px' }}
              onClick={() => { const m = { ...currentRef.current, col: currentRef.current.col + 1 }; if (isValid(boardRef.current, m.cells, m.row, m.col)) setCurrent(m); }}>
              ▶
            </button>
          </div>
          <button className="btn-rasta" style={{ padding: '8px', fontSize: '16px' }}
            onClick={() => { const m = { ...currentRef.current, row: currentRef.current.row + 1 }; if (isValid(boardRef.current, m.cells, m.row, m.col)) setCurrent(m); else lock(); }}>
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}
