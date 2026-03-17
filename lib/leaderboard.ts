import { Redis } from '@upstash/redis';
import type { GameId, DifficultyLevel, LeaderboardEntry, LevelCompletion } from './types';
import { KV_KEYS } from './types';

// Redis client — env vars set in Vercel dashboard or .env.local
// Supports both standard Upstash vars and Vercel's custom-prefix vars (STORAGE_SCHLAGONIE_*)
function getRedis(): Redis | null {
  const url =
    process.env.STORAGE_SCHLAGONIE_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.STORAGE_SCHLAGONIE_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return new Redis({ url, token });
}

const TOP_N = 20;

/**
 * Submit a level completion. Updates:
 * - global leaderboard (total points per player)
 * - per-game leaderboard
 * - speed leaderboard for that level
 */
export async function submitScore(completion: LevelCompletion): Promise<void> {
  const redis = getRedis();
  if (!redis) return; // silently fail if no Redis configured

  const { playerName, gameId, level, elapsedMs } = completion;

  const pipeline = redis.pipeline();

  // Increment global + per-game scores by 1 (only when first completion registered via API)
  pipeline.zincrby(KV_KEYS.globalLb(), 1, playerName);
  pipeline.zincrby(KV_KEYS.gameLb(gameId), 1, playerName);

  // For speed: lower is better → store negative ms, so ZREVRANGE gives fastest first
  // Only update if better (lower) time
  const speedKey = KV_KEYS.speedLb(gameId, level);
  const existing = await redis.zscore(speedKey, playerName);
  if (existing === null || -elapsedMs > existing) {
    pipeline.zadd(speedKey, { score: -elapsedMs, member: playerName });
  }

  await pipeline.exec();
}

/**
 * Get global leaderboard (top N by total points)
 */
export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  const redis = getRedis();
  if (!redis) return [];

  const results = await redis.zrange(KV_KEYS.globalLb(), 0, TOP_N - 1, {
    rev: true,
    withScores: true,
  });

  return parseLeaderboardResults(results as (string | number)[]);
}

/**
 * Get per-game leaderboard
 */
export async function getGameLeaderboard(gameId: GameId): Promise<LeaderboardEntry[]> {
  const redis = getRedis();
  if (!redis) return [];

  const results = await redis.zrange(KV_KEYS.gameLb(gameId), 0, TOP_N - 1, {
    rev: true,
    withScores: true,
  });

  return parseLeaderboardResults(results as (string | number)[]);
}

/**
 * Get speed leaderboard for a specific game level
 */
export async function getSpeedLeaderboard(
  gameId: GameId,
  level: DifficultyLevel
): Promise<LeaderboardEntry[]> {
  const redis = getRedis();
  if (!redis) return [];

  const results = await redis.zrange(KV_KEYS.speedLb(gameId, level), 0, TOP_N - 1, {
    rev: true,
    withScores: true,
  }) as (string | number)[];

  return results
    .reduce<LeaderboardEntry[]>((acc, item, i) => {
      if (i % 2 === 0) {
        acc.push({
          rank: acc.length + 1,
          playerName: item as string,
          score: 0,
          fastestMs: Math.abs(Number(results[i + 1])),
        });
      }
      return acc;
    }, []);
}

function parseLeaderboardResults(results: (string | number)[]): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < results.length; i += 2) {
    entries.push({
      rank: entries.length + 1,
      playerName: results[i] as string,
      score: Number(results[i + 1]),
    });
  }
  return entries;
}
