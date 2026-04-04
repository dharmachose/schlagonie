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

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const PODIUM_HEIGHTS = [80, 110, 60]; // [2ème gauche, 1er centre, 3ème droite]
const AVATAR_BG = ['#DC143C', '#228B22', '#DAA520', '#1a6eb5', '#8B4513'];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_BG[h % AVATAR_BG.length];
}

function Podium({ entries, tab, formatMs }: {
  entries: LeaderboardEntry[];
  tab: Tab;
  formatMs: (ms: number) => string;
}) {
  const top3 = [entries[1], entries[0], entries[2]]; // silver, gold, bronze order visually
  const indices = [1, 0, 2]; // map to actual rank positions

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', marginBottom: '28px', padding: '0 8px' }}>
      {top3.map((e, vi) => {
        const rank = indices[vi] + 1;
        if (!e) return <div key={vi} style={{ flex: 1 }} />;
        const h = PODIUM_HEIGHTS[vi];
        const isCenter = vi === 1;
        return (
          <div key={vi} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            {/* Crown for #1 */}
            {isCenter && <div style={{ fontSize: '22px', animation: 'float 2s ease-in-out infinite' }}>👑</div>}
            {/* Avatar */}
            <div style={{
              width: isCenter ? '52px' : '42px',
              height: isCenter ? '52px' : '42px',
              borderRadius: '50%',
              background: avatarColor(e.playerName),
              border: `3px solid ${RANK_COLORS[rank - 1]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900,
              fontSize: isCenter ? '20px' : '16px',
              color: 'white',
              boxShadow: `0 0 12px ${RANK_COLORS[rank - 1]}66`,
              flexShrink: 0,
            }}>
              {e.playerName[0].toUpperCase()}
            </div>
            {/* Name */}
            <div style={{
              fontSize: isCenter ? '12px' : '11px',
              fontWeight: 700,
              color: RANK_COLORS[rank - 1],
              textAlign: 'center',
              maxWidth: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{e.playerName}</div>
            {/* Score */}
            <div style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
              textAlign: 'center',
            }}>
              {tab === 'speed' && e.fastestMs != null ? formatMs(e.fastestMs) : `${e.score} pts`}
            </div>
            {/* Podium block */}
            <div style={{
              width: '100%',
              height: `${h}px`,
              borderRadius: '10px 10px 0 0',
              background: `linear-gradient(180deg, ${RANK_COLORS[rank - 1]}33, ${RANK_COLORS[rank - 1]}11)`,
              border: `1px solid ${RANK_COLORS[rank - 1]}44`,
              borderBottom: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isCenter ? '28px' : '22px',
            }}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EntryRow({ e, tab, formatMs, isMe, maxScore }: {
  e: LeaderboardEntry;
  tab: Tab;
  formatMs: (ms: number) => string;
  isMe: boolean;
  maxScore: number;
}) {
  const pct = maxScore > 0
    ? tab === 'speed' && e.fastestMs != null
      ? Math.max(10, 100 - Math.round((e.fastestMs / maxScore) * 100))
      : Math.round((e.score / maxScore) * 100)
    : 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 14px',
      borderRadius: '14px',
      background: isMe ? 'rgba(255,215,0,0.07)' : 'var(--bg-card)',
      border: isMe ? '1px solid rgba(255,215,0,0.35)' : '1px solid var(--border-color)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* progress bar bg */}
      <div style={{
        position: 'absolute', inset: 0, left: 0,
        width: `${pct}%`,
        background: isMe ? 'rgba(255,215,0,0.06)' : 'rgba(50,205,50,0.04)',
        borderRadius: '14px',
        transition: 'width 0.6s ease',
        pointerEvents: 'none',
      }} />
      {/* Rank */}
      <div style={{
        minWidth: '28px', textAlign: 'center',
        fontSize: '13px', fontWeight: 900,
        color: 'var(--text-muted)',
      }}>
        #{e.rank}
      </div>
      {/* Avatar */}
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%',
        background: avatarColor(e.playerName),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: '14px', color: 'white',
        flexShrink: 0,
      }}>
        {e.playerName[0].toUpperCase()}
      </div>
      {/* Name */}
      <div style={{ flex: 1, fontWeight: isMe ? 700 : 400, fontSize: '15px', color: 'var(--text-primary)' }}>
        {e.playerName}
        {isMe && <span style={{ fontSize: '10px', color: 'var(--rasta-gold)', marginLeft: '6px', fontWeight: 700 }}>toi</span>}
      </div>
      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {tab === 'speed' && e.fastestMs != null ? (
          <div style={{ color: 'var(--rasta-gold)', fontWeight: 700, fontFamily: 'monospace', fontSize: '14px' }}>
            ⏱ {formatMs(e.fastestMs)}
          </div>
        ) : (
          <div style={{ color: isMe ? 'var(--rasta-gold)' : 'var(--text-secondary)', fontWeight: 900, fontSize: '16px' }}>
            {e.score} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>pts</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('global');
  const [gameId, setGameId] = useState<GameId>('memory');
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [noRedis, setNoRedis] = useState(false);
  const { player, completedLevels, totalPoints } = useStore();

  const localEntries = (): LeaderboardEntry[] => {
    if (!player) return [];
    if (tab === 'global') return [{ rank: 1, playerName: player.name, score: totalPoints }];
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
      .then((r) => { if (r.status === 503) { setNoRedis(true); return []; } return r.json(); })
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tab, gameId, level]);

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const displayEntries = noRedis ? localEntries() : entries;
  const top3 = displayEntries.slice(0, 3);
  const rest = displayEntries.slice(3);
  const myRank = player ? displayEntries.find((e) => e.playerName === player.name)?.rank : undefined;
  const maxScore = tab === 'speed'
    ? Math.max(...displayEntries.map((e) => e.fastestMs ?? 0), 1)
    : Math.max(...displayEntries.map((e) => e.score), 1);

  return (
    <div style={{ padding: '20px 16px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ color: 'var(--rasta-gold)', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>
          🏆 Classements
        </h1>
        {myRank && (
          <div style={{
            background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '20px', padding: '4px 12px',
            fontSize: '12px', color: 'var(--rasta-gold)', fontWeight: 700,
          }}>
            Ton rang : #{myRank}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '16px',
        background: 'var(--bg-card)', padding: '4px', borderRadius: '16px',
        border: '1px solid var(--border-color)',
      }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 6px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: tab === t.id ? 'linear-gradient(135deg, var(--rasta-green), var(--rasta-gold-dark))' : 'transparent',
            color: tab === t.id ? '#0d1a0d' : 'var(--text-muted)',
            fontWeight: tab === t.id ? 700 : 400, fontSize: '13px',
            transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
          }}>
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>{t.icon}</div>
            {t.label}
          </button>
        ))}
      </div>

      {/* Game chips */}
      {(tab === 'game' || tab === 'speed') && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {GAMES.map((g) => (
              <button key={g.id} onClick={() => setGameId(g.id as GameId)} style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                background: gameId === g.id ? 'linear-gradient(135deg, var(--rasta-green), var(--rasta-gold-dark))' : 'var(--bg-card)',
                color: gameId === g.id ? '#0d1a0d' : 'var(--text-muted)',
                fontWeight: gameId === g.id ? 700 : 400, fontSize: '13px',
                border: gameId === g.id ? 'none' : '1px solid var(--border-color)',
                WebkitTapHighlightColor: 'transparent',
                whiteSpace: 'nowrap',
              }}>
                {g.emoji} {g.title}
              </button>
            ))}
          </div>
          {/* Level chips for speed */}
          {tab === 'speed' && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {[1,2,3,4,5].map((l) => (
                <button key={l} onClick={() => setLevel(l as DifficultyLevel)} style={{
                  flex: 1, padding: '6px 4px', borderRadius: '10px', cursor: 'pointer',
                  background: level === l ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)',
                  color: level === l ? 'var(--rasta-gold)' : 'var(--text-muted)',
                  fontWeight: level === l ? 700 : 400, fontSize: '13px',
                  border: level === l ? '1px solid rgba(255,215,0,0.4)' : '1px solid var(--border-color)',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  Niv.{l}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No Redis banner */}
      {noRedis && (
        <div style={{
          fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center',
          marginBottom: '16px', background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px', padding: '6px 12px',
        }}>
          📱 Scores locaux — cet appareil uniquement
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'float 1.5s ease-in-out infinite' }}>🌲</div>
          <div style={{ fontSize: '15px' }}>Chargement...</div>
        </div>
      ) : displayEntries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌫️</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>Personne encore...</div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>Sois la première reine des Vosges !</div>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          {top3.length >= 2 && (
            <Podium entries={displayEntries} tab={tab} formatMs={formatMs} />
          )}

          {/* Top 3 simple rows if only 1 entry or podium shown */}
          {top3.length < 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: rest.length > 0 ? '16px' : 0 }}>
              {top3.map((e) => (
                <EntryRow key={`${e.rank}-${e.playerName}`} e={e} tab={tab} formatMs={formatMs}
                  isMe={player?.name === e.playerName} maxScore={maxScore} />
              ))}
            </div>
          )}

          {/* Separator */}
          {top3.length >= 2 && rest.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SUITE</div>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>
          )}

          {/* Rest of entries */}
          {rest.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rest.map((e) => (
                <EntryRow key={`${e.rank}-${e.playerName}`} e={e} tab={tab} formatMs={formatMs}
                  isMe={player?.name === e.playerName} maxScore={maxScore} />
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
