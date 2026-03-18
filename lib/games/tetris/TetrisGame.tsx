'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  emptyBoard, randomPiece, isValid, placePiece, clearLines, rotate,
  BOARD_COLS, BOARD_ROWS, DROP_SPEED, PIECES, scoreLines,
  type Board, type Tetromino, type TetrominoType,
} from './logic';
import type { GameProps } from '@/lib/types';

const WIN_SCORE: Record<number, number> = { 1: 500, 2: 800, 3: 1200, 4: 1800, 5: 2500 };

// ── Wood palettes — each piece is a different wood species ─────────────────
const WOOD_PALETTES: Record<TetrominoType, {
  light: [number, number, number];
  dark:  [number, number, number];
  ringFreq: number;   // higher = tighter rings / grain
  isRadial: boolean;  // true = cross-section rings (O piece)
}> = {
  I: { light: [222, 184, 135], dark: [130,  82,  40], ringFreq: 0.45, isRadial: false }, // Pin des Vosges
  O: { light: [160, 110,  68], dark: [ 72,  42,  18], ringFreq: 0.65, isRadial: true  }, // Chêne — cernes
  T: { light: [122,  68,  28], dark: [ 48,  22,   8], ringFreq: 0.55, isRadial: false }, // Noyer
  S: { light: [245, 235, 210], dark: [150, 118,  80], ringFreq: 0.30, isRadial: false }, // Bouleau
  Z: { light: [175,  72,  72], dark: [ 82,  24,  24], ringFreq: 0.50, isRadial: false }, // Cerisier
  J: { light: [235, 200, 150], dark: [155, 108,  58], ringFreq: 0.38, isRadial: false }, // Érable
  L: { light: [190, 130,  65], dark: [ 95,  58,  18], ringFreq: 0.52, isRadial: false }, // Mélèze
};

/** Generate a realistic wood texture at the given pixel size using ImageData. */
function createWoodTexture(size: number, type: TetrominoType): HTMLCanvasElement {
  const pal = WOOD_PALETTES[type];
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d   = img.data;
  const cx  = size / 2;
  const cy  = size / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let t: number;
      if (pal.isRadial) {
        // Oak cross-section: concentric rings from centre
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        const f1 = Math.sin(dist * pal.ringFreq);
        const f2 = Math.sin(dist * pal.ringFreq * 1.7 + 0.8) * 0.28;
        t = (f1 + f2) * 0.5 + 0.5;
      } else {
        // Long grain: primary wave + secondary harmonic + slight x warp
        const wave = py * pal.ringFreq + px * 0.04 + Math.sin(py * 0.18 + px * 0.03) * 2.8;
        const f1   = Math.sin(wave);
        const f2   = Math.sin(wave * 2.1 + 0.4) * 0.22;
        t = (f1 + f2) * 0.5 + 0.5;
      }
      t = Math.max(0, Math.min(1, t));
      const i  = (py * size + px) * 4;
      d[i]     = Math.round(pal.dark[0] + (pal.light[0] - pal.dark[0]) * t);
      d[i + 1] = Math.round(pal.dark[1] + (pal.light[1] - pal.dark[1]) * t);
      d[i + 2] = Math.round(pal.dark[2] + (pal.light[2] - pal.dark[2]) * t);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Bevel: top-left light highlight, bottom-right shadow
  const bevel = ctx.createLinearGradient(0, 0, size, size);
  bevel.addColorStop(0,   'rgba(255,255,255,0.32)');
  bevel.addColorStop(0.4, 'rgba(255,255,255,0.04)');
  bevel.addColorStop(0.6, 'rgba(0,0,0,0.04)');
  bevel.addColorStop(1,   'rgba(0,0,0,0.44)');
  ctx.fillStyle = bevel;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}

type WoodTextureMap = Record<TetrominoType, HTMLCanvasElement>;

function generateWoodTextures(size: number): WoodTextureMap {
  return Object.fromEntries(
    (['I','O','T','S','Z','J','L'] as TetrominoType[]).map((t) => [t, createWoodTexture(size, t)])
  ) as WoodTextureMap;
}

// ── Canvas draw helpers ────────────────────────────────────────────────────
type DisplayCell = { type: TetrominoType; ghost: boolean } | null;
const GAP = 1;

