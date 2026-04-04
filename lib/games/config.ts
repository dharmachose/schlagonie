import type { GameMeta } from '../types';

export const GAMES: GameMeta[] = [
  {
    id: 'memory',
    title: 'Mémoire des Vosges',
    emoji: '🌲',
    description: 'Retrouve les paires cachées dans la forêt vosgienne !',
    available: true,
  },
  {
    id: 'joint',
    title: 'Qui Roule Bamboule',
    emoji: '🌿',
    description: 'Roule le joint parfait le plus vite possible — weed, toncart, OCB, feu !',
    available: true,
  },
  {
    id: 'match3',
    title: 'Crush des Vosges',
    emoji: '👋',
    description: 'Aligne les baffes, sapins et cocas pour scorer !',
    available: true,
  },
  {
    id: 'pacman',
    title: 'Shlagonie Fuit !',
    emoji: '👑',
    description: "La reine Shlagonie fuit les fruits et légumes dans les ruelles d'Épinal !",
    available: true,
  },
  {
    id: 'tower',
    title: "Clash of Village",
    emoji: '⚔️',
    description: "Aydoilles attaque ! Place tes tours et défends le village de La Baffe contre les hordes d'envahisseurs !",
    available: true,
  },
  {
    id: 'allo',
    title: 'Allo ?!',
    emoji: '📞',
    description: "Réponds aux clients sans faire de faute ! Orthographe, grammaire, chiffres plausibles... Décrochez !",
    available: true,
  },
  {
    id: 'slots',
    title: 'La Roulette Vosgienne',
    emoji: '🎰',
    description: "Arrête les rouleaux au bon moment et accumule assez de pièces pour battre la Roulette Vosgienne !",
    available: true,
  },
  {
    id: 'tetris',
    title: 'Tetris Shlagonie',
    emoji: '🪵',
    description: 'Empile les sapins et les bûches pour battre le brouillard !',
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
