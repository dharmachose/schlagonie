'use client';

import GameShell from '@/components/GameShell';
import LevelGuard from '@/components/LevelGuard';
import AlloGame from '@/lib/games/allo/AlloGame';
import type { DifficultyLevel } from '@/lib/types';

export default function AlloLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <LevelGuard gameId="allo" level={level}>
      <GameShell gameId="allo" gameTitle="Allo ?!" gameEmoji="📞" level={level}>
        {({ onLevelComplete, onGameOver }) => (
          <AlloGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
        )}
      </GameShell>
    </LevelGuard>
  );
}
