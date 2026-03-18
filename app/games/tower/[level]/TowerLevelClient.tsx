'use client';

import GameShell from '@/components/GameShell';
import TowerGame from '@/lib/games/tower/TowerGame';
import type { DifficultyLevel } from '@/lib/types';

export default function TowerLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <GameShell gameId="tower" gameTitle="Clash of Village" gameEmoji="⚔️" level={level}>
      {({ onLevelComplete, onGameOver }) => (
        <TowerGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
      )}
    </GameShell>
  );
}
