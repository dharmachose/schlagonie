'use client';

import { useState, useEffect } from 'react';
import { GAMES } from '@/lib/games/config';
import type { LeaderboardEntry, GameId, DifficultyLevel } from '@/lib/types';

type Tab = 'global' | 'game' | 'speed';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('global');
  const [gameId, setGameId] = useState<GameId>('memory');
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    let url = '/api/leaderboard?type=global';
    if (tab === 'game') url = `/api/leaderboard?type=game&gameId=${gameId}`;
    if (tab === 'speed') url = `/api/leaderboard?type=speed&gameId=${gameId}&level=${level}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tab, gameId, level]);

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const rankStyle = (rank: number) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  };

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--rasta-gold)', fontSize: '22px', fontWeight: 900, marginBottom: '16px' }}>
        🏆 Classements
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['global', 'game', 'speed'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: tab === t ? 'var(--rasta-green)' : 'var(--bg-card)',
              color: tab === t ? '#fff' : 'var(--text-muted)',
              fontWeight: tab === t ? 700 : 400, fontSize: '13px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t === 'global' ? '🌍 Global' : t === 'game' ? '🎮 Par Jeu' : '⚡ Vitesse'}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(tab === 'game' || tab === 'speed') && (
        <div style={{ marginBottom: '12px' }}>
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value as GameId)}
            style={{
              width: '100%', padding: '10px', borderRadius: '10px', marginBottom: '8px',
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', fontSize: '14px',
            }}
          >
            {GAMES.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.title}</option>)}
          </select>
          {tab === 'speed' && (
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) as DifficultyLevel)}
              style={{
                width: '100%', padding: '10px', borderRadius: '10px',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', fontSize: '14px',
              }}
            >
              {[1,2,3,4,5].map((l) => <option key={l} value={l}>Niveau {l}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', fontSize: '24px' }}>
          🌲 Chargement...
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🌫️</div>
          <div>Personne encore... Sois la première reine !</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map((e) => (
            <div key={`${e.rank}-${e.playerName}`} className={`lb-entry ${rankStyle(e.rank)}`}>
              <div style={{ fontSize: '20px', minWidth: '32px', textAlign: 'center' }}>
                {rankEmoji(e.rank)}
              </div>
              <div style={{ flex: 1, fontWeight: e.rank <= 3 ? 700 : 400, color: 'var(--text-primary)' }}>
                {e.playerName}
              </div>
              <div style={{ textAlign: 'right' }}>
                {tab === 'speed' && e.fastestMs != null ? (
                  <div style={{ color: 'var(--rasta-gold)', fontWeight: 700, fontFamily: 'monospace' }}>
                    ⏱️ {formatMs(e.fastestMs)}
                  </div>
                ) : (
                  <div style={{ color: 'var(--rasta-gold)', fontWeight: 700 }}>
                    {e.score} pts
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
