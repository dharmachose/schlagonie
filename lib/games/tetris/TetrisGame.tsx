'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  emptyBoard, randomPiece, isValid, placePiece, clearLines, rotate,
  BOARD_COLS, BOARD_ROWS, DROP_SPEED, scoreLines,
  type Board, type Tetromino, type TetrominoType,
} from './logic';
import {
  generateWoodTexture, getBarkColor, PIECE_SPECIES,
  type WoodSpecies,
} from './woodTextures';
import type { GameProps } from '@/lib/types';

const WIN_SCORE: Record<number, number> = { 1: 500, 2: 800, 3: 1200, 4: 1800, 5: 2500 };
const GAP = 1; // px gap between cells

// ── Connected-component detection ────────────────────────────────────────
type Component = { type: TetrominoType; cells: { row: number; col: number }[] };

function findComponents(board: Board): Component[] {
  const visited = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(false));
  const result: Component[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (visited[r][c] || !board[r][c]) continue;
      const type = board[r][c]!;
      const cells: { row: number; col: number }[] = [];
      const queue = [{ row: r, col: c }];
      while (queue.length) {
        const { row, col } = queue.pop()!;
        if (visited[row][col]) continue;
        visited[row][col] = true;
        cells.push({ row, col });
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS
            && !visited[nr][nc] && board[nr][nc] === type) {
            queue.push({ row: nr, col: nc });
          }
        }
      }
      result.push({ type, cells });
    }
  }
  return result;
}

// ── Piece rendering (unified log/trunk shape) ─────────────────────────────
function drawPiece(
  ctx: CanvasRenderingContext2D,
  cells: { row: number; col: number }[],
  type: TetrominoType,
  cellSize: number,
  cache: Map<string, HTMLCanvasElement>,
  ghost = false,
) {
  if (!cells.length) return;
  const span    = cellSize + GAP;
  const species = PIECE_SPECIES[type];

  // Bounding box of this piece in canvas coordinates
  const minRow = Math.min(...cells.map(c => c.row));
  const maxRow = Math.max(...cells.map(c => c.row));
  const minCol = Math.min(...cells.map(c => c.col));
  const maxCol = Math.max(...cells.map(c => c.col));
  const texW   = (maxCol - minCol) * span + cellSize;
  const texH   = (maxRow - minRow) * span + cellSize;
  const texX   = minCol * span;
  const texY   = minRow * span;

  // Fetch or generate wood texture for this (species × size)
  const key = `${species}-${texW}x${texH}`;
  if (!cache.has(key)) cache.set(key, generateWoodTexture(texW, texH, species));
  const texture = cache.get(key)!;

  // Build clip path: union of all cells (no visible seam between them)
  ctx.save();
  ctx.beginPath();
  for (const { row, col } of cells) {
    ctx.rect(col * span, row * span, cellSize, cellSize);
  }
  ctx.clip();

  if (ghost) {
    ctx.globalAlpha = 0.22;
    ctx.drawImage(texture, texX, texY, texW, texH);
    ctx.globalAlpha = 1;
  } else {
    ctx.drawImage(texture, texX, texY, texW, texH);
  }
  ctx.restore();

  if (ghost) {
    // Dashed outline instead of bark
    const [r, g, b] = getBarkColor(species);
    const cellSet = new Set(cells.map(c => `${c.row},${c.col}`));
    ctx.save();
    ctx.strokeStyle = `rgba(${r + 60},${g + 35},${b + 15},0.65)`;
    ctx.lineWidth   = 1.2;
    ctx.setLineDash([3, 2]);
    drawOuterEdges(ctx, cells, cellSet, cellSize, span);
    ctx.setLineDash([]);
    ctx.restore();
  } else {
    drawBark(ctx, cells, cellSize, span, species);
  }
}

/** Draw bark-colored stroke on every outer edge of the piece. */
function drawBark(
  ctx: CanvasRenderingContext2D,
  cells: { row: number; col: number }[],
  cellSize: number,
  span: number,
  species: WoodSpecies,
) {
  const [r, g, b]  = getBarkColor(species);
  const barkW      = Math.max(2, cellSize * 0.09);
  const cellSet    = new Set(cells.map(c => `${c.row},${c.col}`));

  ctx.save();
  ctx.strokeStyle = `rgb(${r},${g},${b})`;
  ctx.lineWidth   = barkW;
  ctx.lineCap     = 'square';
  drawOuterEdges(ctx, cells, cellSet, cellSize, span);
  ctx.restore();
}

