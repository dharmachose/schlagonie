// ─── Tile types ───────────────────────────────────────────────────────────────
export type TileType = 'PATH' | 'BUILD' | 'BLOCKED' | 'CORE';

// ─── Coordinates ─────────────────────────────────────────────────────────────
export interface Pos { x: number; y: number }   // pixel position
export interface Tile { col: number; row: number } // grid position

// ─── Enemy ───────────────────────────────────────────────────────────────────
export type EnemyType = 'baffeur' | 'sanglier' | 'rasta' | 'mamie' | 'boss';

export interface Enemy {
  id: string;
  type: EnemyType;
  emoji: string;
  pos: Pos;
  pathIndex: number;      // current waypoint index
  pathProgress: number;   // 0-1 between current and next waypoint
  hp: number;
  maxHp: number;
  speed: number;          // px/s
  reward: number;
  alive: boolean;
  reached: boolean;       // true = reached CORE
  slow: number;           // multiplier 0-1 (1 = normal speed)
  slowTimer: number;      // ms remaining
  frozen: boolean;
  frozenTimer: number;    // ms remaining
  spawnDelay: number;     // ms to wait before spawning
  spawned: boolean;
}

// ─── Tower ───────────────────────────────────────────────────────────────────
export type TowerType = 'canon' | 'baffe' | 'piege' | 'mortier' | 'glace';
export type TargetingMode = 'farthest' | 'closest' | 'strongest' | 'weakest';

export interface Tower {
  id: string;
  type: TowerType;
  emoji: string;
  col: number;
  row: number;
  damage: number;
  range: number;          // pixels
  fireRate: number;       // shots/s
  lastShot: number;       // ms timestamp
  aoe: number;            // splash radius (0 = single target)
  slow: number;           // slow multiplier applied to target
  freezeDuration: number; // ms to freeze target
  color: string;
  level: number;          // 1-3 upgrade level
  targeting: TargetingMode;
}

// ─── Projectile ──────────────────────────────────────────────────────────────
export interface Projectile {
  id: string;
  pos: Pos;
  targetId: string;
  speed: number;
  damage: number;
  aoe: number;
  slow: number;
  freezeDuration: number;
  color: string;
  dead: boolean;
}

// ─── Particle ────────────────────────────────────────────────────────────────
export interface Particle {
  id: string;
  pos: Pos;
  emoji: string;
  createdAt: number;
  duration: number;       // ms
  scale: number;
  vx?: number;            // velocity x for animated particles
  vy?: number;            // velocity y
}

// ─── Game phase ──────────────────────────────────────────────────────────────
export type GamePhase = 'placement' | 'battle' | 'wave_end' | 'victory' | 'defeat';

// ─── Game state ──────────────────────────────────────────────────────────────
export interface GameState {
  phase: GamePhase;
  wave: number;           // current wave index (0-based)
  lives: number;
  gold: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  placementTimer: number; // ms remaining in placement phase
  spawnedCount: number;   // enemies spawned this wave
  speedMultiplier: number; // 0=paused, 1=normal, 2=fast, 3=ultra
}

// ─── Wave / Level config ──────────────────────────────────────────────────────
export interface SpawnEntry {
  type: EnemyType;
  count: number;
  interval: number; // ms between each spawn of this batch
  delay: number;    // ms offset from wave start
}

export interface WaveConfig {
  spawns: SpawnEntry[];
}

export interface LevelConfig {
  cols: number;
  rows: number;
  grid: TileType[][];   // grid[row][col]
  paths: Tile[][];      // one or more paths (array of waypoint tile coords)
  waves: WaveConfig[];
  startGold: number;
  startLives: number;
}
