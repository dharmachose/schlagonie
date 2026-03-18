'use client';

import GameShell from '@/components/GameShell';
import PacmanGame from '@/lib/games/pacman/PacmanGame';
import type { DifficultyLevel } from '@/lib/types';

export default function PacmanLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <GameShell gameId="pacman" gameTitle="Shlagonie Fuit !" gameEmoji="👑" level={level}>
      {({ onLevelComplete, onGameOver }) => (
        <PacmanGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
      )}
    </GameShell>
  );
}