function drawOuterEdges(
  ctx: CanvasRenderingContext2D,
  cells: { row: number; col: number }[],
  cellSet: Set<string>,
  cellSize: number,
  span: number,
) {
  for (const { row, col } of cells) {
    const cx = col * span;
    const cy = row * span;
    if (!cellSet.has(`${row},${col - 1}`)) { ctx.beginPath(); ctx.moveTo(cx,            cy); ctx.lineTo(cx,            cy + cellSize); ctx.stroke(); }
    if (!cellSet.has(`${row},${col + 1}`)) { ctx.beginPath(); ctx.moveTo(cx + cellSize, cy); ctx.lineTo(cx + cellSize, cy + cellSize); ctx.stroke(); }
    if (!cellSet.has(`${row - 1},${col}`)) { ctx.beginPath(); ctx.moveTo(cx, cy           ); ctx.lineTo(cx + cellSize, cy           ); ctx.stroke(); }
    if (!cellSet.has(`${row + 1},${col}`)) { ctx.beginPath(); ctx.moveTo(cx, cy + cellSize); ctx.lineTo(cx + cellSize, cy + cellSize); ctx.stroke(); }
  }
}

// ── Canvas draw ───────────────────────────────────────────────────────────
function renderBoard(
  canvas: HTMLCanvasElement,
  board: Board,
  current: Tetromino,
  ghostRow: number,
  cellSize: number,
  cache: Map<string, HTMLCanvasElement>,
) {
  const span = cellSize + GAP;
  const W    = BOARD_COLS * span - GAP;
  const H    = BOARD_ROWS * span - GAP;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width  = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#040c04';
  ctx.fillRect(0, 0, W, H);

  // Empty-cell grid dots
  ctx.fillStyle = '#0a170a';
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (!board[r][c]) ctx.fillRect(c * span, r * span, cellSize, cellSize);
    }
  }

  // Locked pieces — grouped by connected component
  for (const comp of findComponents(board)) {
    drawPiece(ctx, comp.cells, comp.type, cellSize, cache);
  }

  // Ghost (only if different position from active piece)
  if (ghostRow !== current.row) {
    const ghostCells = current.cells
      .map(([dr, dc]) => ({ row: ghostRow + dr, col: current.col + dc }))
      .filter(c => c.row >= 0 && c.row < BOARD_ROWS);
    drawPiece(ctx, ghostCells, current.type, cellSize, cache, true);
  }

  // Active piece
  const activeCells = current.cells
    .map(([dr, dc]) => ({ row: current.row + dr, col: current.col + dc }))
    .filter(c => c.row >= 0 && c.row < BOARD_ROWS);
  drawPiece(ctx, activeCells, current.type, cellSize, cache);
}

function renderNext(
  canvas: HTMLCanvasElement,
  next: Tetromino,
  cellSize: number,
  cache: Map<string, HTMLCanvasElement>,
) {
  const CELL = Math.max(10, Math.round(cellSize * 0.55));
  const span = CELL + 1;
  const S    = 4 * span - 1;
  if (canvas.width !== S || canvas.height !== S) {
    canvas.width  = S;
    canvas.height = S;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);

  const cells = next.cells.map(([dr, dc]) => ({ row: dr + 1, col: dc + 2 }))
    .filter(c => c.row >= 0 && c.row < 4 && c.col >= 0 && c.col < 4);
  drawPiece(ctx, cells, next.type, CELL, cache);
}

