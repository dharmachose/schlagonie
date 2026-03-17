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
    <div style={{ padding: '20px 16px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>🌲</div>
        <h1 style={{ color: 'var(--rasta-gold)', fontSize: '26px', fontWeight: 900, lineHeight: 1.2 }}>
          Bienvenue, {player.name} !
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          Schlagonie — Royaume des Vosges 🇫🇷
        </p>
      </div>

      {/* Score global */}
      <div className="card-vosges" style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Score Global
        </div>
        <div style={{ color: 'var(--rasta-gold)', fontSize: '48px', fontWeight: 900, lineHeight: 1 }}>
          {totalPoints}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>pts</div>
      </div>

      {/* Jeux */}
      <h2 style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Mini-Jeux
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {GAMES.map((game) => {
          const points = getPointsForGame(game.id);
          return (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card-vosges" style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                transition: 'border-color 0.15s',
                borderColor: points > 0 ? game.color : 'var(--border-color)',
              }}>
                <div style={{ fontSize: '40px', flexShrink: 0 }}>{game.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px' }}>
                    {game.title}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {game.description}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: game.color, fontWeight: 900, fontSize: '20px' }}>{points}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>/ 5 pts</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '32px' }}>
        🌿 Made with love for Shlagonie, reine d&apos;Aydoilles 👑
      </p>
    </div>
  );
}
