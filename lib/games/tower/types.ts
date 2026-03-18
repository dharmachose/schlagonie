// ─── Tile types ───────────────────────────────────────────────────────────────
export type TileType = 'PATH' | 'BUILD' | 'BLOCKED' | 'CORE';

// ─── Coordinates ─────────────────────────────────────────────────────────────
export interface Pos { x: number; y: number }
export interface Tile { col: number; row: number }

// ─── Enemy ───────────────────────────────────────────────────────────────────
export type EnemyType = 'aydoillard' | 'sanglier' | 'hippie' | 'mamie' | 'boss';

// ─── Tower ───────────────────────────────────────────────────────────────────
export type TowerType = 'brasseur' | 'claque' | 'forestier' | 'mortier' | 'glace';

export type TargetPriority = 'first' | 'last' | 'strongest';

export type GamePhase = 'placement' | 'battle' | 'wave_end' | 'victory' | 'defeat';

// ─── Tower definitions ────────────────────────────────────────────────────────
export interface TowerUpgradeDef {
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  aoe?: number;
  slowFactor?: number;
  freezeDuration?: number;
  label: string;
}

export interface TowerBaseDef {
  emoji: string;
  label: string;
  description: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;      // shots/s
  aoe: number;           // AOE radius px, 0 = single target
  slowFactor: number;    // speed multiplier 0-1 applied on hit (1 = no slow)
  freezeDuration: number;// seconds, 0 = no freeze
  color: string;         // CSS hex color
  upgrades: TowerUpgradeDef[];
}

// ─── Enemy definitions ────────────────────────────────────────────────────────
export interface EnemyBaseDef {
  emoji: string;
  label: string;
  hp: number;
  speed: number;         // px/s
  reward: number;        // gold
  liveDamage: number;
  healRadius?: number;   // mamie
  healRate?: number;     // HP/s
}

// ─── Runtime instances ───────────────────────────────────────────────────────
export interface Tower {
  id: string;
  type: TowerType;
  col: number;
  row: number;
  level: number;          // 1, 2, 3
  totalInvested: number;  // cumulative gold spent
  damage: number;
  range: number;
  fireRate: number;
  aoe: number;
  slowFactor: number;
  freezeDuration: number;
  cooldown: number;       // seconds until next shot
  priority: TargetPriority;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  emoji: string;
  pos: Pos;
  pathIndex: number;
  pathProgress: number;
  hp: number;
  maxHp: number;
  speed: number;
  alive: boolean;
  reached: boolean;
  slowTimer: number;     // seconds
  slowFactor: number;    // current speed multiplier
  freezeTimer: number;   // seconds
  spawnDelay: number;    // seconds from wave start
  spawned: boolean;
  reward: number;
  liveDamage: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  speed: number;
  damage: number;
  aoe: number;
  slowFactor: number;
  freezeDuration: number;
  color: string;
}

// ─── Wave / Level config ──────────────────────────────────────────────────────
export interface SpawnEntry {
  type: EnemyType;
  count: number;
  interval: number; // seconds between spawns
  delay: number;    // seconds from wave start
}

export interface WaveConfig {
  spawns: SpawnEntry[];
}

export interface LevelConfig {
  cols: number;
  rows: number;
  grid: TileType[][];
  paths: Tile[][];
  waves: WaveConfig[];
  startGold: number;
  startLives: number;
}

// ─── React ↔ Phaser bridge ────────────────────────────────────────────────────
export interface UIState {
  phase: GamePhase;
  wave: number;
  totalWaves: number;
  lives: number;
  gold: number;
  placementTimeLeft: number;
  gameSpeed: number;
  paused: boolean;
  selectedTower: {
    towerType: TowerType;
    level: number;
    totalInvested: number;
    upgradeable: boolean;
    upgradeCost: number;
    upgradeLabel: string;
    sellValue: number;
    priority: TargetPriority;
  } | null;
}

export interface GameBridge {
  // React → Scene
  setPlacingType: (type: TowerType | null) => void;
  startWave: () => void;
  setSpeed: (speed: number) => void;
  setPaused: (paused: boolean) => void;
  upgradeTower: () => void;
  sellTower: () => void;
  deselectTower: () => void;
  setTargetPriority: (priority: TargetPriority) => void;
  // Scene → React
  onStateChange: (state: UIState) => void;
  onLevelComplete: (ms: number) => void;
  onGameOver: () => void;
}
