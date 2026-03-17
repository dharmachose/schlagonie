import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Schlagonie 🌲',
  description: 'Le royaume rasta des Vosges — mini-jeux by Shlagonie',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0d1a0d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* Page content with bottom nav spacing */}
        <div style={{ paddingBottom: '74px', minHeight: '100dvh' }}>
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
