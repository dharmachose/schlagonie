'use client';

import GameShell from '@/components/GameShell';
import JointGame from '@/lib/games/joint/JointGame';
import type { DifficultyLevel } from '@/lib/types';

export default function JointLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <GameShell gameId="joint" gameTitle="Rouleur des Vosges" gameEmoji="🌿" level={level}>
      {({ onLevelComplete, onGameOver }) => (
        <JointGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
      )}
    </GameShell>
  );
}
