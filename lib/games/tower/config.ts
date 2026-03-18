import type { TowerType, EnemyType, TowerBaseDef, EnemyBaseDef } from './types';

export const CELL_SIZE = 56;           // px per grid cell
export const PLACEMENT_DURATION = 15;  // seconds

// ─── Tower definitions ─────────────────────────────────────────────────────
// Defending La Baffe 🏘️ against Aydoilles invaders
export const TOWER_DEFS: Record<TowerType, TowerBaseDef> = {
  brasseur: {
    emoji: '🍺',
    label: 'Canon à Bières',
    description: 'Tour polyvalente. Dégâts corrects, bonne portée.',
    cost: 60,
    damage: 25,
    range: 130,
    fireRate: 1.0,
    aoe: 0,
    slowFactor: 1,
    freezeDuration: 0,
    color: '#D4A017',
    upgrades: [
      { cost: 70,  damage: 45,  range: 150, fireRate: 1.2, label: 'Bière Pression+ : +dégâts portée' },
      { cost: 120, damage: 80,  range: 175, fireRate: 1.5, label: 'Grand Cru Artisanal : maîtrise totale' },
    ],
  },
  claque: {
    emoji: '👋',
    label: 'Tourelle Claque',
    description: 'Cadence très élevée, faibles dégâts, courte portée.',
    cost: 35,
    damage: 10,
    range: 90,
    fireRate: 2.5,
    aoe: 0,
    slowFactor: 1,
    freezeDuration: 0,
    color: '#FF6B35',
    upgrades: [
      { cost: 40, damage: 18, range: 100, fireRate: 3.2, label: 'Gifle Sonore : cadence accrue' },
      { cost: 80, damage: 32, range: 115, fireRate: 4.0, label: 'Baffe Légendaire de La Baffe' },
    ],
  },
  forestier: {
    emoji: '🌲',
    label: 'Piège Forestier',
    description: 'Ralentit les ennemis à 40% de leur vitesse.',
    cost: 45,
    damage: 5,
    range: 80,
    fireRate: 1.0,
    aoe: 0,
    slowFactor: 0.4,
    freezeDuration: 0,
    color: '#4CAF50',
    upgrades: [
      { cost: 55,  damage: 8,  range: 95,  fireRate: 1.2, slowFactor: 0.30, label: 'Forêt Dense : 30% vitesse' },
      { cost: 100, damage: 12, range: 115, fireRate: 1.5, slowFactor: 0.20, label: 'Forêt Enchantée : 20% vitesse' },
    ],
  },
  mortier: {
    emoji: '💣',
    label: 'Mortier Vosgien',
    description: 'Dégâts de zone (rayon 50px), très longue portée.',
    cost: 90,
    damage: 50,
    range: 175,
    fireRate: 0.4,
    aoe: 50,
    slowFactor: 1,
    freezeDuration: 0,
    color: '#795548',
    upgrades: [
      { cost: 100, damage: 85,  range: 200, fireRate: 0.5, aoe: 65,  label: 'Mortier Lourd : zone 65px' },
      { cost: 180, damage: 140, range: 225, fireRate: 0.6, aoe: 82,  label: 'Super Mortier : zone 82px' },
    ],
  },
  glace: {
    emoji: '❄️',
    label: 'Canon Glace',
    description: 'Gèle les ennemis 2s (immobiles).',
    cost: 70,
    damage: 8,
    range: 115,
    fireRate: 0.6,
    aoe: 0,
    slowFactor: 1,
    freezeDuration: 2,
    color: '#4DD0E1',
    upgrades: [
      { cost: 80,  damage: 14, range: 135, fireRate: 0.8, freezeDuration: 3, label: 'Givre+ : gel 3s' },
      { cost: 140, damage: 22, range: 160, fireRate: 1.0, freezeDuration: 4, label: 'Blizzard Vosgien : gel 4s' },
    ],
  },
};

// ─── Enemy definitions ─────────────────────────────────────────────────────
// Aydoilles attacking La Baffe 🥊
export const ENEMY_DEFS: Record<EnemyType, EnemyBaseDef> = {
  aydoillard: {
    emoji: '🥊',
    label: 'Aydoillard',
    hp: 60,
    speed: 80,
    reward: 8,
    liveDamage: 1,
  },
  sanglier: {
    emoji: '🐗',
    label: 'Sanglier d\'Aydoilles',
    hp: 35,
    speed: 140,
    reward: 6,
    liveDamage: 1,
  },
  hippie: {
    emoji: '🌿',
    label: 'Hippie Aydoillard',
    hp: 200,
    speed: 45,
    reward: 20,
    liveDamage: 1,
  },
  mamie: {
    emoji: '👵',
    label: 'Mamie Aydoillarde',
    hp: 80,
    speed: 60,
    reward: 25,
    liveDamage: 1,
    healRadius: 65,
    healRate: 10,
  },
  boss: {
    emoji: '👑',
    label: 'Chef d\'Aydoilles',
    hp: 700,
    speed: 35,
    reward: 100,
    liveDamage: 5,
  },
};
