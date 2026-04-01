'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { GAMES } from '@/lib/games/config';
import PlayerSetup from '@/components/PlayerSetup';
import type { PlayerMedal } from '@/lib/leaderboard';

// ── Titre dynamique selon le score ────────────────────────────────────────────
function getTitle(pts: number): { label: string; emoji: string } {
  if (pts === 0)  return { label: 'Novice des Vosges',    emoji: '🌱' };
  if (pts < 5)   return { label: 'Randonneur·se',         emoji: '🥾' };
  if (pts < 12)  return { label: 'Montagnard·e',          emoji: '⛰️' };
  if (pts < 22)  return { label: 'Gardien·ne des Forêts', emoji: '🌲' };
  if (pts < 32)  return { label: 'Légende des Vosges',    emoji: '🔥' };
  return           { label: 'Maire de La Baffe',           emoji: '👑' };
}

// ── Badges ────────────────────────────────────────────────────────────────────
function getBadges(
  completedLevels: { gameId: string; level: number; bestMs: number }[],
  totalPoints: number,
) {
  const count = completedLevels.length;
  const gamesDone = new Set(completedLevels.map((c) => c.gameId)).size;
  const bestMs = completedLevels.map((c) => c.bestMs);
  const hasSub30 = bestMs.some((ms) => ms < 30_000);
  const hasSub15 = bestMs.some((ms) => ms < 15_000);
  const totalMs = bestMs.reduce((s, ms) => s + ms, 0);
  const allGames = new Set(completedLevels.map((c) => c.gameId)).size === GAMES.length;

  return [
    {
      id: 'first',    icon: '🌱', label: 'Première Feuille',   desc: 'Terminer son premier niveau',
      unlocked: count >= 1,
    },
    {
      id: 'five',     icon: '🥾', label: 'Randonneur·se',       desc: '5 niveaux complétés',
      unlocked: count >= 5,
    },
    {
      id: 'fifteen',  icon: '🌲', label: 'Vosgien·ne',          desc: '15 niveaux complétés',
      unlocked: count >= 15,
    },
    {
      id: 'allgames', icon: '🎮', label: 'Touche-à-Tout',       desc: 'Jouer à tous les jeux',
      unlocked: allGames,
    },
    {
      id: 'flash',    icon: '⚡', label: 'Éclair',              desc: 'Finir un niveau en moins de 30s',
      unlocked: hasSub30,
    },
    {
      id: 'ultra',    icon: '🚀', label: 'Fusée',               desc: 'Finir un niveau en moins de 15s',
      unlocked: hasSub15,
    },
    {
      id: 'marathon', icon: '⏱️', label: 'Marathonien·ne',      desc: '10 minutes de jeu cumulées',
      unlocked: totalMs >= 600_000,
    },
    {
      id: 'master',   icon: '👑', label: 'Maire de La Baffe',    desc: 'Tous les niveaux complétés',
      unlocked: totalPoints >= GAMES.length * 5,
    },
  ];
}

// ── Formatage du temps ────────────────────────────────────────────────────────
function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function fmtLong(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m < 1) return `${s}s`;
  return `${m}min ${s % 60}s`;
}

