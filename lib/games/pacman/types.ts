import type { DifficultyLevel } from '@/lib/types';

export type TileType = 'wall' | 'dot' | 'power' | 'empty' | 'ghostHouse' | 'tunnel';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';
export type GhostMode = 'chase' | 'scatter' | 'frightened' | 'eaten';
export type GamePhase = 'ready' | 'playing' | 'dying' | 'levelComplete' | 'gameOver';

export interface Vec2 { x: number; y: number; }
export interface TilePos { row: number; col: number; }

export interface Ghost {
  name: GhostName;
  pos: Vec2;
  tilePos: TilePos;
  dir: Direction;
  nextDir: Direction;
  mode: GhostMode;
  prevMode: GhostMode;
  color: string;
  scatterTarget: TilePos;
  speed: number;
  exitDelay: number;
  inHouse: boolean;
  bobOffset: number;
}

export interface Fruit {
  active: boolean;
  pos: TilePos;
  points: number;
  timer: number;
  emoji: string;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string;
  size: number;
}

export interface MazeDef {
  rows: number;
  cols: number;
  data: number[][];
  tunnels: { row: number; leftCol: number; rightCol: number }[];
  pacmanSpawn: TilePos;
  ghostSpawns: TilePos[];
  ghostHouseEntry: TilePos;
  fruitPos: TilePos;
}

export interface LevelConfig {
  pacmanSpeed: number;
  ghostSpeed: number;
  frightenedDuration: number;
  ghostCount: number;
  fruitPoints: number;
  fruitEmoji: string;
}

export interface GameState {
  phase: GamePhase;
  maze: TileType[][];
  mazeDef: MazeDef;
  pacman: {
    pos: Vec2;
    tilePos: TilePos;
    dir: Direction;
    nextDir: Direction;
    speed: number;
    mouthAngle: number;
    mouthOpening: boolean;
  };
  ghosts: Ghost[];
  score: number;
  lives: number;
  dotsTotal: number;
  dotsEaten: number;
  ghostCombo: number;
  fruit: Fruit;
  scaredTimer: number;
  scatterChaseTimer: number;
  scatterChaseIndex: number;
  isScatterMode: boolean;
  readyTimer: number;
  deathAnimTimer: number;
  deathPos: Vec2 | null;
  particles: Particle[];
  elapsed: number;
  level: DifficultyLevel;
  flashTimer: number;
}

export const DIR_VECTORS: Record<Direction, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE_DIR: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

export function tileFromVec(v: Vec2): TilePos {
  return { row: Math.round(v.y), col: Math.round(v.x) };
}

export function vecFromTile(t: TilePos): Vec2 {
  return { x: t.col, y: t.row };
}

export function dist2(a: Vec2, b: Vec2): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

export function manhattan(a: TilePos, b: TilePos): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}
