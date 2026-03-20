'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ── Icônes SVG ────────────────────────────────────────────────────────────
function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'none' : 'none'} stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V10.5z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M9 21V13h6v8" />
    </svg>
  );
}

function IconGames({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="13" rx="3" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
      <path d="M7 11v4M5 13h4" />
      <circle cx="15.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <path d="M8.5 7V5.5a3.5 3.5 0 017 0V7" />
    </svg>
  );
}

function IconLeaderboard({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4H3.5a1 1 0 00-1 1v3a4 4 0 004 4H7M18 4h2.5a1 1 0 011 1v3a4 4 0 01-4 4H17" />
      <path d="M6 4h12v9a6 6 0 01-12 0V4z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
      <path d="M9 21h6M12 17v4" />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M4 20a8 8 0 0116 0" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/',            label: 'Accueil',    icon: IconHome        },
  { href: '/games',       label: 'Jeux',       icon: IconGames       },
  { href: '/leaderboard', label: 'Classement', icon: IconLeaderboard },
  { href: '/profile',     label: 'Profil',     icon: IconProfile     },
];

function isGameRoute(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 3 && parts[0] === 'games';
}

function isActive(href: string, pathname: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function BottomNav() {
  const pathname = usePathname();

  // Caché pendant le jeu
  if (isGameRoute(pathname)) return null;

  const activeIndex = NAV_ITEMS.findIndex(item => isActive(item.href, pathname));

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 18, 10, 0.97)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
        height: '62px',
      }}
    >
      {/* Pill glissante animée */}
      {activeIndex >= 0 && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '6px',
            left: `calc(${activeIndex} * 25%)`,
            width: '25%',
            height: 'calc(100% - 12px - env(safe-area-inset-bottom))',
            padding: '0 10px',
            pointerEvents: 'none',
            transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 0,
          }}
        >
          <div style={{
            width: '100%',
            height: '100%',
            background: 'rgba(255,215,0,0.10)',
            border: '1px solid rgba(255,215,0,0.20)',
            borderRadius: '14px',
          }} />
        </div>
      )}

      {NAV_ITEMS.map((item, i) => {
        const active = isActive(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '8px 4px 6px',
              textDecoration: 'none',
              color: active ? 'var(--rasta-gold)' : 'var(--text-muted)',
              fontSize: '10px',
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.2px',
              transition: 'color 0.2s',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Icon active={active} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
