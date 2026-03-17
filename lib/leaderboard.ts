import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { GameId, DifficultyLevel, LeaderboardEntry, LevelCompletion } from './types';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureTable(sql: NeonQueryFunction<any, any>) {
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      id           SERIAL  PRIMARY KEY,
      player_name  TEXT    NOT NULL,
      game_id      TEXT    NOT NULL,
      level        INTEGER NOT NULL,
      elapsed_ms   INTEGER NOT NULL,
      completed_at BIGINT  NOT NULL
    )
  `;
}

const TOP_N = 20;

export async function submitScore(completion: LevelCompletion): Promise<boolean> {
  const sql = getSql();
  if (!sql) {
    console.error('[leaderboard] DATABASE_URL not configured — score not saved');
    return false;
  }
  try {
    await ensureTable(sql);
    const { playerName, gameId, level, elapsedMs, completedAt } = completion;
    await sql`
      INSERT INTO scores (player_name, game_id, level, elapsed_ms, completed_at)
      VALUES (${playerName}, ${gameId}, ${level}, ${elapsedMs}, ${completedAt})
    `;
    return true;
  } catch (err) {
    console.error('[leaderboard] submitScore error', err);
    return false;
  }
}

export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[] | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureTable(sql);
    const rows = await sql`
      SELECT player_name, COUNT(*)::int AS score
      FROM scores
      GROUP BY player_name
      ORDER BY score DESC
      LIMIT ${TOP_N}
    `;
    return rows.map((r, i) => ({
      rank: i + 1,
      playerName: r.player_name as string,
      score: r.score as number,
    }));
  } catch (err) {
    console.error('[leaderboard] getGlobalLeaderboard error', err);
    return null;
  }
}

export async function getGameLeaderboard(gameId: GameId): Promise<LeaderboardEntry[] | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureTable(sql);
    const rows = await sql`
      SELECT player_name, COUNT(*)::int AS score
      FROM scores
      WHERE game_id = ${gameId}
      GROUP BY player_name
      ORDER BY score DESC
      LIMIT ${TOP_N}
    `;
    return rows.map((r, i) => ({
      rank: i + 1,
      playerName: r.player_name as string,
      score: r.score as number,
    }));
  } catch (err) {
    console.error('[leaderboard] getGameLeaderboard error', err);
    return null;
  }
}

export async function getSpeedLeaderboard(
  gameId: GameId,
  level: DifficultyLevel
): Promise<LeaderboardEntry[] | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureTable(sql);
    const rows = await sql`
      SELECT player_name, MIN(elapsed_ms)::int AS fastest_ms
      FROM scores
      WHERE game_id = ${gameId} AND level = ${level}
      GROUP BY player_name
      ORDER BY fastest_ms ASC
      LIMIT ${TOP_N}
    `;
    return rows.map((r, i) => ({
      rank: i + 1,
      playerName: r.player_name as string,
      score: 0,
      fastestMs: r.fastest_ms as number,
    }));
  } catch (err) {
    console.error('[leaderboard] getSpeedLeaderboard error', err);
    return null;
  }
}
