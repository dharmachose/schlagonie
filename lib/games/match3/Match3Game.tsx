'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  buildGrid, findMatches, removeMatches, applyGravity, canSwap,
  LEVEL_CONFIG, GEMS, type Grid,
} from './logic';
import type { GameProps } from '@/lib/types';

export default function Match3Game({ level, onLevelComplete }: GameProps) {
  const config = LEVEL_CONFIG[level];
  const availableGems = GEMS.slice(0, config.gemTypes);
  const { gridSize } = config;

  const [grid, setGrid] = useState<Grid>(() => buildGrid(level));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [matchedCells, setMatchedCells] = useState<Set<string>>(new Set());
  const [shakeCells, setShakeCells] = useState<[number, number][]>([]);
  const [comboLabel, setComboLabel] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState(44);
  const startRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure actual available space to size the grid properly
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const byWidth = Math.floor((width - 16) / gridSize);
    // Reserve ~90px for score bar + hint text + gaps
    const byHeight = Math.floor((height - 90) / gridSize);
    setCellSize(Math.min(byWidth, byHeight, 72));
  }, [gridSize]);

  const processCascade = useCallback((g: Grid, currentScore: number, depth = 1) => {
    const matches = findMatches(g);
    if (matches.length === 0) {
      setGrid(g);
      setAnimating(false);
      return;
    }

    // Show the current grid state (e.g. after swap) so matched gems are visible
    setGrid(g);

    // Mark matched cells for pop animation
    const matchedKeys = new Set<string>();
    matches.forEach(({ cells }) => cells.forEach(([r, c]) => matchedKeys.add(`${r},${c}`)));
    setMatchedCells(matchedKeys);

    setTimeout(() => {
      setMatchedCells(new Set());
      const { grid: after, points } = removeMatches(g, matches);

      // Show grid with empty holes after removal
      setGrid(after);

      const mult = Math.min(3, 1 + (depth - 1) * 0.5);
      const boosted = Math.round(points * mult);
      const newScore = currentScore + boosted;
      setScore(newScore);
      scoreRef.current = newScore;

      if (depth >= 2) {
        setComboLabel(`🔥 CASCADE ×${mult}`);
        setTimeout(() => setComboLabel(null), 1200);
      }

      if (newScore >= config.targetScore) {
        onLevelComplete(Date.now() - startRef.current);
        return;
      }

      setTimeout(() => {
        const filled = applyGravity(after, config.gemTypes, availableGems);
        // Show the filled grid before checking for new cascades
        setGrid(filled);
        setTimeout(() => processCascade(filled, newScore, depth + 1), 280);
      }, 240);
    }, 300);
  }, [config, availableGems, onLevelComplete]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (animating) return;

    if (!selected) {
      setSelected([r, c]);
      return;
    }

    const [sr, sc] = selected;
    if (sr === r && sc === c) {
      setSelected(null);
      return;
    }

    if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
      // Adjacent: try swap
      if (canSwap(grid, sr, sc, r, c)) {
        const newGrid = grid.map((row) => [...row]);
        [newGrid[sr][sc], newGrid[r][c]] = [newGrid[r][c], newGrid[sr][sc]];
        setSelected(null);
        setAnimating(true);
        processCascade(newGrid, scoreRef.current);
      } else {
        // Adjacent but no valid match → shake feedback
        setShakeCells([[sr, sc], [r, c]]);
        setSelected(null);
        setTimeout(() => setShakeCells([]), 320);
      }
    } else {
      // Non-adjacent: re-select
      setSelected([r, c]);
    }
  }, [animating, selected, grid, processCascade]);

  const gridPx = cellSize * gridSize + 3 * (gridSize - 1);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 8px',
        gap: '8px',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Score bar */}
      <div style={{ width: '100%', maxWidth: `${gridPx}px` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: 'var(--rasta-gold)', fontWeight: 700, fontSize: '14px' }}>{score} pts</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>🎯 {config.targetScore}</span>
        </div>
        <div style={{ height: '6px', background: 'var(--bg-card)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (score / config.targetScore) * 100)}%`,
            background: 'linear-gradient(90deg, var(--rasta-green), var(--rasta-gold))',
            borderRadius: '3px',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Combo badge (fixed height to avoid layout shift) */}
      <div style={{ minHeight: '24px', textAlign: 'center' }}>
        {comboLabel && (
          <span style={{
            color: 'var(--rasta-gold)',
            fontWeight: 900,
            fontSize: '16px',
            animation: 'bounce-in 0.3s ease-out',
            textShadow: '0 0 12px rgba(255,215,0,0.6)',
          }}>
            {comboLabel}
          </span>
        )}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
        gap: '3px',
        touchAction: 'none',
        userSelect: 'none',
        flexShrink: 0,
      }}>
        {grid.map((row, r) =>
          row.map((gem, c) => {
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const isMatched = matchedCells.has(`${r},${c}`);
            const isShaking = shakeCells.some(([sr, sc]) => sr === r && sc === c);
            const animated = isMatched || isShaking;
            return (
              <button
                key={`${r}-${c}`}
                className={isMatched ? 'gem-pop' : isShaking ? 'gem-shake' : undefined}
                onClick={() => handleCellClick(r, c)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: '8px',
                  border: `2px solid ${isSelected ? 'var(--rasta-gold)' : 'transparent'}`,
                  background: isSelected ? 'rgba(255,215,0,0.2)' : 'var(--bg-card)',
                  fontSize: `${cellSize * 0.54}px`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Don't set transform/transition when CSS animation is active
                  transform: animated ? undefined : (isSelected ? 'scale(1.1)' : undefined),
                  transition: animated ? undefined : 'transform 0.12s, border-color 0.1s',
                  WebkitTapHighlightColor: 'transparent',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                {gem ?? ''}
              </button>
            );
          })
        )}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', margin: 0 }}>
        Touche une gemme puis une voisine pour échanger 💡
      </p>
    </div>
  );
}
