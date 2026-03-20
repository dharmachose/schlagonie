'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { GAMES } from '@/lib/games/config';
import PlayerSetup from '@/components/PlayerSetup';

// Small cannabis leaf pip — green when done, muted when not
function LeafPip({ done }: { done: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" style={{ display: 'block', opacity: done ? 1 : 0.15, flexShrink: 0 }}>
      <path d="M10,11 C8.2,7.5 7.5,4 10,0.5 C12.5,4 11.8,7.5 10,11Z" fill="#2ECC40"/>
      <g transform="rotate(-33 10 11)">
        <path d="M10,11 C8.6,8 8.2,5 10,2 C11.8,5 11.4,8 10,11Z" fill="#27AE60"/>
      </g>
      <g transform="rotate(33 10 11)">
        <path d="M10,11 C8.6,8 8.2,5 10,2 C11.8,5 11.4,8 10,11Z" fill="#27AE60"/>
      </g>
      <g transform="rotate(-63 10 11)">
        <path d="M10,11 C9,9 8.6,6.5 10,4 C11.4,6.5 11,9 10,11Z" fill="#229954"/>
      </g>
      <g transform="rotate(63 10 11)">
        <path d="M10,11 C9,9 8.6,6.5 10,4 C11.4,6.5 11,9 10,11Z" fill="#229954"/>
      </g>
      <g transform="rotate(-90 10 11)">
        <path d="M10,11 C9.3,9.8 9,8.2 10,6 C11,8.2 10.7,9.8 10,11Z" fill="#1a7a40"/>
      </g>
      <g transform="rotate(90 10 11)">
        <path d="M10,11 C9.3,9.8 9,8.2 10,6 C11,8.2 10.7,9.8 10,11Z" fill="#1a7a40"/>
      </g>
      <line x1="10" y1="11" x2="10" y2="13.5" stroke="#1a6e1a" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

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
          fontSize: '72px', lineHeight: 1, marginBottom: '12px',
          filter: 'drop-shadow(0 0 16px rgba(50,205,50,0.4))',
        }}>
          🌿
        </div>
        <h1 style={{ color: 'var(--rasta-gold)', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
          {player.name}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
          Aventurier·e des Vosges depuis le {joinDate}
        </p>
        <button
          onClick={() => setEditMode(true)}
          style={{
            marginTop: '12px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
            borderRadius: '20px', padding: '6px 16px',
            color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
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
          color: 'var(--rasta-gold)', fontSize: '60px', fontWeight: 900,
          lineHeight: 1, textShadow: '0 0 24px rgba(255,215,0,0.4)',
        }}>
          {totalPoints}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          points sur {totalLevels} possibles
        </div>
        <div style={{ marginTop: '14px', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #228B22, #FFD700)',
            borderRadius: '4px', transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Level count badge */}
      <div className="card-vosges" style={{ textAlign: 'center', marginBottom: '20px', padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div>
            <div style={{ color: 'var(--rasta-green-light)', fontSize: '36px', fontWeight: 900, lineHeight: 1 }}>
              {completedLevels.length}
            </div>
            <div className="section-label" style={{ marginTop: '4px' }}>Niveaux terminés</div>
          </div>
          <div style={{ color: 'var(--border-active)', fontSize: '24px' }}>/</div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '36px', fontWeight: 900, lineHeight: 1 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '26px' }}>{game.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {game.title}
                  </span>
                </div>
                <div style={{ color: 'var(--rasta-gold)', fontWeight: 900, fontSize: '18px' }}>
                  {pts}<span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>/5</span>
                </div>
              </div>
              {/* Cannabis leaf pips */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                {[1,2,3,4,5].map((l) => {
                  const done = completedLevels.some((c) => c.gameId === game.id && c.level === l);
                  return (
                    <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <LeafPip done={done} />
                      {done && (
                        <div style={{ fontSize: '8px', color: 'rgba(50,205,50,0.6)', fontWeight: 600 }}>
                          {l}
                        </div>
                      )}
                    </div>
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
