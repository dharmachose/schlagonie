import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { GameId, DifficultyLevel, LeaderboardEntry, LevelCompletion } from './types';

export interface TributeSubmission {
  playerId: string;
  playerName: string;
  questionId: string;
  question: string;
  answer: string;
  answeredAt: number;
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureTributesTable(sql: NeonQueryFunction<any, any>) {
  await sql`
    CREATE TABLE IF NOT EXISTS tributes (
      id           SERIAL PRIMARY KEY,
      player_id    TEXT   NOT NULL,
      player_name  TEXT   NOT NULL,
      question_id  TEXT   NOT NULL,
      question     TEXT   NOT NULL,
      answer       TEXT   NOT NULL,
      answered_at  BIGINT NOT NULL
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

export async function submitTribute(tribute: TributeSubmission): Promise<boolean> {
  const sql = getSql();
  if (!sql) {
    console.error('[leaderboard] DATABASE_URL not configured — tribute not saved');
    return false;
  }
  try {
    await ensureTributesTable(sql);
    const { playerId, playerName, questionId, question, answer, answeredAt } = tribute;
    await sql`
      INSERT INTO tributes (player_id, player_name, question_id, question, answer, answered_at)
      VALUES (${playerId}, ${playerName}, ${questionId}, ${question}, ${answer}, ${answeredAt})
    `;
    return true;
  } catch (err) {
    console.error('[leaderboard] submitTribute error', err);
    return false;
  }
}

export interface TributeRow {
  id: number;
  playerId: string;
  playerName: string;
  questionId: string;
  question: string;
  answer: string;
  answeredAt: number;
}

export async function getAllTributes(): Promise<TributeRow[] | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureTributesTable(sql);
    const rows = await sql`
      SELECT id, player_id, player_name, question_id, question, answer, answered_at
      FROM tributes
      ORDER BY answered_at ASC
    `;
    return rows.map((r) => ({
      id: r.id as number,
      playerId: r.player_id as string,
      playerName: r.player_name as string,
      questionId: r.question_id as string,
      question: r.question as string,
      answer: r.answer as string,
      answeredAt: r.answered_at as number,
    }));
  } catch (err) {
    console.error('[leaderboard] getAllTributes error', err);
    return null;
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

export interface PlayerMedal {
  gameId: GameId;
  level: DifficultyLevel;
  rank: 1 | 2 | 3;
  fastestMs: number;
}

export async function getPlayerMedals(playerName: string): Promise<PlayerMedal[] | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureTable(sql);
    const rows = await sql`
      WITH ranked AS (
        SELECT
          player_name,
          game_id,
          level,
          MIN(elapsed_ms)::int AS fastest_ms,
          RANK() OVER (PARTITION BY game_id, level ORDER BY MIN(elapsed_ms)) AS rnk
        FROM scores
        GROUP BY player_name, game_id, level
      )
      SELECT game_id, level::int AS level, rnk::int AS rank, fastest_ms
      FROM ranked
      WHERE player_name = ${playerName} AND rnk <= 3
      ORDER BY rnk, game_id, level
    `;
    return rows.map((r) => ({
      gameId: r.game_id as GameId,
      level: r.level as DifficultyLevel,
      rank: r.rank as 1 | 2 | 3,
      fastestMs: r.fastest_ms as number,
    }));
  } catch (err) {
    console.error('[leaderboard] getPlayerMedals error', err);
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
