'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Accueil', emoji: '🏠' },
  { href: '/games', label: 'Jeux', emoji: '🎮' },
  { href: '/leaderboard', label: 'Classement', emoji: '🏆' },
  { href: '/profile', label: 'Profil', emoji: '🌿' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--hud-bg)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 4px',
              textDecoration: 'none',
              color: active ? 'var(--rasta-gold)' : 'var(--text-muted)',
              fontSize: '10px',
              gap: '2px',
              transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{item.emoji}</span>
            <span style={{ fontWeight: active ? 700 : 400 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
