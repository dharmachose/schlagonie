import { NextRequest, NextResponse } from 'next/server';
import { submitScore } from '@/lib/leaderboard';
import type { LevelCompletion } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LevelCompletion;

    if (!body.playerName || !body.gameId || !body.level || body.elapsedMs == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await submitScore(body);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
