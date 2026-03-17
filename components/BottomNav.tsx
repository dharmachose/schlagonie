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
        background: 'rgba(10, 18, 10, 0.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
              padding: '10px 4px 8px',
              textDecoration: 'none',
              color: active ? 'var(--rasta-gold)' : 'var(--text-muted)',
              fontSize: '12px',
              gap: '3px',
              transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
            }}
          >
            {/* Active indicator bar */}
            {active && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: '20%',
                right: '20%',
                height: '2px',
                borderRadius: '0 0 2px 2px',
                background: 'var(--rasta-gold)',
                boxShadow: '0 0 8px rgba(255,215,0,0.7)',
              }} />
            )}
            <span style={{ fontSize: '26px', lineHeight: 1 }}>{item.emoji}</span>
            <span style={{ fontWeight: active ? 700 : 400 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
