import type { TowerType, EnemyType, Tower, Enemy } from './types';

// ─── Tower definitions ───────────────────────────────────────────────────────
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