function drawBoardCanvas(
  canvas: HTMLCanvasElement,
  board: DisplayCell[][],
  cellSize: number,
  textures: WoodTextureMap,
) {
  const W = BOARD_COLS * cellSize + (BOARD_COLS - 1) * GAP;
  const H = BOARD_ROWS * cellSize + (BOARD_ROWS - 1) * GAP;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width  = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#030b03';
  ctx.fillRect(0, 0, W, H);

  board.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const x = ci * (cellSize + GAP);
      const y = ri * (cellSize + GAP);

      if (!cell) {
        ctx.fillStyle = '#050e05';
        ctx.fillRect(x, y, cellSize, cellSize);
      } else if (cell.ghost) {
        ctx.fillStyle = '#050e05';
        ctx.fillRect(x, y, cellSize, cellSize);
        const pal = WOOD_PALETTES[cell.type];
        const [r, g, b] = pal.dark;
        ctx.strokeStyle = `rgba(${r + 50},${g + 25},${b + 12},0.6)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        ctx.setLineDash([]);
      } else {
        ctx.drawImage(textures[cell.type], x, y, cellSize, cellSize);
      }
    });
  });
}

function drawNextCanvas(
  canvas: HTMLCanvasElement,
  nextGrid: (TetrominoType | null)[][],
  cellSize: number,
  textures: WoodTextureMap,
) {
  const S = 4 * cellSize + 3 * GAP;
  if (canvas.width !== S || canvas.height !== S) {
    canvas.width  = S;
    canvas.height = S;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);
  nextGrid.forEach((row, ri) => {
    row.forEach((type, ci) => {
      const x = ci * (cellSize + GAP);
      const y = ri * (cellSize + GAP);
      if (type) {
        ctx.drawImage(textures[type], x, y, cellSize, cellSize);
      }
    });
  });
}

// ── Component ──────────────────────────────────────────────────────────────
export default function TetrisGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [current, setCurrent] = useState<Tetromino>(() => randomPiece());
  const [next, setNext] = useState<Tetromino>(() => randomPiece());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [cellSize, setCellSize] = useState(24);
  const startRef = useRef(Date.now());
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const texturesRef   = useRef<WoodTextureMap | null>(null);
  const textureSizeRef = useRef<number>(0);

  const dropRef     = useRef<NodeJS.Timeout | null>(null);
  const boardRef    = useRef(board);
  const currentRef  = useRef(current);
  const scoreRef    = useRef(score);
  boardRef.current   = board;
  currentRef.current = current;
  scoreRef.current   = score;

  const isLockingRef = useRef(false);
  const lockFnRef    = useRef<() => void>(() => {});
  useEffect(() => { isLockingRef.current = false; }, [board]);

  // ResizeObserver
  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const byW = Math.floor((width  - 4) / BOARD_COLS);
      const byH = Math.floor((height - 4) / BOARD_ROWS);
      setCellSize(Math.max(Math.min(byW, byH, 32), 18));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lock = useCallback(() => {
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

  lockFnRef.current = lock;

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
        const m = { ...piece, col: piece.col + (dx > 0 ? 1 : -1) };
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
  const displayBoard: DisplayCell[][] = board.map((row) =>
    row.map((c) => (c ? { type: c, ghost: false } : null))
  );
  current.cells.forEach(([dr, dc]) => {
    const nr = ghostRow + dr;
    const nc = current.col + dc;
    if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS && !displayBoard[nr][nc])
      displayBoard[nr][nc] = { type: current.type, ghost: true };
  });
  current.cells.forEach(([dr, dc]) => {
    const nr = current.row + dr;
    const nc = current.col + dc;
    if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS)
      displayBoard[nr][nc] = { type: current.type, ghost: false };
  });

  // Next piece preview grid (4×4)
  const nextGrid: (TetrominoType | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
  next.cells.forEach(([dr, dc]) => {
    const r = dr + 1;
    const c = dc + 2;
    if (r >= 0 && r < 4 && c >= 0 && c < 4) nextGrid[r][c] = next.type;
  });

  // ── Canvas render (runs after every React render) ─────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    // Regenerate textures only when cellSize changes
    if (textureSizeRef.current !== cellSize) {
      texturesRef.current  = generateWoodTextures(cellSize);
      textureSizeRef.current = cellSize;
    }
    if (!texturesRef.current) return;
    drawBoardCanvas(canvasRef.current, displayBoard, cellSize, texturesRef.current);
    if (nextCanvasRef.current) {
      drawNextCanvas(nextCanvasRef.current, nextGrid, 12, texturesRef.current);
    }
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
              background: 'linear-gradient(90deg, #8B5E3C, #DEB887)',
              borderRadius: '99px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Next piece — canvas */}
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
          <canvas
            ref={nextCanvasRef}
            style={{ imageRendering: 'pixelated', borderRadius: '2px' }}
          />
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
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            borderRadius: '8px',
            border: '2px solid rgba(255,255,255,0.08)',
            touchAction: 'none',
            userSelect: 'none',
            display: 'block',
          }}
        />
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
