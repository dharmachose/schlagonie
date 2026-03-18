import type { TowerType, EnemyType, Tower, Enemy } from './types';

// ─── Tower definitions (level 1 base stats) ────────────────────────────────
export const TOWER_DEFS: Record<TowerType, Omit<Tower, 'id' | 'col' | 'row'>> = {
  canon: {
    type: 'canon',
    emoji: '🍺',
    damage: 20,
    range: 130,
    fireRate: 1,
    lastShot: 0,
    aoe: 0,
    slow: 1,
    freezeDuration: 0,
    color: '#D4A017',
    level: 1,
    targeting: 'farthest',
  },
  baffe: {
    type: 'baffe',
    emoji: '👋',
    damage: 10,
    range: 90,
    fireRate: 2.5,
    lastShot: 0,
    aoe: 0,
    slow: 1,
    freezeDuration: 0,
    color: '#FF6B35',
    level: 1,
    targeting: 'farthest',
  },
  piege: {
    type: 'piege',
    emoji: '🌲',
    damage: 5,
    range: 70,
    fireRate: 1,
    lastShot: 0,
    aoe: 0,
    slow: 0.5,
    freezeDuration: 0,
    color: '#228B22',
    level: 1,
    targeting: 'farthest',
  },
  mortier: {
    type: 'mortier',
    emoji: '💣',
    damage: 45,
    range: 160,
    fireRate: 0.4,
    lastShot: 0,
    aoe: 50,
    slow: 1,
    freezeDuration: 0,
    color: '#555555',
    level: 1,
    targeting: 'farthest',
  },
  glace: {
    type: 'glace',
    emoji: '❄️',
    damage: 8,
    range: 110,
    fireRate: 0.6,
    lastShot: 0,
    aoe: 0,
    slow: 1,
    freezeDuration: 2000,
    color: '#4FC3F7',
    level: 1,
    targeting: 'farthest',
  },
};

export const TOWER_COSTS: Record<TowerType, number> = {
  canon: 60,
  baffe: 35,
  piege: 45,
  mortier: 90,
  glace: 70,
};

export const TOWER_LABELS: Record<TowerType, string> = {
  canon: 'Canon à Bières',
  baffe: 'Tourelle Baffe',
  piege: 'Piège Forestier',
  mortier: 'Mortier Vosgien',
  glace: 'Canon Glace',
};

// ─── Upgrade system ─────────────────────────────────────────────────────────
// Multipliers applied at each level (damage, range, fireRate)
export const UPGRADE_MULTIPLIERS: Record<number, { damage: number; range: number; fireRate: number }> = {
  1: { damage: 1, range: 1, fireRate: 1 },
  2: { damage: 1.5, range: 1.15, fireRate: 1.2 },
  3: { damage: 2.2, range: 1.3, fireRate: 1.4 },
};

export const UPGRADE_COSTS: Record<TowerType, Record<number, number>> = {
  canon:   { 2: 50, 3: 100 },
  baffe:   { 2: 30, 3: 65 },
  piege:   { 2: 35, 3: 75 },
  mortier: { 2: 75, 3: 150 },
  glace:   { 2: 55, 3: 110 },
};

export const UPGRADE_EMOJIS: Record<TowerType, Record<number, string>> = {
  canon:   { 1: '🍺', 2: '🍻', 3: '🥃' },
  baffe:   { 1: '👋', 2: '🤜', 3: '💪' },
  piege:   { 1: '🌲', 2: '🌳', 3: '🏔️' },
  mortier: { 1: '💣', 2: '🧨', 3: '☄️' },
  glace:   { 1: '❄️', 2: '🧊', 3: '🌨️' },
};

export const SELL_REFUND_RATIO = 0.5;

// ─── Enemy definitions ────────────────────────────────────────────────────────
export const ENEMY_DEFS: Record<EnemyType, Omit<Enemy, 'id' | 'pos' | 'pathIndex' | 'pathProgress' | 'alive' | 'reached' | 'slow' | 'slowTimer' | 'frozen' | 'frozenTimer' | 'spawnDelay' | 'spawned'>> = {
  baffeur: {
    type: 'baffeur',
    emoji: '🥊',
    hp: 50,
    maxHp: 50,
    speed: 70,
    reward: 8,
  },
  sanglier: {
    type: 'sanglier',
    emoji: '🐗',
    hp: 30,
    maxHp: 30,
    speed: 130,
    reward: 6,
  },
  rasta: {
    type: 'rasta',
    emoji: '🌿',
    hp: 180,
    maxHp: 180,
    speed: 45,
    reward: 20,
  },
  mamie: {
    type: 'mamie',
    emoji: '👵',
    hp: 70,
    maxHp: 70,
    speed: 65,
    reward: 25,
  },
  boss: {
    type: 'boss',
    emoji: '👑',
    hp: 600,
    maxHp: 600,
    speed: 35,
    reward: 80,
  },
};

export const ENEMY_LABELS: Record<EnemyType, string> = {
  baffeur: 'Baffeur',
  sanglier: 'Sanglier',
  rasta: 'Rasta',
  mamie: 'Mamie',
  boss: 'Boss',
};

// Lives taken when enemy reaches CORE
export const ENEMY_LIVES_DAMAGE: Record<EnemyType, number> = {
  baffeur: 1,
  sanglier: 1,
  rasta: 2,
  mamie: 1,
  boss: 5,
};

export const PLACEMENT_DURATION = 15000; // ms
export const TILE_SIZE = 40;             // px
