import type { GameMeta } from '../types';

export const GAMES: GameMeta[] = [
  {
    id: 'memory',
    title: 'Mémoire des Vosges',
    emoji: '🌲',
    description: 'Retrouve les paires cachées dans la forêt vosge !',
    color: '#228B22',
    available: true,
  },
  {
    id: 'tetris',
    title: 'Tetris Shlagonie',
    emoji: '🪵',
    description: 'Empile les sapins et les bûches pour battre le brouillard !',
    color: '#32CD32',
    available: true,
  },
  {
    id: 'match3',
    title: 'Crush des Vosges',
    emoji: '👋',
    description: 'Aligne les baffes, sapins et bédots pour scorer !',
    color: '#FFD700',
    available: true,
  },
  {
    id: 'pacman',
    title: 'Shlagonie Fuit !',
    emoji: '🏃',
    description: 'Shlagonie dévale les pentes des Vosges face aux fantômes !',
    color: '#DC143C',
    available: true,
  },
];

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Promenade 🌱',
  2: 'Randonnée 🌿',
  3: 'Col des Vosges ⛰️',
  4: 'Tempête 🌪️',
  5: 'La Baffe Ultime 👋',
};
