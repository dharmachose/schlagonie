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
  const [cellSize, setCellSize] = useState(28);
  const startRef = useRef(Date.now());

  const dropRef = useRef<NodeJS.Timeout | null>(null);
  const boardRef = useRef(board);
  const currentRef = useRef(current);
  const scoreRef = useRef(score);
  boardRef.current = board;
  currentRef.current = current;
  scoreRef.current = score;

  // Responsive cell size
  useEffect(() => {
    const calc = () => {
      const sidebarW = 88;
      const padding = 16;
      const availW = window.innerWidth - sidebarW - padding * 2 - 8;
      const availH = window.innerHeight - 180; // HUD + top stats + controls
      const byW = Math.floor(availW / BOARD_COLS);
      const byH = Math.floor(availH / BOARD_ROWS);
      setCellSize(Math.max(Math.min(byW, byH, 32), 22));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

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
        const m = { ...piece, col: piece.col + dir };
        if (isValid(b, piece.cells, m.row, m.col)) setCurrent(m);
      }
    } else {
      if (dy > 30) {
        let r = piece.row;
        while (isValid(b, piece.cells, r + 1, piece.col)) r++;
        setCurrent({ ...piece, row: r });
        setTimeout(lock, 50);
      } else if (dy < -30) {
        const rotated = rotate(piece.cells);
        if (isValid(b, rotated, piece.row, piece.col)) setCurrent({ ...piece, cells: rotated });
      }
    }
  };

  // Ghost piece position
  const ghostRow = (() => {
    let r = current.row;
    while (isValid(board, current.cells, r + 1, current.col)) r++;
    return r;
  })();

  // Build display board: ghost → current piece
  type CellData = { color: string; ghost?: boolean } | null;
  const displayBoard: CellData[][] = board.map((row) =>
    row.map((c) => (c ? { color: c } : null))
  );
  // Ghost cells
  current.cells.forEach(([dr, dc]) => {
    const nr = ghostRow + dr;
    const nc = current.col + dc;
    if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS && !displayBoard[nr][nc]) {
      displayBoard[nr][nc] = { color: PIECES[current.type].color, ghost: true };
    }
  });
  // Real piece cells (override ghost)
  current.cells.forEach(([dr, dc]) => {
    const nr = current.row + dr;
    const nc = current.col + dc;
    if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
      displayBoard[nr][nc] = { color: PIECES[current.type].color };
    }
  });

  // Next piece preview grid (4×4)
  const nextGrid: (string | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
  next.cells.forEach(([dr, dc]) => {
    const r = dr + 1;
    const c = dc + 2;
    if (r >= 0 && r < 4 && c >= 0 && c < 4) nextGrid[r][c] = PIECES[next.type].color;
  });

  const winScore = WIN_SCORE[level];
  const progress = Math.min((score / winScore) * 100, 100);

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontSize: '20px',
    padding: '14px',
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
      padding: '8px 10px',
      gap: '8px',
    }}>
      {/* Top bar: score + next piece */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
        {/* Score */}
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '8px 12px',
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score</div>
          <div style={{ color: 'var(--rasta-gold)', fontWeight: 900, fontSize: '22px', lineHeight: 1.1 }}>{score}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>/ {winScore}</div>
          {/* Progress bar */}
          <div style={{ marginTop: '6px', height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--rasta-green), var(--rasta-gold))',
              borderRadius: '99px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Next piece */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          minWidth: '72px',
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suivant</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 10px)',
            gridTemplateRows: 'repeat(4, 10px)',
            gap: '1px',
          }}>
            {nextGrid.flat().map((c, i) => (
              <div key={i} style={{
                width: 10,
                height: 10,
                borderRadius: '2px',
                background: c ?? 'rgba(255,255,255,0.04)',
                boxShadow: c ? 'inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.25)' : 'none',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'center' }}>
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${BOARD_COLS}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${BOARD_ROWS}, ${cellSize}px)`,
            gap: '1px',
            background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            overflow: 'hidden',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          {displayBoard.flat().map((cell, i) => (
            <div
              key={i}
              style={{
                width: cellSize,
                height: cellSize,
                background: cell
                  ? cell.ghost
                    ? `${cell.color}40`
                    : cell.color
                  : 'rgba(10,18,10,0.95)',
                borderRadius: '2px',
                boxShadow: cell && !cell.ghost
                  ? 'inset 2px 2px 0 rgba(255,255,255,0.3), inset -2px -2px 0 rgba(0,0,0,0.3)'
                  : cell?.ghost
                  ? `inset 0 0 0 1px ${cell.color}80`
                  : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button style={{ ...btnStyle, flex: 'none' }}
          onClick={() => {
            const rotated = rotate(currentRef.current.cells);
            if (isValid(boardRef.current, rotated, currentRef.current.row, currentRef.current.col))
              setCurrent({ ...currentRef.current, cells: rotated });
          }}>
          🔄 Tourner
        </button>
        <div style={{ display: 'flex', gap: '6px' }}>
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
              setTimeout(lock, 50);
            }}>⬇ Drop</button>
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
