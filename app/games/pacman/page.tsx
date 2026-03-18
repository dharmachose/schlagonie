import LevelSelectPage from '@/components/LevelSelectPage';

export default function PacmanPage() {
  return (
    <LevelSelectPage
      gameId="pacman"
      title="👑 Shlagonie Fuit !"
      description="La reine Shlagonie fuit les fruits et légumes qui veulent la forcer à manger sainement. Mange tout le Nutella pour leur échapper !"
      color="#DC143C"
      levelEmojis={{ 1: '🥬', 2: '🥕', 3: '🍆', 4: '🥦', 5: '🌶️' }}
      levelDetails={{
        1: '2 légumes lents — ruelles simples',
        2: '3 légumes — ruelles moyennes',
        3: '4 légumes — ruelles étendues',
        4: '4 légumes rapides — ruelles complexes',
        5: '4 légumes déchaînés — ruelles infernales',
      }}
    />
  );
}
