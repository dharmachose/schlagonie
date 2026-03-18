import LevelSelectPage from '@/components/LevelSelectPage';

export default function TowerPage() {
  return (
    <LevelSelectPage
      gameId="tower"
      title="🏰 Défense de La Baffe"
      description="Aydoilles attaque ! Placez vos tours, améliorez-les, vendez-les entre les vagues et défendez la Mairie de La Baffe contre les hordes d'aydoillards, sangliers et hippies."
      color="#8B6914"
      levelEmojis={{ 1: '🌱', 2: '🌿', 3: '🌲', 4: '⚔️', 5: '👑' }}
      levelDetails={{
        1: 'Chemin en L — Aydoillards & Sangliers — 4 vagues',
        2: 'Zigzag — Hippies tanky apparaissent — 5 vagues',
        3: 'Longue serpentine — Ennemis rapides — 5 vagues',
        4: 'Double entrée — Mamies guérisseuses — 6 vagues',
        5: 'Double entrée — Chef d\'Aydoilles (BOSS) — 7 vagues',
      }}
    />
  );
}
