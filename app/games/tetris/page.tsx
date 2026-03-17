import LevelSelectPage from '@/components/LevelSelectPage';

export default function TetrisPage() {
  return (
    <LevelSelectPage
      gameId="tetris"
      title="🪵 Tetris Shlagonie"
      description="Empile bûches, sapins et bédots pour atteindre le score cible avant que la forêt déborde !"
      color="#32CD32"
      levelEmojis={{ 1: '🌱', 2: '🌿', 3: '🪵', 4: '🌲', 5: '🏔️' }}
      levelDetails={{
        1: 'Chute lente — score cible 300',
        2: 'Chute modérée — score cible 600',
        3: 'Rythme forestier — score cible 1000',
        4: 'Tempête de sapins — score cible 1500',
        5: 'Avalanche — score cible 2000',
      }}
    />
  );
}
