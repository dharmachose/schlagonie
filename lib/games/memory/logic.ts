import type { DifficultyLevel } from '@/lib/types';

// Vosges-themed emoji pairs
export const VOSGES_EMOJIS = [
  '🌲', // sapin
  '👋', // la baffe
  '🌿', // rasta
  '🥤', // coca
  '⛰️', // montagne vosges
  '❄️', // neige
  '🦌', // cerf des vosges
  '🍄', // champignon
  '🌧️', // pluie vosges
  '🪵', // bûche
  '🏔️', // sommet
  '🦅', // aigle
  '🌰', // châtaigne
  '🫐', // myrtille des vosges
  '🌻', // tournesol
  '🐿️', // écureuil
  '🍃', // feuilles
  '⭐', // étoile
];

// Grid sizes per level: [rows, cols] → pairs = rows*cols / 2
export const GRID_CONFIG: Record<DifficultyLevel, { rows: number; cols: number }> = {
  1: { rows: 3, cols: 4 },  // 12 cards = 6 pairs
  2: { rows: 4, cols: 4 },  // 16 cards = 8 pairs
  3: { rows: 4, cols: 5 },  // 20 cards = 10 pairs
  4: { rows: 5, cols: 6 },  // 30 cards = 15 pairs
  5: { rows: 6, cols: 6 },  // 36 cards = 18 pairs
};

export interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

export function buildDeck(level: DifficultyLevel): MemoryCard[] {
  const { rows, cols } = GRID_CONFIG[level];
  const pairs = (rows * cols) / 2;
  const emojis = VOSGES_EMOJIS.slice(0, pairs);
  const cards = [...emojis, ...emojis]
    .map((emoji, id) => ({ id, emoji, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
    .map((card, idx) => ({ ...card, id: idx }));
  return cards;
}
