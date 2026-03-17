'use client';

import { useState, useEffect, useRef } from 'react';
import { buildDeck, GRID_CONFIG } from './logic';
import type { MemoryCard } from './logic';
import type { GameProps } from '@/lib/types';

export default function MemoryGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCards(buildDeck(level));
    setMoves(0);
    setElapsed(0);
    setLocked(false);
    setSelected([]);
    startRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [level]);

  // Separate effect to handle pair check — no side-effects in state updaters
  useEffect(() => {
    if (selected.length !== 2) return;

    setLocked(true);
    setMoves((m) => m + 1);

    const [a, b] = selected;
    const timer = setTimeout(() => {
      setCards((prev) => {
        const ca = prev.find((c) => c.id === a)!;
        const cb = prev.find((c) => c.id === b)!;
        if (ca.emoji === cb.emoji) {
          return prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true } : c
          );
        }
        return prev.map((c) =>
          c.id === a || c.id === b ? { ...c, flipped: false } : c
        );
      });
      setSelected([]);
      setLocked(false);
    }, 900);

    return () => clearTimeout(timer);
  }, [selected]);

  // Win condition — safe to call onLevelComplete here, outside a state updater
  useEffect(() => {
    if (cards.length > 0 && cards.every((c) => c.matched)) {
      if (timerRef.current) clearInterval(timerRef.current);
      onLevelComplete(Date.now() - startRef.current);
    }
  }, [cards, onLevelComplete]);

  const handleCardClick = (id: number) => {
    if (locked) return;

    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      return prev.map((c) => c.id === id ? { ...c, flipped: true } : c);
    });

    setSelected((prev) => {
      // Guard: ignore already-selected or already-matched/flipped cards
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

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
      <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>🎯 Coups : <strong style={{ color: 'var(--rasta-gold)' }}>{moves}</strong></span>
        <span>Paires : <strong style={{ color: 'var(--rasta-green-light)' }}>
          {cards.filter((c) => c.matched).length / 2} / {cards.length / 2}
        </strong></span>
        <span>⏱ <strong style={{ color: 'var(--text-primary)' }}>{formatTime(elapsed)}</strong></span>
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
            className="memory-card"
            style={{
              aspectRatio: '1',
              borderRadius: '10px',
              border: '2px solid',
              borderColor: card.matched
                ? 'var(--rasta-green)'
                : card.flipped
                ? 'var(--rasta-gold)'
                : 'var(--border-color)',
              WebkitTapHighlightColor: 'transparent',
              cursor: card.matched || card.flipped ? 'default' : 'pointer',
            }}
          >
            <div className={`memory-card-inner${card.flipped || card.matched ? ' is-flipped' : ''}`}>
              <div
                className="memory-card-face"
                style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', fontWeight: 700 }}
              >
                ?
              </div>
              <div
                className="memory-card-face memory-card-back"
                style={{
                  background: card.matched
                    ? 'rgba(34,139,34,0.25)'
                    : 'rgba(255,215,0,0.12)',
                }}
              >
                {card.emoji}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
