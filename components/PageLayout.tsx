'use client';

import { usePathname } from 'next/navigation';

function isGameRoute(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 3 && parts[0] === 'games';
}

export default function PageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inGame = isGameRoute(pathname);

  if (inGame) {
    // Plein écran : pas de padding (header et nav sont cachés)
    return <>{children}</>;
  }

  return (
    <div style={{
      paddingTop: '56px',      // hauteur de l'AppHeader fixe
      paddingBottom: '62px',   // hauteur de la BottomNav fixe
      minHeight: '100dvh',
    }}>
      {children}
    </div>
  );
}