// ── Avatar grand format ───────────────────────────────────────────────────────
const AVATAR_COLORS = ['#DC143C', '#228B22', '#DAA520', '#1a6eb5', '#8B2252'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { player, totalPoints, getPointsForGame, completedLevels, setPlayer } = useStore();
  const [mounted, setMounted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [medals, setMedals] = useState<PlayerMedal[] | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!player) return;
    fetch(`/api/leaderboard?type=medals&player=${encodeURIComponent(player.name)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setMedals(Array.isArray(data) ? data : null))
      .catch(() => setMedals(null));
  }, [player]);

  if (!mounted) return null;
  if (!player || editMode) return <PlayerSetup onDone={() => setEditMode(false)} />;

  const title = getTitle(totalPoints);
  const totalLevels = GAMES.length * 5;
  const completionPct = Math.round((completedLevels.length / totalLevels) * 100);
  const badges = getBadges(
    completedLevels.map((c) => ({ gameId: c.gameId, level: c.level, bestMs: c.bestMs ?? 0 })),
    totalPoints,
  );
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  // Stats
  const totalMs = completedLevels.reduce((s, c) => s + (c.bestMs ?? 0), 0);
  const bestEntry = completedLevels.length > 0
    ? completedLevels.reduce((best, c) => (!best || (c.bestMs ?? 0) < (best.bestMs ?? 0)) ? c : best)
    : null;
  const favGame = GAMES.map((g) => ({ g, pts: getPointsForGame(g.id) }))
    .sort((a, b) => b.pts - a.pts)[0];

  const joinDate = new Date(player.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const color = avatarColor(player.name);

  return (
    <div style={{ padding: '20px 16px 24px', maxWidth: '480px', margin: '0 auto' }}>

      {/* ── Carte joueur ─────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '24px 20px',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Fond décoratif */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 140, height: 140, borderRadius: '50%',
          background: `${color}15`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `linear-gradient(135deg, ${color}, ${color}bb)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '30px', fontWeight: 900, color: 'white',
            flexShrink: 0,
            boxShadow: `0 0 20px ${color}55`,
            border: '3px solid rgba(255,255,255,0.1)',
          }}>
            {player.name[0].toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--rasta-gold)', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '14px' }}>{title.emoji}</span>
              <span style={{ fontSize: '13px', color: 'var(--rasta-green-light)', fontWeight: 600 }}>{title.label}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Depuis le {joinDate}
            </div>
          </div>

          <button
            onClick={() => setEditMode(true)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
              borderRadius: '10px', padding: '6px 10px', color: 'var(--text-muted)',
              fontSize: '18px', cursor: 'pointer', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >✏️</button>
        </div>

        {/* Barre de progression globale */}
        <div style={{ marginTop: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Progression</span>
            <span style={{ fontSize: '13px', color: 'var(--rasta-gold)', fontWeight: 900 }}>
              {completedLevels.length}<span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '11px' }}>/{totalLevels}</span>
              <span style={{ marginLeft: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>({completionPct}%)</span>
            </span>
          </div>
          <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${completionPct}%`,
              background: 'linear-gradient(90deg, #228B22, #FFD700)',
              borderRadius: '4px', transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      </div>

      {/* ── Stats 2×2 ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Score total', value: `${totalPoints} pts`, icon: '🏆', color: '#FFD700' },
          { label: 'Temps de jeu', value: totalMs > 0 ? fmtLong(totalMs) : '—', icon: '⏱️', color: '#32CD32' },
          { label: 'Meilleur chrono', value: bestEntry ? fmt(bestEntry.bestMs ?? 0) : '—', icon: '⚡', color: '#DC143C' },
          { label: 'Jeu favori', value: favGame.pts > 0 ? favGame.g.emoji : '—', icon: '🎮', color: '#DAA520' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '16px', padding: '14px 16px',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              {s.icon} {s.label}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: s.color }}>
              {s.value}
            </div>
            {s.label === 'Jeu favori' && favGame.pts > 0 && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {favGame.g.title}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Badges ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="section-label">Succès</div>
          <div style={{ fontSize: '12px', color: 'var(--rasta-gold)', fontWeight: 700 }}>
            {unlockedCount}/{badges.length}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {badges.map((b) => (
            <div key={b.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
              padding: '12px 6px',
              background: b.unlocked ? 'rgba(255,215,0,0.07)' : 'var(--bg-card)',
              border: b.unlocked ? '1px solid rgba(255,215,0,0.35)' : '1px solid var(--border-color)',
              borderRadius: '14px',
              opacity: b.unlocked ? 1 : 0.45,
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: '24px', lineHeight: 1, filter: b.unlocked ? 'none' : 'grayscale(1)' }}>
                {b.icon}
              </div>
              <div style={{
                fontSize: '9px', fontWeight: 700,
                color: b.unlocked ? 'var(--rasta-gold)' : 'var(--text-muted)',
                textAlign: 'center', lineHeight: 1.3,
              }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Médailles classement ──────────────────────────────────── */}
      <div>
        <div className="section-label" style={{ marginBottom: '12px' }}>Médailles</div>

        {/* Compteur */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
          marginBottom: medals && medals.length > 0 ? '12px' : 0,
        }}>
          {([
            { rank: 1, emoji: '🥇', label: 'Or',      color: '#FFD700' },
            { rank: 2, emoji: '🥈', label: 'Argent',  color: '#C0C0C0' },
            { rank: 3, emoji: '🥉', label: 'Bronze',  color: '#CD7F32' },
          ] as const).map(({ rank, emoji, label, color }) => {
            const count = medals ? medals.filter((m) => m.rank === rank).length : null;
            return (
              <div key={rank} style={{
                background: count ? `${color}12` : 'var(--bg-card)',
                border: `1px solid ${count ? color + '44' : 'var(--border-color)'}`,
                borderRadius: '16px', padding: '14px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              }}>
                <div style={{ fontSize: '28px', lineHeight: 1 }}>{emoji}</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: count ? color : 'var(--text-muted)', lineHeight: 1 }}>
                  {medals === null ? '…' : count}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Détail des médailles */}
        {medals && medals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {medals.map((m) => {
              const game = GAMES.find((g) => g.id === m.gameId);
              const medalEmoji = m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : '🥉';
              return (
                <div key={`${m.gameId}-${m.level}`} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  borderRadius: '12px', padding: '10px 14px',
                }}>
                  <div style={{ fontSize: '18px', minWidth: '24px', textAlign: 'center' }}>{medalEmoji}</div>
                  <div style={{ fontSize: '18px' }}>{game?.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {game?.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Niveau {m.level}</div>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '15px', color: 'var(--rasta-gold)' }}>
                    {fmt(m.fastestMs)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {medals !== null && medals.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
            Pas encore de médaille — grimpe sur le podium ! 🏆
          </div>
        )}
      </div>

      {/* ── Réinitialisation ─────────────────────────────────────────── */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            style={{
              background: 'none', border: 'none',
              fontSize: '11px', color: 'var(--text-muted)',
              cursor: 'pointer', opacity: 0.5,
              WebkitTapHighlightColor: 'transparent',
              padding: '4px 8px',
            }}
          >Réinitialiser ma progression</button>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(220,20,60,0.3)',
            borderRadius: '14px', padding: '16px',
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px', fontWeight: 600 }}>
              Effacer toute ta progression locale ?
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Niveaux complétés, points et succès seront perdus.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmReset(false)}
                style={{
                  padding: '8px 18px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >Annuler</button>
              <button
                onClick={() => {
                  localStorage.removeItem('shlagonie-store');
                  window.location.reload();
                }}
                style={{
                  padding: '8px 18px', borderRadius: '10px',
                  background: 'rgba(220,20,60,0.15)', border: '1px solid rgba(220,20,60,0.4)',
                  color: '#DC143C', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >Oui, tout effacer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
