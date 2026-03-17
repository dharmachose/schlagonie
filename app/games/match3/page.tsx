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
        1: 'Grille 6×6 — objectif 500 pts',
        2: 'Grille 7×7 — objectif 1000 pts',
        3: 'Grille 8×8 — objectif 1800 pts',
        4: 'Grille 8×8 + obstacles — objectif 2800 pts',
        5: 'Grille 8×8 + combos requis — objectif 4000 pts',
      }}
    />
  );
}
