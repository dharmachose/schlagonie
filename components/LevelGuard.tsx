'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import type { GameId, DifficultyLevel } from '@/lib/types';

interface Props {
  gameId: GameId;
  level: DifficultyLevel;
  children: React.ReactNode;
}

export default function LevelGuard({ gameId, level, children }: Props) {
  const { isLevelCompleted } = useStore();
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (level <= 1 || isLevelCompleted(gameId, (level - 1) as DifficultyLevel)) {
      setOk(true);
    } else {
      router.replace(`/games/${gameId}`);
    }
  }, [gameId, level, isLevelCompleted, router]);

  if (!ok) return null;
  return <>{children}</>;
}
