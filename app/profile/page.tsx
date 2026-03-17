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

  return (
    <div style={{ padding: '20px 16px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Profile header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>🌿</div>
        <h1 style={{ color: 'var(--rasta-gold)', fontSize: '24px', fontWeight: 900 }}>
          {player.name}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
          Aventurier·e des Vosges depuis le {joinDate}
        </p>
        <button
          onClick={() => setEditMode(true)}
          style={{ marginTop: '8px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px 12px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}
        >
          ✏️ Changer de pseudo
        </button>
      </div>

      {/* Total score */}
      <div className="card-vosges" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Score Total</div>
        <div style={{ color: 'var(--rasta-gold)', fontSize: '52px', fontWeight: 900, lineHeight: 1 }}>{totalPoints}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>points sur 20 possibles</div>
        <div style={{ marginTop: '8px', height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(totalPoints / 20) * 100}%`, background: 'linear-gradient(90deg, var(--rasta-green), var(--rasta-gold))', borderRadius: '3px', transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Per game stats */}
      <h2 style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        Progression par jeu
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {GAMES.map((game) => {
          const pts = getPointsForGame(game.id);
          return (
            <div key={game.id} className="card-vosges" style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{game.emoji} {game.title}</div>
                <div style={{ color: game.color, fontWeight: 900 }}>{pts}/5</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1,2,3,4,5].map((l) => {
                  const done = completedLevels.some((c) => c.gameId === game.id && c.level === l);
                  return (
                    <div key={l} style={{
                      flex: 1, height: '6px', borderRadius: '3px',
                      background: done ? game.color : 'var(--bg-dark)',
                    }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed levels count */}
      <div className="card-vosges" style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Niveaux complétés</div>
        <div style={{ color: 'var(--rasta-green-light)', fontSize: '28px', fontWeight: 700 }}>
          {completedLevels.length} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/20</span>
        </div>
      </div>
    </div>
  );
}
