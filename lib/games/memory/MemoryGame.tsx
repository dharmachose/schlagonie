'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildDeck, GRID_CONFIG } from './logic';
import type { MemoryCard } from './logic';
import type { GameProps } from '@/lib/types';

export default function MemoryGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setCards(buildDeck(level));
    startRef.current = Date.now();
  }, [level]);

  const handleCardClick = useCallback((id: number) => {
    if (locked) return;
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      return prev.map((c) => c.id === id ? { ...c, flipped: true } : c);
    });

    setFlipped((prev) => {
      const next = [...prev, id];
      if (next.length === 2) {
        setLocked(true);
        setMoves((m) => m + 1);
        const [a, b] = next;
        setTimeout(() => {
          setCards((prev) => {
            const ca = prev.find((c) => c.id === a)!;
            const cb = prev.find((c) => c.id === b)!;
            if (ca.emoji === cb.emoji) {
              // Match!
              const updated = prev.map((c) =>
                c.id === a || c.id === b ? { ...c, matched: true } : c
              );
              // Check win
              if (updated.every((c) => c.matched)) {
                onLevelComplete(Date.now() - startRef.current);
              }
              setLocked(false);
              return updated;
            } else {
              // No match → flip back
              const updated = prev.map((c) =>
                c.id === a || c.id === b ? { ...c, flipped: false } : c
              );
              setLocked(false);
              return updated;
            }
          });
          setFlipped([]);
        }, 900);
        return next;
      }
      return next;
    });
  }, [locked, onLevelComplete]);

  const { rows, cols } = GRID_CONFIG[level];

  if (cards.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px',
      height: '100%',
      gap: '10px',
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
        🎯 Coups : <strong style={{ color: 'var(--rasta-gold)' }}>{moves}</strong>
        &nbsp;·&nbsp;
        Paires : <strong style={{ color: 'var(--rasta-green-light)' }}>
          {cards.filter((c) => c.matched).length / 2} / {cards.length / 2}
        </strong>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: '6px',
        width: '100%',
        flex: 1,
        maxWidth: `${cols * 62}px`,
      }}>
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            style={{
              aspectRatio: '1',
              borderRadius: '10px',
              border: '2px solid',
              borderColor: card.matched
                ? 'var(--rasta-green)'
                : card.flipped
                ? 'var(--rasta-gold)'
                : 'var(--border-color)',
              background: card.matched
                ? 'rgba(34,139,34,0.25)'
                : card.flipped
                ? 'rgba(255,215,0,0.12)'
                : 'var(--bg-card)',
              fontSize: 'clamp(16px, 4vw, 28px)',
              cursor: card.matched || card.flipped ? 'default' : 'pointer',
              transition: 'transform 0.15s, background 0.2s',
              transform: card.flipped || card.matched ? 'scale(1.03)' : 'scale(1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {card.flipped || card.matched ? card.emoji : '?'}
          </button>
        ))}
      </div>
    </div>
  );
}
