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
    description: 'Aligne les baffes, sapins et cocas pour scorer !',
    color: '#FFD700',
    available: true,
  },
  {
    id: 'pacman',
    title: 'Shlagonie Fuit !',
    emoji: '👑',
    description: 'La reine Shlagonie fuit les fruits et légumes dans les ruelles des Vosges !',
    color: '#DC143C',
    available: true,
  },
  {
    id: 'joint',
    title: 'Qui Roule Bamboule',
    emoji: '🌿',
    description: 'Roule le joint parfait le plus vite possible — weed, toncart, OCB, feu !',
    color: '#00C851',
    available: true,
  },
  {
    id: 'tower',
    title: "Clash of Village",
    emoji: '⚔️',
    description: "Aydoilles attaque ! Place tes tours et défends le village de La Baffe contre les hordes d'envahisseurs !",
    color: '#8B6914',
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
