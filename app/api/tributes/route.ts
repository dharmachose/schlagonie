import { NextRequest, NextResponse } from 'next/server';
import { submitTribute } from '@/lib/leaderboard';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerId, playerName, questionId, question, answer, answeredAt } = body;

  if (!playerId || !playerName || !questionId || !question || !answer) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const ok = await submitTribute({
    playerId,
    playerName,
    questionId,
    question,
    answer,
    answeredAt: answeredAt ?? Date.now(),
  });

  if (!ok) {
    return NextResponse.json({ error: 'no_db' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
