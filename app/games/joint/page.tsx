import LevelSelectPage from '@/components/LevelSelectPage';

export default function JointPage() {
  return (
    <LevelSelectPage
      gameId="joint"
      title="🌿 Rouleur des Vosges"
      description="Roule le joint parfait le plus vite possible. Weed, toncart, OCB, lèche, feu !"
      color="#00C851"
      levelEmojis={{ 1: '🌱', 2: '🌿', 3: '🍃', 4: '🔥', 5: '💨' }}
      levelDetails={{
        1: 'Apprenti — prends ton temps',
        2: 'Amateur — un peu plus vite',
        3: 'Habitué — bonne cadence',
        4: 'Expert — les doigts qui volent',
        5: 'Légende — perfection absolue',
      }}
    />
  );
}
