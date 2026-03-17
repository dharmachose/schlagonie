'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import PlayerSetup from '@/components/PlayerSetup';
import { GAMES } from '@/lib/games/config';

export default function HomePage() {
  const { player, totalPoints, getPointsForGame } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (!player) return <PlayerSetup />;

  return (
    <div style={{ padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Hero header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '72px', marginBottom: '10px', lineHeight: 1 }}>🌲</div>
        <h1 style={{
          color: 'var(--rasta-gold)',
          fontSize: '28px',
          fontWeight: 900,
          lineHeight: 1.2,
          letterSpacing: '-0.5px',
        }}>
          Bienvenue, {player.name} !
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
          Schlagonie — Royaume des Vosges 🇫🇷
        </p>
      </div>

      {/* Score global */}
      <div className="card-vosges" style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div className="section-label" style={{ marginBottom: '8px' }}>Score Global</div>
        <div style={{
          color: 'var(--rasta-gold)',
          fontSize: '56px',
          fontWeight: 900,
          lineHeight: 1,
          textShadow: '0 0 24px rgba(255,215,0,0.4)',
        }}>
          {totalPoints}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          points sur {GAMES.length * 5}
        </div>
        {/* Progress bar */}
        <div style={{
          marginTop: '14px',
          height: '6px',
          borderRadius: '3px',
          background: 'var(--border-color)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min((totalPoints / (GAMES.length * 5)) * 100, 100)}%`,
            background: 'linear-gradient(90deg, var(--rasta-green), var(--rasta-gold))',
            borderRadius: '3px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Section heading */}
      <div className="section-label" style={{ marginBottom: '14px' }}>Mini-Jeux</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {GAMES.map((game) => {
          const points = getPointsForGame(game.id);
          const progress = points / 5;
          return (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="card-link"
            >
              <div className="card-vosges" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderColor: points > 0 ? game.color : 'var(--border-color)',
                transition: 'border-color 0.2s',
              }}>
                <div style={{
                  fontSize: '44px',
                  flexShrink: 0,
                  width: '56px',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${game.color}18`,
                  borderRadius: '14px',
                  border: `1px solid ${game.color}40`,
                }}>
                  {game.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px' }}>
                    {game.title}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {game.description}
                  </div>
                  {/* Mini progress bar */}
                  <div style={{
                    marginTop: '8px',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'var(--border-color)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress * 100}%`,
                      background: game.color,
                      borderRadius: '2px',
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    color: points > 0 ? game.color : 'var(--text-muted)',
                    fontWeight: 900,
                    fontSize: '22px',
                    lineHeight: 1,
                  }}>
                    {points}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>/ 5 pts</div>
                  <div style={{ fontSize: '18px', marginTop: '4px' }}>›</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '32px', lineHeight: 1.5 }}>
        🌿 Made with love for Shlagonie, reine d&apos;Aydoilles 👑
      </p>
    </div>
  );
}
