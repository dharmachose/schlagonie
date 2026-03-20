'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { GAMES, LEVEL_LABELS } from '@/lib/games/config';
import type { DifficultyLevel } from '@/lib/types';

// Cannabis leaf SVG — 7 folioles pointues, tige courte, hub en bas
function LeafIcon({ size = 20, opacity = 1 }: { size?: number; opacity?: number }) {
  // Hub at (10,11). Fingers spread wide, stem only 2px.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ opacity, display: 'block', flexShrink: 0 }}>
      {/* Centre */}
      <path d="M10,11 C8.2,7.5 7.5,4 10,0.5 C12.5,4 11.8,7.5 10,11Z" fill="#2ECC40"/>
      {/* Upper-left */}
      <g transform="rotate(-33 10 11)">
        <path d="M10,11 C8.6,8 8.2,5 10,2 C11.8,5 11.4,8 10,11Z" fill="#27AE60"/>
      </g>
      {/* Upper-right */}
      <g transform="rotate(33 10 11)">
        <path d="M10,11 C8.6,8 8.2,5 10,2 C11.8,5 11.4,8 10,11Z" fill="#27AE60"/>
      </g>
      {/* Lower-left */}
      <g transform="rotate(-63 10 11)">
        <path d="M10,11 C9,9 8.6,6.5 10,4 C11.4,6.5 11,9 10,11Z" fill="#229954"/>
      </g>
      {/* Lower-right */}
      <g transform="rotate(63 10 11)">
        <path d="M10,11 C9,9 8.6,6.5 10,4 C11.4,6.5 11,9 10,11Z" fill="#229954"/>
      </g>
      {/* Side-left */}
      <g transform="rotate(-90 10 11)">
        <path d="M10,11 C9.3,9.8 9,8.2 10,6 C11,8.2 10.7,9.8 10,11Z" fill="#1a7a40"/>
      </g>
      {/* Side-right */}
      <g transform="rotate(90 10 11)">
        <path d="M10,11 C9.3,9.8 9,8.2 10,6 C11,8.2 10.7,9.8 10,11Z" fill="#1a7a40"/>
      </g>
      {/* Tige minimale */}
      <line x1="10" y1="11" x2="10" y2="13.5" stroke="#1a6e1a" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

export default function GamesPage() {
  const { player, isLevelCompleted, getBestTime } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '16px 16px 8px', maxWidth: '480px', margin: '0 auto' }}>

      {mounted && player && (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px', letterSpacing: '0.2px' }}>
          Bienvenue, <span style={{ color: 'var(--rasta-gold)', fontWeight: 700 }}>{player.name}</span> 🌲
        </p>
      )}

      {GAMES.map((game) => (
        <div key={game.id} className="card-vosges" style={{ marginBottom: '14px' }}>
          {/* Game header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              fontSize: '34px',
              width: '52px', height: '52px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(50,205,50,0.1)',
              borderRadius: '13px',
              border: '1px solid rgba(50,205,50,0.2)',
              flexShrink: 0,
            }}>
              {game.emoji}
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px' }}>{game.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{game.description}</div>
            </div>
          </div>

          {/* Level grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '7px' }}>
            {([1, 2, 3, 4, 5] as DifficultyLevel[]).map((lvl) => {
              const done = isLevelCompleted(game.id, lvl);
              const best = getBestTime(game.id, lvl);
              return (
                <Link
                  key={lvl}
                  href={`/games/${game.id}/${lvl}`}
                  className="level-btn"
                  style={{
                    background: done
                      ? 'linear-gradient(145deg, rgba(255,215,0,0.18), rgba(255,215,0,0.08))'
                      : 'linear-gradient(145deg, var(--bg-card-deep), var(--bg-dark))',
                    border: `2px solid ${done ? 'rgba(255,215,0,0.7)' : 'var(--border-color)'}`,
                    color: done ? '#FFD700' : 'var(--text-muted)',
                    boxShadow: done ? '0 0 10px rgba(255,215,0,0.18)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '34px', flexShrink: 0 }}>
                    {done
                      ? <LeafIcon size={32} />
                      : <span style={{ fontSize: '18px', fontWeight: 700 }}>{lvl}</span>
                    }
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: done ? 700 : 400, lineHeight: 1.2 }}>
                    {LEVEL_LABELS[lvl].split(' ')[0]}
                  </div>
                  {/* Toujours présent pour garder la hauteur uniforme */}
                  <div style={{ fontSize: '9px', opacity: 0.7, height: '11px', lineHeight: '11px' }}>
                    {best ? formatTime(best) : ''}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
