'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  buildGrid, findMatches, removeMatches, applyGravity, canSwap,
  LEVEL_CONFIG, GEMS, type Grid,
} from './logic';
import type { GameProps } from '@/lib/types';

export default function Match3Game({ level, onLevelComplete, onGameOver }: GameProps) {
  const config = LEVEL_CONFIG[level];
  const availableGems = GEMS.slice(0, config.gemTypes);

  const [grid, setGrid] = useState<Grid>(() => buildGrid(level));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startRef = useRef(Date.now());
  const scoreRef = useRef(0);

  // Process cascades after every change
  const processCascade = useCallback((g: Grid, currentScore: number) => {
    const matches = findMatches(g);
    if (matches.length === 0) {
      setGrid(g);
      setAnimating(false);
      return;
    }
    const { grid: after, points } = removeMatches(g, matches);
    const newScore = currentScore + points;
    setScore(newScore);
    scoreRef.current = newScore;

    if (newScore >= config.targetScore) {
      setGrid(after);
      onLevelComplete(Date.now() - startRef.current);
      return;
    }

    setTimeout(() => {
      const filled = applyGravity(after, config.gemTypes, availableGems);
      setTimeout(() => processCascade(filled, newScore), 300);
    }, 250);
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

    // Try swap
    if (canSwap(grid, sr, sc, r, c)) {
      const newGrid = grid.map((row) => [...row]);
      [newGrid[sr][sc], newGrid[r][c]] = [newGrid[r][c], newGrid[sr][sc]];
      setSelected(null);
      setAnimating(true);
      processCascade(newGrid, scoreRef.current);
    } else {
      // Select new cell
      setSelected([r, c]);
    }
  }, [animating, selected, grid, processCascade]);

  const { gridSize } = config;
  const cellSize = Math.floor(Math.min(
    (typeof window !== 'undefined' ? window.innerWidth - 32 : 340) / gridSize,
    48
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px', gap: '10px', height: '100%' }}>
      {/* Score bar */}
      <div style={{ width: '100%', maxWidth: `${gridSize * cellSize + 16}px` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: 'var(--rasta-gold)', fontWeight: 700, fontSize: '14px' }}>{score} pts</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>🎯 {config.targetScore}</span>
        </div>
        <div style={{ height: '6px', background: 'var(--bg-card)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (score / config.targetScore) * 100)}%`,
            background: `linear-gradient(90deg, var(--rasta-green), var(--rasta-gold))`,
            borderRadius: '3px',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
        gap: '3px',
        touchAction: 'none',
        userSelect: 'none',
      }}>
        {grid.map((row, r) =>
          row.map((gem, c) => {
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: '8px',
                  border: `2px solid ${isSelected ? 'var(--rasta-gold)' : 'transparent'}`,
                  background: isSelected ? 'rgba(255,215,0,0.2)' : 'var(--bg-card)',
                  fontSize: `${cellSize * 0.52}px`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.1s, border-color 0.1s',
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

      <p style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center' }}>
        Touche une gemme puis une voisine pour échanger 💡
      </p>
    </div>
  );
}
