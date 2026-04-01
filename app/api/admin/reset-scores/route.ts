import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const SECRET = '1d74324642ae5017799f460ae84a48ed';

export async function POST(req: NextRequest) {
  const { token, player } = await req.json();
  if (token !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: 'no db' }, { status: 500 });

  const sql = neon(url);
  const result = await sql`DELETE FROM scores WHERE player_name = ${player} RETURNING id`;
  return NextResponse.json({ deleted: result.length });
}
