import type { DifficultyLevel } from '@/lib/types';
import type { LevelConfig } from './types';

export const COLORS = {
  background: '#0d1a0d',
  wallFill: '#1a3a1a',
  wallStroke: '#228B22',
  wallGlow: 'rgba(34, 139, 34, 0.3)',
  dot: '#FFD700',
  dotGlow: 'rgba(255, 215, 0, 0.4)',
  powerPellet: '#FFD700',
  pacman: '#FFD700',
  pacmanStroke: '#CC9900',
  ghostBlinky: '#DC143C',
  ghostPinky: '#FFB8FF',
  ghostInky: '#00FFFF',
  ghostClyde: '#FFB852',
  ghostFrightened: '#3333DD',
  ghostFrightenedFlash: '#FFFFFF',
  ghostEyes: '#FFFFFF',
  ghostPupil: '#222222',
  hudText: '#FFD700',
  readyText: '#FFD700',
  scorePopup: '#00FF00',
};

export const GHOST_COLORS: Record<string, string> = {
  blinky: COLORS.ghostBlinky,
  pinky: COLORS.ghostPinky,
  inky: COLORS.ghostInky,
  clyde: COLORS.ghostClyde,
};

export const LEVEL_CONFIG: Record<DifficultyLevel, LevelConfig> = {
  1: { pacmanSpeed: 5.0, ghostSpeed: 3.5, frightenedDuration: 10000, ghostCount: 2, fruitPoints: 100, fruitEmoji: '🍒' },
  2: { pacmanSpeed: 5.5, ghostSpeed: 4.5, frightenedDuration: 8000, ghostCount: 3, fruitPoints: 200, fruitEmoji: '🍓' },
  3: { pacmanSpeed: 6.0, ghostSpeed: 5.5, frightenedDuration: 6000, ghostCount: 4, fruitPoints: 300, fruitEmoji: '🍊' },
  4: { pacmanSpeed: 6.5, ghostSpeed: 6.5, frightenedDuration: 4000, ghostCount: 4, fruitPoints: 400, fruitEmoji: '🍎' },
  5: { pacmanSpeed: 7.0, ghostSpeed: 7.5, frightenedDuration: 3000, ghostCount: 4, fruitPoints: 500, fruitEmoji: '🔑' },
};

export const SCATTER_CHASE_SEQUENCE = [
  { mode: 'scatter' as const, duration: 7000 },
  { mode: 'chase' as const, duration: 20000 },
  { mode: 'scatter' as const, duration: 7000 },
  { mode: 'chase' as const, duration: 20000 },
  { mode: 'scatter' as const, duration: 5000 },
  { mode: 'chase' as const, duration: 20000 },
  { mode: 'scatter' as const, duration: 5000 },
  { mode: 'chase' as const, duration: Infinity },
];

export const GHOST_EXIT_DELAYS: Record<string, number> = {
  blinky: 0,
  pinky: 2000,
  inky: 5000,
  clyde: 8000,
};

export const TUNNEL_SPEED_FACTOR = 0.5;
export const FRIGHTENED_SPEED_FACTOR = 0.6;
export const EATEN_SPEED_FACTOR = 2.0;
export const READY_DURATION = 2000;
export const DEATH_ANIM_DURATION = 1500;
export const FRUIT_DURATION = 10000;
export const FRUIT_DOT_THRESHOLDS = [70, 170];
export const GHOST_COMBO_SCORES = [200, 400, 800, 1600];
export const DOT_SCORE = 10;
export const POWER_SCORE = 50;
export const INITIAL_LIVES = 3;
export const FLASH_DURATION = 300;
