import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppHeader  from '@/components/AppHeader';
import BottomNav  from '@/components/BottomNav';
import PageLayout from '@/components/PageLayout';

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
        <AppHeader />
        <PageLayout>{children}</PageLayout>
        <BottomNav />
      </body>
    </html>
  );
}
