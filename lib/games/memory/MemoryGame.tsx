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
  const [cellSize, setCellSize] = useState(60);
  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { rows, cols } = GRID_CONFIG[level];

  // Calculate cell size dynamically based on viewport — same approach as Tetris/Match3
  useEffect(() => {
    const calc = () => {
      const availW = window.innerWidth - 24; // 12px padding each side
      const availH = window.innerHeight - 180; // HUD ~56px + stats row ~44px + padding
      const size = Math.floor(Math.min(availW / cols, availH / rows, 80));
      setCellSize(Math.max(size, 44)); // minimum 44px for touch targets
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [cols, rows]);

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

  // Pair check effect
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
    }, 500);

    return () => clearTimeout(timer);
  }, [selected]);

  // Win condition
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
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  const matched = cards.filter((c) => c.matched).length / 2;
  const total = cards.length / 2;
  const fontSize = Math.max(Math.floor(cellSize * 0.42), 16);

  if (cards.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 10px',
      height: '100%',
      gap: '10px',
    }}>
      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: '6px',
        justifyContent: 'center',
        width: '100%',
      }}>
        {[
          { label: 'Coups', value: moves, icon: '🎯', color: 'var(--rasta-gold)' },
          { label: 'Paires', value: `${matched}/${total}`, icon: '🃏', color: 'var(--rasta-green-light)' },
          { label: 'Temps', value: formatTime(elapsed), icon: '⏱', color: 'var(--text-primary)' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1px',
          }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>
            <strong style={{ color, fontSize: '15px', lineHeight: 1.2 }}>{value}</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', padding: '0 2px' }}>
        <div className="memory-progress-bar">
          <div
            className="memory-progress-fill"
            style={{ width: `${total > 0 ? (matched / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Grid — fixed pixel sizing avoids overflow/stretch issues on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        gap: '7px',
        flex: 1,
        alignContent: 'center',
      }}>
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className="memory-card"
            data-matched={card.matched || undefined}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              borderRadius: '14px',
              border: '2px solid',
              borderColor: card.matched
                ? 'var(--rasta-green)'
                : card.flipped
                ? 'var(--rasta-gold)'
                : 'rgba(255,255,255,0.12)',
              boxShadow: card.matched
                ? '0 0 10px rgba(50,205,50,0.35)'
                : card.flipped
                ? '0 0 10px rgba(255,215,0,0.25)'
                : '0 2px 8px rgba(0,0,0,0.4)',
              WebkitTapHighlightColor: 'transparent',
              cursor: card.matched || card.flipped ? 'default' : 'pointer',
            }}
          >
            <div className={`memory-card-inner${card.flipped || card.matched ? ' is-flipped' : ''}${card.matched ? ' is-matched' : ''}`}>
              {/* Front (hidden face) */}
              <div
                className="memory-card-face"
                style={{
                  background: 'linear-gradient(145deg, #12250f, #0a1a09)',
                  flexDirection: 'column',
                  gap: '1px',
                }}
              >
                <span style={{ fontSize: `${Math.max(fontSize - 6, 12)}px`, opacity: 0.18, lineHeight: 1 }}>🌲</span>
                <span style={{
                  color: 'rgba(255,255,255,0.28)',
                  fontSize: `${Math.max(fontSize - 4, 13)}px`,
                  fontWeight: 900,
                  lineHeight: 1,
                  fontFamily: 'monospace',
                }}>?</span>
              </div>
              {/* Back (emoji face) */}
              <div
                className="memory-card-face memory-card-back"
                style={{
                  background: card.matched
                    ? 'linear-gradient(145deg, rgba(34,139,34,0.4), rgba(20,90,20,0.25))'
                    : 'linear-gradient(145deg, rgba(255,215,0,0.15), rgba(180,120,0,0.08))',
                  fontSize: `${fontSize}px`,
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
