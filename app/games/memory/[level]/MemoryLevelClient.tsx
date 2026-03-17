'use client';

import GameShell from '@/components/GameShell';
import MemoryGame from '@/lib/games/memory/MemoryGame';
import type { DifficultyLevel } from '@/lib/types';

export default function MemoryLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <GameShell gameId="memory" gameTitle="Mémoire des Vosges" gameEmoji="🌲" level={level}>
      {({ onLevelComplete, onGameOver }) => (
        <MemoryGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
      )}
    </GameShell>
  );
}
