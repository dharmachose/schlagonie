'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { GAMES } from '@/lib/games/config';
import PlayerSetup from '@/components/PlayerSetup';

export default function ProfilePage() {
  const { player, totalPoints, getPointsForGame, completedLevels, setPlayer } = useStore();
  const [mounted, setMounted] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (!player || editMode) return <PlayerSetup onDone={() => setEditMode(false)} />;

  const joinDate = new Date(player.createdAt).toLocaleDateString('fr-FR');
  const totalLevels = GAMES.length * 5;
  const progressPct = Math.min((totalPoints / totalLevels) * 100, 100);

  return (
    <div style={{ padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Profile hero */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          fontSize: '72px',
          lineHeight: 1,
          marginBottom: '12px',
          filter: 'drop-shadow(0 0 16px rgba(50,205,50,0.4))',
        }}>
          🌿
        </div>
        <h1 style={{
          color: 'var(--rasta-gold)',
          fontSize: '28px',
          fontWeight: 900,
          letterSpacing: '-0.5px',
        }}>
          {player.name}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
          Aventurier·e des Vosges depuis le {joinDate}
        </p>
        <button
          onClick={() => setEditMode(true)}
          style={{
            marginTop: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '6px 16px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ✏️ Changer de pseudo
        </button>
      </div>

      {/* Total score card */}
      <div className="card-vosges" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginBottom: '8px' }}>Score Total</div>
        <div style={{
          color: 'var(--rasta-gold)',
          fontSize: '60px',
          fontWeight: 900,
          lineHeight: 1,
          textShadow: '0 0 24px rgba(255,215,0,0.4)',
        }}>
          {totalPoints}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          points sur {totalLevels} possibles
        </div>
        <div style={{
          marginTop: '14px',
          height: '8px',
          background: 'var(--border-color)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, var(--rasta-green), var(--rasta-gold))',
            borderRadius: '4px',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Level count badge */}
      <div className="card-vosges" style={{ textAlign: 'center', marginBottom: '20px', padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div>
            <div style={{
              color: 'var(--rasta-green-light)',
              fontSize: '36px',
              fontWeight: 900,
              lineHeight: 1,
            }}>
              {completedLevels.length}
            </div>
            <div className="section-label" style={{ marginTop: '4px' }}>Niveaux terminés</div>
          </div>
          <div style={{ color: 'var(--border-active)', fontSize: '24px' }}>/</div>
          <div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '36px',
              fontWeight: 900,
              lineHeight: 1,
            }}>
              {totalLevels}
            </div>
            <div className="section-label" style={{ marginTop: '4px' }}>Total</div>
          </div>
        </div>
      </div>

      {/* Per game progression */}
      <div className="section-label" style={{ marginBottom: '14px' }}>Progression par jeu</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {GAMES.map((game) => {
          const pts = getPointsForGame(game.id);
          return (
            <div key={game.id} className="card-vosges" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>{game.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                    {game.title}
                  </span>
                </div>
                <div style={{ color: game.color, fontWeight: 900, fontSize: '18px' }}>
                  {pts}<span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>/5</span>
                </div>
              </div>
              {/* Level pips */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1,2,3,4,5].map((l) => {
                  const done = completedLevels.some((c) => c.gameId === game.id && c.level === l);
                  return (
                    <div key={l} style={{
                      flex: 1, height: '8px', borderRadius: '4px',
                      background: done ? game.color : 'var(--border-color)',
                      transition: 'background 0.3s',
                      boxShadow: done ? `0 0 8px ${game.color}60` : 'none',
                    }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
