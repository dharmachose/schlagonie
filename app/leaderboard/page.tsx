'use client';

import { useState, useEffect } from 'react';
import { GAMES } from '@/lib/games/config';
import { useStore } from '@/lib/store';
import type { LeaderboardEntry, GameId, DifficultyLevel } from '@/lib/types';

type Tab = 'global' | 'game' | 'speed';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'global', label: 'Global', icon: '🌍' },
  { id: 'game', label: 'Par Jeu', icon: '🎮' },
  { id: 'speed', label: 'Vitesse', icon: '⚡' },
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('global');
  const [gameId, setGameId] = useState<GameId>('memory');
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [noRedis, setNoRedis] = useState(false);
  const { player, completedLevels, totalPoints } = useStore();

  // Build local leaderboard from localStorage when Redis is unavailable
  const localEntries = (): LeaderboardEntry[] => {
    if (!player) return [];
    if (tab === 'global') {
      return [{ rank: 1, playerName: player.name, score: totalPoints }];
    }
    if (tab === 'game') {
      const pts = completedLevels.filter((c) => c.gameId === gameId).length;
      return pts > 0 ? [{ rank: 1, playerName: player.name, score: pts }] : [];
    }
    if (tab === 'speed') {
      const best = completedLevels.find((c) => c.gameId === gameId && c.level === level);
      return best ? [{ rank: 1, playerName: player.name, score: 0, fastestMs: best.bestMs }] : [];
    }
    return [];
  };

  useEffect(() => {
    setLoading(true);
    setNoRedis(false);
    let url = '/api/leaderboard?type=global';
    if (tab === 'game') url = `/api/leaderboard?type=game&gameId=${gameId}`;
    if (tab === 'speed') url = `/api/leaderboard?type=speed&gameId=${gameId}&level=${level}`;

    fetch(url)
      .then((r) => {
        if (r.status === 503) { setNoRedis(true); return []; }
        return r.json();
      })
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

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '14px',
    marginBottom: '10px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '15px',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{ padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{
        color: 'var(--rasta-gold)',
        fontSize: '24px',
        fontWeight: 900,
        marginBottom: '20px',
        letterSpacing: '-0.5px',
      }}>
        🏆 Classements
      </h1>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        background: 'var(--bg-card)',
        padding: '4px',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '10px 6px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              background: tab === t.id
                ? 'linear-gradient(135deg, var(--rasta-green), var(--rasta-gold-dark))'
                : 'transparent',
              color: tab === t.id ? '#0d1a0d' : 'var(--text-muted)',
              fontWeight: tab === t.id ? 700 : 400,
              fontSize: '13px',
              transition: 'all 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>{t.icon}</div>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(tab === 'game' || tab === 'speed') && (
        <div style={{ marginBottom: '16px' }}>
          <select value={gameId} onChange={(e) => setGameId(e.target.value as GameId)} style={selectStyle}>
            {GAMES.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.title}</option>)}
          </select>
          {tab === 'speed' && (
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) as DifficultyLevel)}
              style={selectStyle}
            >
              {[1,2,3,4,5].map((l) => <option key={l} value={l}>Niveau {l}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌲</div>
          <div style={{ fontSize: '15px' }}>Chargement...</div>
        </div>
      ) : noRedis ? (
        (() => {
          const local = localEntries();
          return (
            <div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                marginBottom: '16px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                padding: '8px 12px',
              }}>
                📱 Classement local — tes scores sur cet appareil
              </div>
              {local.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌫️</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Aucun score encore
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '6px' }}>
                    Joue pour apparaître ici !
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {local.map((e) => (
                    <div key={`${e.rank}-${e.playerName}`} className={`lb-entry ${rankStyle(e.rank)}`}>
                      <div style={{ fontSize: '22px', minWidth: '36px', textAlign: 'center', fontWeight: 900 }}>
                        {rankEmoji(e.rank)}
                      </div>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                        {e.playerName}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {tab === 'speed' && e.fastestMs != null ? (
                          <div style={{ color: 'var(--rasta-gold)', fontWeight: 700, fontFamily: 'monospace', fontSize: '15px' }}>
                            ⏱ {formatMs(e.fastestMs)}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--rasta-gold)', fontWeight: 900, fontSize: '18px' }}>
                            {e.score} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>pts</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌫️</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Personne encore...
          </div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            Sois la première reine des Vosges !
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map((e) => (
            <div key={`${e.rank}-${e.playerName}`} className={`lb-entry ${rankStyle(e.rank)}`}>
              <div style={{ fontSize: '22px', minWidth: '36px', textAlign: 'center', fontWeight: 900 }}>
                {rankEmoji(e.rank)}
              </div>
              <div style={{ flex: 1, fontWeight: e.rank <= 3 ? 700 : 400, fontSize: '15px', color: 'var(--text-primary)' }}>
                {e.playerName}
              </div>
              <div style={{ textAlign: 'right' }}>
                {tab === 'speed' && e.fastestMs != null ? (
                  <div style={{
                    color: 'var(--rasta-gold)',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    fontSize: '15px',
                  }}>
                    ⏱ {formatMs(e.fastestMs)}
                  </div>
                ) : (
                  <div style={{ color: 'var(--rasta-gold)', fontWeight: 900, fontSize: '18px' }}>
                    {e.score} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>pts</span>
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
