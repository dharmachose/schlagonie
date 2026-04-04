'use client';

import GameShell from '@/components/GameShell';
import LevelGuard from '@/components/LevelGuard';
import Match3Game from '@/lib/games/match3/Match3Game';
import type { DifficultyLevel } from '@/lib/types';

export default function Match3LevelClient({ level }: { level: DifficultyLevel }) {
  return (
    <LevelGuard gameId="match3" level={level}>
      <GameShell gameId="match3" gameTitle="Crush des Vosges" gameEmoji="👋" level={level}>
        {({ onLevelComplete, onGameOver }) => (
          <Match3Game level={level} onLevelComplete={onLevelComplete} onGameOver={onGameOver} />
        )}
      </GameShell>
    </LevelGuard>
  );
}
