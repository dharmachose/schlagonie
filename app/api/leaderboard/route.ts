import { NextRequest, NextResponse } from 'next/server';
import {
  getGlobalLeaderboard,
  getGameLeaderboard,
  getSpeedLeaderboard,
  getPlayerMedals,
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
      if (entries === null) return NextResponse.json({ error: 'no_redis' }, { status: 503 });
      return NextResponse.json(entries);
    }

    if (type === 'game' && gameId) {
      const entries = await getGameLeaderboard(gameId);
      if (entries === null) return NextResponse.json({ error: 'no_redis' }, { status: 503 });
      return NextResponse.json(entries);
    }

    if (type === 'speed' && gameId && level) {
      const entries = await getSpeedLeaderboard(gameId, Number(level) as DifficultyLevel);
      if (entries === null) return NextResponse.json({ error: 'no_redis' }, { status: 503 });
      return NextResponse.json(entries);
    }

    if (type === 'medals') {
      const player = searchParams.get('player');
      if (!player) return NextResponse.json({ error: 'Missing player' }, { status: 400 });
      const medals = await getPlayerMedals(player);
      if (medals === null) return NextResponse.json({ error: 'no_db' }, { status: 503 });
      return NextResponse.json(medals);
    }

    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
