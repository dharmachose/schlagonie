import LevelSelectPage from '@/components/LevelSelectPage';

export default function Match3Page() {
  return (
    <LevelSelectPage
      gameId="match3"
      title="👋 Crush des Vosges"
      description="Aligne baffes, sapins et bédots pour scorer ! Atteins l'objectif avant que Shlagonie ne s'énerve 😤"
      color="#FFD700"
      levelEmojis={{ 1: '🌱', 2: '👋', 3: '🌲', 4: '⚡', 5: '🔥' }}
      levelDetails={{
        1: 'Grille 6×6 — objectif 300 pts',
        2: 'Grille 7×7 — objectif 600 pts',
        3: 'Grille 8×8 — objectif 1000 pts',
        4: 'Grille 8×8 — objectif 1500 pts',
        5: 'Grille 9×9 — objectif 2500 pts',
      }}
    />
  );
}
