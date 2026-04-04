'use client';

import GameShell from '@/components/GameShell';
import LevelGuard from '@/components/LevelGuard';
import JointGame from '@/lib/games/joint/JointGame';
import type { DifficultyLevel } from '@/lib/types';

export default function JointLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <LevelGuard gameId="joint" level={level}>
      <GameShell gameId="joint" gameTitle="Qui Roule Bamboule" gameEmoji="🌿" level={level}>
        {({ onLevelComplete, onGameOver }) => (
          <JointGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
        )}
      </GameShell>
    </LevelGuard>
  );
}
