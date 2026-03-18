import LevelSelectPage from '@/components/LevelSelectPage';

export default function AlloPage() {
  return (
    <LevelSelectPage
      gameId="allo"
      title="📞 Allo ?!"
      description="Réponds aux clients sans faire de faute. Orthographe, grammaire, chiffres plausibles... Décrochez !"
      color="#4A90D9"
      levelEmojis={{ 1: '📞', 2: '🎧', 3: '💬', 4: '📝', 5: '🏆' }}
      levelDetails={{
        1: 'Stagiaire — prends ton temps',
        2: 'Conseiller — un peu plus vite',
        3: 'Expérimenté — bonne cadence',
        4: 'Expert — les doigts qui volent',
        5: 'Responsable — zéro faute tolérée',
      }}
    />
  );
}
