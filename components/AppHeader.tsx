'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { GAMES } from '@/lib/games/config';
import { useState, useEffect } from 'react';

/** Détecte si on est en train de jouer (/games/[id]/[level]) */
function isGameRoute(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 3 && parts[0] === 'games';
}

/** Config du header selon la route */
function resolveHeader(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);

  if (pathname === '/games') {
    return { title: 'Jeux', emoji: '🎮', back: null };
  }
  if (pathname === '/leaderboard') {
    return { title: 'Classement', emoji: '🏆', back: null };
  }
  if (pathname === '/profile') {
    return { title: 'Profil', emoji: '🌿', back: null };
  }
  if (pathname === '/livre-dor') {
    return { title: 'Livre d\'Or', emoji: '📖', back: null };
  }
  // /games/[id] — sélection du niveau
  if (parts.length === 2 && parts[0] === 'games') {
    const game = GAMES.find(g => g.id === parts[1]);
    return {
      title: game?.title ?? 'Jeu',
      emoji: game?.emoji ?? '🎮',
      back: { href: '/games', label: 'Jeux' },
    };
  }
  return { title: 'Schlagonie', emoji: '🌲', back: null };
}

export default function AppHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { player, totalPoints } = useStore();

  useEffect(() => setMounted(true), []);

  // Caché en jeu
  if (isGameRoute(pathname)) return null;

  const { title, emoji, back } = resolveHeader(pathname);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        zIndex: 40,
        background: 'rgba(10, 18, 10, 0.97)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        paddingInline: back ? '8px' : '16px',
        gap: '4px',
      }}
    >
      {/* Bouton retour */}
      {back && (
        <Link
          href={back.href}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            color: 'var(--rasta-green-light)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
            padding: '6px 10px',
            borderRadius: '10px',
            WebkitTapHighlightColor: 'transparent',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {back.label}
        </Link>
      )}

      {/* Séparateur breadcrumb */}
      {back && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--border-active)" strokeWidth={2} strokeLinecap="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}

      {/* Titre */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
        <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
        <span style={{
          fontWeight: 800,
          fontSize: '16px',
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
      </div>

      {/* Pill joueur */}
      {mounted && player && (
        <Link
          href="/profile"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,215,0,0.08)',
            border: '1px solid rgba(255,215,0,0.22)',
            borderRadius: '20px',
            padding: '4px 10px 4px 6px',
            textDecoration: 'none',
            flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Avatar */}
          <div style={{
            width: '24px', height: '24px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--rasta-green), var(--rasta-gold-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 900, color: '#0d1a0d',
            flexShrink: 0,
          }}>
            {player.name[0].toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', lineHeight: 1 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', maxWidth: '72px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.name}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--rasta-gold-dark)', fontWeight: 600 }}>
              {totalPoints} pts
            </span>
          </div>
        </Link>
      )}
    </header>
  );
}
