'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { GAMES, LEVEL_LABELS } from '@/lib/games/config';
import type { DifficultyLevel } from '@/lib/types';

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

      {/* Greeting discret */}
      {mounted && player && (
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '13px',
          marginBottom: '18px',
          letterSpacing: '0.2px',
        }}>
          Bienvenue, <span style={{ color: 'var(--rasta-gold)', fontWeight: 700 }}>{player.name}</span> 🌲
        </p>
      )}

      {GAMES.map((game) => (
        <div key={game.id} className="card-vosges" style={{ marginBottom: '14px' }}>
          {/* En-tête du jeu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              fontSize: '36px',
              width: '52px', height: '52px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${game.color}18`,
              borderRadius: '13px',
              border: `1px solid ${game.color}40`,
              flexShrink: 0,
            }}>
              {game.emoji}
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px' }}>{game.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{game.description}</div>
            </div>
          </div>

          {/* Grille des niveaux */}
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
                      ? `linear-gradient(145deg, ${game.color}30, ${game.color}18)`
                      : 'linear-gradient(145deg, var(--bg-card-deep), var(--bg-dark))',
                    border: `2px solid ${done ? game.color : 'var(--border-color)'}`,
                    color: done ? game.color : 'var(--text-muted)',
                  }}
                >
                  <div style={{ fontSize: '19px', lineHeight: 1 }}>{done ? '⭐' : lvl}</div>
                  <div style={{ fontSize: '10px', fontWeight: done ? 700 : 400 }}>
                    {LEVEL_LABELS[lvl].split(' ')[0]}
                  </div>
                  {best && (
                    <div style={{ fontSize: '9px', opacity: 0.8 }}>{formatTime(best)}</div>
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
