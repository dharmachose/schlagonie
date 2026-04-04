'use client';

import GameShell from '@/components/GameShell';
import LevelGuard from '@/components/LevelGuard';
import SlotsGame from '@/lib/games/slots/SlotsGame';
import type { DifficultyLevel } from '@/lib/types';

export default function SlotsLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <LevelGuard gameId="slots" level={level}>
      <GameShell gameId="slots" gameTitle="La Roulette Vosgienne" gameEmoji="🎰" level={level}>
        {({ onLevelComplete, onGameOver }) => (
          <SlotsGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
        )}
      </GameShell>
    </LevelGuard>
  );
}
