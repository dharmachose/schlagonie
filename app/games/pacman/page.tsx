import LevelSelectPage from '@/components/LevelSelectPage';

export default function PacmanPage() {
  return (
    <LevelSelectPage
      gameId="pacman"
      title="🏃 Shlagonie Fuit !"
      description="Shlagonie dévale les ruelles d'Aydoilles, fuyant les fantômes vosgiens. Mange tous les points pour gagner !"
      color="#DC143C"
      levelEmojis={{ 1: '🌫️', 2: '👻', 3: '💨', 4: '😱', 5: '💀' }}
      levelDetails={{
        1: '1 fantôme lent — labyrinthe simple',
        2: '2 fantômes — labyrinthe moyen',
        3: '2 fantômes rapides — labyrinthe étendu',
        4: '3 fantômes — labyrinthe complexe',
        5: '4 fantômes déchaînés — labyrinthe max',
      }}
    />
  );
}
