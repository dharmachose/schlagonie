import type { DifficultyLevel } from '@/lib/types';

export const ALL_SYMBOLS = ['🌲', '🥾', '⛰️', '🦌', '🍄', '👋', '🌿', '❄️', '🪵'] as const;

export interface LevelConfig {
  symbolCount: number;
  target: number;
  maxSpins: number;
  tickMs: number;
}

export const LEVEL_CONFIG: Record<DifficultyLevel, LevelConfig> = {
  1: { symbolCount: 5, target: 50,  maxSpins: 20, tickMs: 120 },
  2: { symbolCount: 6, target: 80,  maxSpins: 18, tickMs: 90  },
  3: { symbolCount: 7, target: 120, maxSpins: 16, tickMs: 65  },
  4: { symbolCount: 8, target: 180, maxSpins: 14, tickMs: 45  },
  5: { symbolCount: 9, target: 250, maxSpins: 12, tickMs: 30  },
};

export function getReelSymbols(level: DifficultyLevel): string[] {
  return ALL_SYMBOLS.slice(0, LEVEL_CONFIG[level].symbolCount);
}

export function calcPayout(line: [string, string, string]): { coins: number; label: string } {
  const [a, b, c] = line;

  if (a === b && b === c) return { coins: 30, label: '🎰 Jackpot !' };

  const s = new Set(line);
  if (s.has('🌲') && s.has('⛰️') && s.has('🦌')) return { coins: 20, label: '🌲 Combo Vosges !' };

  if (a === b || b === c || a === c) return { coins: 8, label: '✨ Paire !' };

  return { coins: 0, label: '' };
}
