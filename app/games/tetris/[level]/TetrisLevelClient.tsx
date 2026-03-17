'use client';

import GameShell from '@/components/GameShell';
import TetrisGame from '@/lib/games/tetris/TetrisGame';
import type { DifficultyLevel } from '@/lib/types';

export default function TetrisLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <GameShell gameId="tetris" gameTitle="Tetris Shlagonie" gameEmoji="🪵" level={level}>
      {({ onLevelComplete, onGameOver }) => (
        <TetrisGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
      )}
    </GameShell>
  );
}
