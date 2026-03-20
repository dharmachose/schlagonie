'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { GAMES, LEVEL_LABELS } from '@/lib/games/config';
import type { DifficultyLevel } from '@/lib/types';

// Cannabis leaf SVG icon — used instead of ⭐ for completed levels
function LeafIcon({ size = 20, opacity = 1 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ opacity, display: 'block' }}>
      {/* centre top */}
      <ellipse cx="10" cy="4.5" rx="2.2" ry="4.8" fill="#32CD32" transform="rotate(0 10 10)"/>
      {/* upper-left */}
      <ellipse cx="10" cy="4.5" rx="1.9" ry="4.2" fill="#2db82d" transform="rotate(-40 10 10)"/>
      {/* upper-right */}
      <ellipse cx="10" cy="4.5" rx="1.9" ry="4.2" fill="#2db82d" transform="rotate(40 10 10)"/>
      {/* lower-left */}
      <ellipse cx="10" cy="4.5" rx="1.5" ry="3.4" fill="#1e8c1e" transform="rotate(-72 10 10)"/>
      {/* lower-right */}
      <ellipse cx="10" cy="4.5" rx="1.5" ry="3.4" fill="#1e8c1e" transform="rotate(72 10 10)"/>
      {/* stem */}
      <line x1="10" y1="11" x2="10" y2="19" stroke="#228B22" strokeWidth="1.8" strokeLinecap="round"/>
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
                  <div style={{ lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '22px' }}>
                    {done
                      ? <LeafIcon size={19} />
                      : <span style={{ fontSize: '16px', fontWeight: 700 }}>{lvl}</span>
                    }
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: done ? 700 : 400, marginTop: '2px' }}>
                    {LEVEL_LABELS[lvl].split(' ')[0]}
                  </div>
                  {best && (
                    <div style={{ fontSize: '9px', opacity: 0.75 }}>{formatTime(best)}</div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
