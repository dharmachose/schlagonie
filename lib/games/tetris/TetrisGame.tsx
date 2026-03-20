'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createNoise2D } from 'simplex-noise';
import {
  emptyBoard, randomPiece, isValid, placePiece, clearLines, rotate,
  BOARD_COLS, BOARD_ROWS, DROP_SPEED, scoreLines, PIECES,
  type Board, type Tetromino, type TetrominoType,
} from './logic';
import type { GameProps } from '@/lib/types';

const WIN_SCORE: Record<number, number> = { 1: 500, 2: 800, 3: 1200, 4: 1800, 5: 2500 };

// ── Texture cache per (type, size) ────────────────────────────────────────
const TEX_CACHE = new Map<string, HTMLCanvasElement>();

/** Génère une tuile de texture bois pour un type de pièce donné. */
function buildTile(type: TetrominoType, size: number): HTMLCanvasElement {
  const key = `${type}:${size}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key)!;

  const { color, highlight } = PIECES[type];
  const [hr, hg, hb] = hexToRgb(highlight);
  const [cr, cg, cb] = hexToRgb(color);

  // Seeded PRNG per type (stable across renders)
  const seed = type.charCodeAt(0) * 17;
  const noise = createNoise2D(seededPrng(seed));

  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Grain de bois horizontal avec warp simplex
      const ny = py / size;
      const nx = px / size;
      const warp = noise(nx * 1.8, ny * 0.6) * 0.38 + noise(nx * 5, ny * 3) * 0.10;
      const ring = Math.sin((ny + warp) * Math.PI * 3.2);
      const t    = Math.max(0, Math.min(1, ring * 0.5 + 0.5));
      const i    = (py * size + px) * 4;
      d[i]   = Math.round(cr + (hr - cr) * t);
      d[i+1] = Math.round(cg + (hg - cg) * t);
      d[i+2] = Math.round(cb + (hb - cb) * t);
      d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  TEX_CACHE.set(key, cv);
  return cv;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function seededPrng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Dessin d'une cellule ──────────────────────────────────────────────────
function drawCell(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  size: number,
  type: TetrominoType,
  alpha = 1,
) {
  const tile = buildTile(type, size);
  ctx.globalAlpha = alpha;
  ctx.drawImage(tile, px, py);

  const bv = Math.max(2, Math.round(size * 0.13));

  // Bevel clair (haut + gauche)
  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.fillRect(px,         py,          size, bv  ); // haut
  ctx.fillRect(px,         py,          bv,   size ); // gauche
  // Bevel sombre (bas + droite)
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(px,         py + size - bv, size, bv); // bas
  ctx.fillRect(px + size - bv, py,         bv,   size); // droite

  ctx.globalAlpha = 1;
}

// ── Rendu principal ───────────────────────────────────────────────────────
function renderBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  current: Tetromino,
  ghostRow: number,
  cs: number,        // cell size
  w: number, h: number,
) {
  // Fond
  ctx.fillStyle = '#080f08';
  ctx.fillRect(0, 0, w, h);

  // Grille subtile
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let r = 1; r < BOARD_ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(w, r * cs); ctx.stroke();
  }
  for (let c = 1; c < BOARD_COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, h); ctx.stroke();
  }
  ctx.restore();

  // Ghost (silhouette fantôme)
  if (ghostRow !== current.row) {
    for (const [dr, dc] of current.cells) {
      const r = ghostRow + dr, c = current.col + dc;
      if (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS && !board[r][c]) {
        drawCell(ctx, c * cs, r * cs, cs, current.type, 0.15);
        // Outline fantôme
        ctx.save();
        ctx.strokeStyle = `${PIECES[current.type].highlight}55`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(c * cs + 1, r * cs + 1, cs - 2, cs - 2);
        ctx.restore();
      }
    }
  }

  // Cellules posées
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const t = board[r][c];
      if (t) drawCell(ctx, c * cs, r * cs, cs, t);
    }
  }

  // Pièce active
  for (const [dr, dc] of current.cells) {
    const r = current.row + dr, c = current.col + dc;
    if (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS) {
      drawCell(ctx, c * cs, r * cs, cs, current.type);
    }
  }
}

function renderNext(
  ctx: CanvasRenderingContext2D,
  next: Tetromino,
  cs: number,
  w: number, h: number,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'transparent';

  const cells = next.cells;
  const minR  = Math.min(...cells.map(([r]) => r));
  const minC  = Math.min(...cells.map(([, c]) => c));
  const maxR  = Math.max(...cells.map(([r]) => r));
  const maxC  = Math.max(...cells.map(([, c]) => c));
  const pw    = (maxC - minC + 1) * cs;
  const ph    = (maxR - minR + 1) * cs;
  const ox    = Math.floor((w - pw) / 2);
  const oy    = Math.floor((h - ph) / 2);

  for (const [dr, dc] of cells) {
    drawCell(ctx, ox + (dc - minC) * cs, oy + (dr - minR) * cs, cs, next.type);
  }
}

// ── Calcul du ghost row ───────────────────────────────────────────────────
function getGhostRow(board: Board, current: Tetromino): number {
  let r = current.row;
  while (isValid(board, current.cells, r + 1, current.col)) r++;
  return r;
}

// ── Composant principal ───────────────────────────────────────────────────
export default function TetrisGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [board,    setBoard]    = useState<Board>(emptyBoard());
  const [current,  setCurrent]  = useState<Tetromino>(() => randomPiece());
  const [next,     setNext]     = useState<Tetromino>(() => randomPiece());
  const [score,    setScore]    = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Refs pour éviter les closures périmées
  const boardRef   = useRef(board);
  const currentRef = useRef(current);
  const nextRef    = useRef(next);
  const scoreRef   = useRef(score);
  boardRef.current   = board;
  currentRef.current = current;
  nextRef.current    = next;
  scoreRef.current   = score;

  const lockingRef = useRef(false);
  const lockFnRef  = useRef<() => void>(() => {});
  const startRef   = useRef(Date.now());

  const boardCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef  = useRef<HTMLCanvasElement>(null);
  const boardDivRef    = useRef<HTMLDivElement>(null);

  // ── Taille des cellules (responsive) ───────────────────────────────────
  const [cellSize, setCellSize] = useState(28);
  const [nextCs,   setNextCs]   = useState(18);

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (!boardDivRef.current) return;
      const { width, height } = boardDivRef.current.getBoundingClientRect();
      const cs = Math.floor(Math.min(width / BOARD_COLS, height / BOARD_ROWS));
      if (cs > 0) setCellSize(cs);
    });
    if (boardDivRef.current) obs.observe(boardDivRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Rendu canvas board ──────────────────────────────────────────────────
  useEffect(() => {
    const cv = boardCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const w = BOARD_COLS * cellSize;
    const h = BOARD_ROWS * cellSize;
    cv.width  = w;
    cv.height = h;
    renderBoard(ctx, board, current, getGhostRow(board, current), cellSize, w, h);
  }, [board, current, cellSize]);

  // ── Rendu canvas next ───────────────────────────────────────────────────
  useEffect(() => {
    const cv = nextCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const cs = Math.min(nextCs, 24);
    const cells = next.cells;
    const maxC  = Math.max(...cells.map(([, c]) => c)) - Math.min(...cells.map(([, c]) => c)) + 1;
    const maxR  = Math.max(...cells.map(([r]) => r))   - Math.min(...cells.map(([r]) => r))   + 1;
    const w = Math.max(maxC * cs + 8, 80);
    const h = Math.max(maxR * cs + 8, 60);
    cv.width = w; cv.height = h;
    renderNext(ctx, next, cs, w, h);
  }, [next, nextCs]);

  // ── Lock ────────────────────────────────────────────────────────────────
  const lock = useCallback(() => {
    if (lockingRef.current) return;
    lockingRef.current = true;
    const p = currentRef.current;
    const b = boardRef.current;
    const nb = placePiece(b, p);
    const { board: cleared, linesCleared } = clearLines(nb);
    const ns = scoreRef.current + scoreLines(linesCleared);
    setBoard(cleared);
    setScore(ns);
    scoreRef.current = ns;
    const n = nextRef.current;
    if (!isValid(cleared, n.cells, n.row, n.col)) {
      setGameOver(true); onGameOver(); return;
    }
    const winScore = WIN_SCORE[level];
    if (ns >= winScore) { onLevelComplete(Date.now() - startRef.current); return; }
    setCurrent(n);
    setNext(randomPiece());
    lockingRef.current = false;
  }, [level, onGameOver, onLevelComplete]);

  lockFnRef.current = lock;

  // ── Auto-drop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver) return;
    const id = setInterval(() => {
      const p = currentRef.current;
      const b = boardRef.current;
      if (isValid(b, p.cells, p.row + 1, p.col)) {
        setCurrent(prev => ({ ...prev, row: prev.row + 1 }));
      } else {
        lockFnRef.current();
      }
    }, DROP_SPEED[level as keyof typeof DROP_SPEED]);
    return () => clearInterval(id);
  }, [level, gameOver]);

  // ── Clavier ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      const p = currentRef.current;
      const b = boardRef.current;
      if (e.key === 'ArrowLeft') {
        if (isValid(b, p.cells, p.row, p.col - 1)) setCurrent(prev => ({ ...prev, col: prev.col - 1 }));
      } else if (e.key === 'ArrowRight') {
        if (isValid(b, p.cells, p.row, p.col + 1)) setCurrent(prev => ({ ...prev, col: prev.col + 1 }));
      } else if (e.key === 'ArrowDown') {
        if (isValid(b, p.cells, p.row + 1, p.col)) setCurrent(prev => ({ ...prev, row: prev.row + 1 }));
        else lockFnRef.current();
      } else if (e.key === 'ArrowUp') {
        const r = rotate(p.cells);
        if (isValid(b, r, p.row, p.col)) setCurrent(prev => ({ ...prev, cells: r }));
      } else if (e.key === ' ') {
        e.preventDefault();
        let gr = p.row;
        while (isValid(b, p.cells, gr + 1, p.col)) gr++;
        setCurrent(prev => ({ ...prev, row: gr }));
        setTimeout(() => lockFnRef.current(), 30);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver]);

  // ── Touch ────────────────────────────────────────────────────────────────
  const tx = useRef(0); const ty = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    tx.current = e.touches[0].clientX;
    ty.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (gameOver) return;
    const dx = e.changedTouches[0].clientX - tx.current;
    const dy = e.changedTouches[0].clientY - ty.current;
    const p  = currentRef.current;
    const b  = boardRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      // Swipe horizontal → déplacer
      if (Math.abs(dx) > 16) {
        const nc = p.col + (dx > 0 ? 1 : -1);
        if (isValid(b, p.cells, p.row, nc)) setCurrent(prev => ({ ...prev, col: nc }));
      }
    } else {
      if (dy > 30) {
        // Swipe bas → drop
        let gr = p.row;
        while (isValid(b, p.cells, gr + 1, p.col)) gr++;
        setCurrent(prev => ({ ...prev, row: gr }));
        setTimeout(() => lockFnRef.current(), 30);
      } else if (dy < -30) {
        // Swipe haut → tourner
        const r = rotate(p.cells);
        if (isValid(b, r, p.row, p.col)) setCurrent(prev => ({ ...prev, cells: r }));
      }
    }
  };

  // ── Helpers UI ───────────────────────────────────────────────────────────
  const winScore = WIN_SCORE[level];
  const progress = Math.min((score / winScore) * 100, 100);

  const btn = (label: string, onClick: () => void, accent?: string): React.ReactNode => (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: accent ? `${accent}15` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent ?? 'rgba(255,255,255,0.10)'}`,
        borderRadius: 12,
        color: accent ?? 'rgba(255,255,255,0.80)',
        fontSize: 18,
        fontWeight: 700,
        padding: '13px 0',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        transition: 'background 0.1s',
      }}
    >
      {label}
    </button>
  );

  const moveLeft  = () => { const p = currentRef.current; const b = boardRef.current; if (!gameOver && isValid(b, p.cells, p.row, p.col - 1)) setCurrent(prev => ({ ...prev, col: prev.col - 1 })); };
  const moveRight = () => { const p = currentRef.current; const b = boardRef.current; if (!gameOver && isValid(b, p.cells, p.row, p.col + 1)) setCurrent(prev => ({ ...prev, col: prev.col + 1 })); };
  const moveDown  = () => { const p = currentRef.current; const b = boardRef.current; if (gameOver) return; if (isValid(b, p.cells, p.row + 1, p.col)) setCurrent(prev => ({ ...prev, row: prev.row + 1 })); else lockFnRef.current(); };
  const rotatePiece = () => { const p = currentRef.current; const b = boardRef.current; if (gameOver) return; const r = rotate(p.cells); if (isValid(b, r, p.row, p.col)) setCurrent(prev => ({ ...prev, cells: r })); };
  const hardDrop  = () => { if (gameOver) return; const p = currentRef.current; const b = boardRef.current; let gr = p.row; while (isValid(b, p.cells, gr + 1, p.col)) gr++; setCurrent(prev => ({ ...prev, row: gr })); setTimeout(() => lockFnRef.current(), 30); };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '6px 8px 8px', gap: 6, boxSizing: 'border-box', background: '#0a100a' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >

      {/* ── Barre info ── */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>

        {/* Score */}
        <div style={{
          flex: 1, background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 14, padding: '8px 14px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Score</div>
          <div style={{ color: '#DEB887', fontWeight: 900, fontSize: 26, fontFamily: 'monospace', lineHeight: 1.1 }}>{score}</div>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 1 }}>/ {winScore}</div>
          {/* Barre de progression */}
          <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#8B5E3C,#DEB887)', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Next piece */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 14, padding: '8px 10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          minWidth: 80,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Suivant</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <canvas ref={nextCanvasRef} style={{ display: 'block', imageRendering: 'pixelated' }} />
          </div>
        </div>
      </div>

      {/* ── Plateau ── */}
      <div
        ref={boardDivRef}
        style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      >
        <canvas
          ref={boardCanvasRef}
          style={{
            display: 'block',
            imageRendering: 'pixelated',
            borderRadius: 6,
            boxShadow: '0 0 0 1.5px rgba(255,255,255,0.07)',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </div>

      {/* ── Contrôles ── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Tourner + Drop */}
        <div style={{ display: 'flex', gap: 6 }}>
          {btn('🔄', rotatePiece, '#7BA05B')}
          {btn('⬇⬇', hardDrop,   '#8B5E3C')}
        </div>
        {/* Gauche / Bas / Droite */}
        <div style={{ display: 'flex', gap: 6 }}>
          {btn('◀', moveLeft)}
          {btn('▼', moveDown)}
          {btn('▶', moveRight)}
        </div>
      </div>
    </div>
  );
}
