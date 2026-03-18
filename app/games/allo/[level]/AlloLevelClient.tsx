'use client';

import GameShell from '@/components/GameShell';
import AlloGame from '@/lib/games/allo/AlloGame';
import type { DifficultyLevel } from '@/lib/types';

export default function AlloLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <GameShell gameId="allo" gameTitle="Allo ?!" gameEmoji="📞" level={level}>
      {({ onLevelComplete, onGameOver }) => (
        <AlloGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
      )}
    </GameShell>
  );
}
