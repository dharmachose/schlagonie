import { NextRequest, NextResponse } from 'next/server';
import {
  getGlobalLeaderboard,
  getGameLeaderboard,
  getSpeedLeaderboard,
} from '@/lib/leaderboard';
import type { GameId, DifficultyLevel } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type') ?? 'global';
  const gameId = searchParams.get('gameId') as GameId | null;
  const level = searchParams.get('level');

  try {
    if (type === 'global') {
      const entries = await getGlobalLeaderboard();
      return NextResponse.json(entries);
    }

    if (type === 'game' && gameId) {
      const entries = await getGameLeaderboard(gameId);
      return NextResponse.json(entries);
    }

    if (type === 'speed' && gameId && level) {
      const entries = await getSpeedLeaderboard(gameId, Number(level) as DifficultyLevel);
      return NextResponse.json(entries);
    }

    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
