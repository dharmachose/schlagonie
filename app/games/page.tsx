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
    <div style={{ padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--rasta-gold)', fontSize: '24px', fontWeight: 900, marginBottom: '22px', letterSpacing: '-0.5px' }}>
        🎮 Choisir un Jeu
      </h1>

      {GAMES.map((game) => (
        <div key={game.id} className="card-vosges" style={{ marginBottom: '16px' }}>
          {/* Game header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <div style={{
              fontSize: '38px',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${game.color}18`,
              borderRadius: '14px',
              border: `1px solid ${game.color}40`,
              flexShrink: 0,
            }}>
              {game.emoji}
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '17px' }}>{game.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '3px' }}>{game.description}</div>
            </div>
          </div>

          {/* Level grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
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
                      ? `linear-gradient(145deg, ${game.color}30, ${game.color}18)`
                      : 'linear-gradient(145deg, var(--bg-card-deep), var(--bg-dark))',
                    border: `2px solid ${done ? game.color : 'var(--border-color)'}`,
                    color: done ? game.color : 'var(--text-muted)',
                  }}
                >
                  <div style={{ fontSize: '20px', lineHeight: 1 }}>
                    {done ? '⭐' : lvl}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: done ? 700 : 400,
                    color: done ? game.color : 'var(--text-muted)',
                  }}>
                    {LEVEL_LABELS[lvl].split(' ')[0]}
                  </div>
                  {best && (
                    <div style={{
                      fontSize: '10px',
                      color: done ? game.color : 'var(--text-muted)',
                      opacity: 0.8,
                    }}>
                      {formatTime(best)}
                    </div>
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
