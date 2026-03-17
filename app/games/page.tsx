'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { GAMES, LEVEL_LABELS } from '@/lib/games/config';
import type { DifficultyLevel } from '@/lib/types';

export default function GamesPage() {
  const { isLevelCompleted, getBestTime } = useStore();

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--rasta-gold)', fontSize: '22px', fontWeight: 900, marginBottom: '20px' }}>
        🎮 Choisir un Jeu
      </h1>

      {GAMES.map((game) => (
        <div key={game.id} className="card-vosges" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <span style={{ fontSize: '32px' }}>{game.emoji}</span>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px' }}>{game.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{game.description}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            {([1, 2, 3, 4, 5] as DifficultyLevel[]).map((lvl) => {
              const done = isLevelCompleted(game.id, lvl);
              const best = getBestTime(game.id, lvl);
              return (
                <Link
                  key={lvl}
                  href={`/games/${game.id}/${lvl}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: done ? game.color : 'var(--bg-dark)',
                    border: `2px solid ${done ? game.color : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    padding: '8px 4px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}>
                    <div style={{ fontSize: '16px' }}>{done ? '⭐' : `${lvl}`}</div>
                    <div style={{ color: done ? '#0d1a0d' : 'var(--text-muted)', fontSize: '9px', marginTop: '2px', fontWeight: done ? 700 : 400 }}>
                      {LEVEL_LABELS[lvl].split(' ')[0]}
                    </div>
                    {best && (
                      <div style={{ color: done ? '#0d1a0d' : 'var(--text-muted)', fontSize: '8px' }}>
                        {formatTime(best)}
                      </div>
                    )}
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
