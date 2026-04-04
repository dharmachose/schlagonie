'use client';

import GameShell from '@/components/GameShell';
import LevelGuard from '@/components/LevelGuard';
import TetrisGame from '@/lib/games/tetris/TetrisGame';
import type { DifficultyLevel } from '@/lib/types';

export default function TetrisLevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <LevelGuard gameId="tetris" level={level}>
      <GameShell gameId="tetris" gameTitle="Tetris Shlagonie" gameEmoji="🪵" level={level}>
        {({ onLevelComplete, onGameOver }) => (
          <TetrisGame level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
        )}
      </GameShell>
    </LevelGuard>
  );
}
