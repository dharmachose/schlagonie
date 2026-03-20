export type GameId = 'memory' | 'tetris' | 'match3' | 'pacman' | 'joint' | 'tower' | 'allo';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface PlayerProfile {
  id: string;
  name: string;
  createdAt: number;
}

export interface LevelCompletion {
  playerId: string;
  playerName: string;
  gameId: GameId;
  level: DifficultyLevel;
  elapsedMs: number;
  completedAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  fastestMs?: number;
}

export interface GameMeta {
  id: GameId;
  title: string;
  emoji: string;
  description: string;
  available: boolean;
}

export interface LevelResult {
  success: boolean;
  elapsedMs: number;
  score: number;
}

export interface GameProps {
  level: DifficultyLevel;
  onLevelComplete: (elapsedMs: number) => void;
  onGameOver: () => void;
}

