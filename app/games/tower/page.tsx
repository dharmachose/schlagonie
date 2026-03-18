import LevelSelectPage from '@/components/LevelSelectPage';

export default function TowerPage() {
  return (
    <LevelSelectPage
      gameId="tower"
      title="⚔️ Clash of Village"
      description="Aydoilles attaque ! Placez vos tours entre les vagues et défendez le village de La Baffe contre les hordes de baffeurs, sangliers et autres rastas vosgiens."
      color="#8B6914"
      levelEmojis={{ 1: '🌱', 2: '🌿', 3: '🌲', 4: '⚔️', 5: '👑' }}
      levelDetails={{
        1: 'Chemin simple — Baffeurs & Sangliers — 4 vagues',
        2: 'Zigzag — Gros Rastas apparaissent — 5 vagues',
        3: 'Serpentine longue — Ennemis rapides — 5 vagues',
        4: 'Double entrée — Mamies guérisseuses — 6 vagues',
        5: "Triple entrée — Boss d'Aydoilles — 7 vagues",
      }}
    />
  );
}