// ── Component ─────────────────────────────────────────────────────────────
export default function TetrisGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [board,    setBoard]    = useState<Board>(emptyBoard());
  const [current,  setCurrent]  = useState<Tetromino>(() => randomPiece());
  const [next,     setNext]     = useState<Tetromino>(() => randomPiece());
  const [score,    setScore]    = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [cellSize, setCellSize] = useState(24);

  const startRef         = useRef(Date.now());
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef    = useRef<HTMLCanvasElement>(null);
  const texCacheRef      = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const lastCellSizeRef  = useRef(0);

  const dropRef    = useRef<NodeJS.Timeout | null>(null);
  const boardRef   = useRef(board);
  const currentRef = useRef(current);
  const scoreRef   = useRef(score);
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
    const piece    = currentRef.current;
    const b        = boardRef.current;
    const newBoard = placePiece(b, piece);
    const { board: cleared, linesCleared } = clearLines(newBoard);
    const newScore = scoreRef.current + scoreLines(linesCleared);
    setBoard(cleared);
    setScore(newScore);
    scoreRef.current = newScore;
    const np = next;
    if (!isValid(cleared, np.cells, np.row, np.col)) { setGameOver(true); onGameOver(); return; }
    if (newScore >= WIN_SCORE[level]) { onLevelComplete(Date.now() - startRef.current); return; }
    setCurrent(np);
    setNext(randomPiece());
  }, [next, level, onGameOver, onLevelComplete]);

  lockFnRef.current = lock;

  useEffect(() => {
    if (gameOver) return;
    dropRef.current = setInterval(() => {
      const piece = currentRef.current;
      const b     = boardRef.current;
      const moved = { ...piece, row: piece.row + 1 };
      if (isValid(b, piece.cells, moved.row, moved.col)) setCurrent(moved);
      else lock();
    }, DROP_SPEED[level]);
    return () => { if (dropRef.current) clearInterval(dropRef.current); };
  }, [level, gameOver, lock]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameOver) return;
      const piece = currentRef.current;
      const b     = boardRef.current;
      if (e.key === 'ArrowLeft')  { const m = { ...piece, col: piece.col - 1 }; if (isValid(b, piece.cells, m.row, m.col)) setCurrent(m); }
      else if (e.key === 'ArrowRight') { const m = { ...piece, col: piece.col + 1 }; if (isValid(b, piece.cells, m.row, m.col)) setCurrent(m); }
      else if (e.key === 'ArrowDown')  { const m = { ...piece, row: piece.row + 1 }; if (isValid(b, piece.cells, m.row, m.col)) setCurrent(m); else lock(); }
      else if (e.key === 'ArrowUp')    { const r = rotate(piece.cells); if (isValid(b, r, piece.row, piece.col)) setCurrent({ ...piece, cells: r }); }
      else if (e.key === ' ')          { let r = piece.row; while (isValid(b, piece.cells, r + 1, piece.col)) r++; setCurrent({ ...piece, row: r }); setTimeout(() => lockFnRef.current(), 50); }
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
    const dx    = e.changedTouches[0].clientX - touchStartX.current;
    const dy    = e.changedTouches[0].clientY - touchStartY.current;
    const piece = currentRef.current;
    const b     = boardRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 20) { const m = { ...piece, col: piece.col + (dx > 0 ? 1 : -1) }; if (isValid(b, piece.cells, m.row, m.col)) setCurrent(m); }
    } else {
      if (dy > 30)      { let r = piece.row; while (isValid(b, piece.cells, r + 1, piece.col)) r++; setCurrent({ ...piece, row: r }); setTimeout(() => lockFnRef.current(), 50); }
      else if (dy < -30){ const r = rotate(piece.cells); if (isValid(b, r, piece.row, piece.col)) setCurrent({ ...piece, cells: r }); }
    }
  };

  // Ghost row
  const ghostRow = (() => {
    let r = current.row;
    while (isValid(board, current.cells, r + 1, current.col)) r++;
    return r;
  })();

  // ── Canvas render (after every React render) ──────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    if (lastCellSizeRef.current !== cellSize) {
      texCacheRef.current.clear();
      lastCellSizeRef.current = cellSize;
    }
    renderBoard(canvasRef.current, board, current, ghostRow, cellSize, texCacheRef.current);
    if (nextCanvasRef.current) renderNext(nextCanvasRef.current, next, cellSize, texCacheRef.current);
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
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 1, lineHeight: 1,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '6px 8px', gap: '6px', boxSizing: 'border-box' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {/* Score */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px 12px' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</div>
          <div style={{ color: '#DEB887', fontWeight: 900, fontSize: '22px', lineHeight: 1.1, fontFamily: 'monospace' }}>{score}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>/ {winScore}</div>
          <div style={{ marginTop: '5px', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #8B5E3C, #DEB887)', borderRadius: '99px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Next piece */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '66px' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px' }}>Next</div>
          <canvas ref={nextCanvasRef} style={{ display: 'block' }} />
        </div>
      </div>

      {/* Board */}
      <div ref={boardContainerRef} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ display: 'block', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.08)', touchAction: 'none', userSelect: 'none' }}
        />
      </div>

      {/* Controls */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button style={{ ...btnStyle, flex: 'none', padding: '10px 8px', borderRadius: '10px', fontSize: '16px', letterSpacing: '0.5px' }}
          onClick={() => { const r = rotate(currentRef.current.cells); if (isValid(boardRef.current, r, currentRef.current.row, currentRef.current.col)) setCurrent({ ...currentRef.current, cells: r }); }}>
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
