import type { DifficultyLevel } from '@/lib/types';

export type ActionType =
  | 'tap'
  | 'rapid-tap'
  | 'swipe-right'
  | 'swipe-left'
  | 'swipe-up'
  | 'swipe-down'
  | 'hold';

export interface JointStep {
  id: string;
  emoji: string;
  label: string;
  description: string;
  action: ActionType;
  /** rapid-tap: nb taps required | hold: duration in ms */
  target?: number;
  basePoints: number;
  bonusPoints: number;
}

export const STEPS: JointStep[] = [
  {
    id: 'fill-grinder',
    emoji: '🌿',
    label: 'Mettre la weed',
    description: 'Glisse la weed dans le grindeur',
    action: 'swipe-down',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'grind',
    emoji: '⚙️',
    label: 'Grinder !',
    description: 'Tapes vite pour grinder la weed',
    action: 'rapid-tap',
    target: 12,
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'open-grinder',
    emoji: '🔓',
    label: 'Ouvrir le grindeur',
    description: 'Dévisse le grindeur pour récupérer la weed',
    action: 'swipe-up',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'take-paper',
    emoji: '📄',
    label: 'Prendre une feuille',
    description: 'Attrape une feuille OCB',
    action: 'swipe-up',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'make-filter',
    emoji: '🎋',
    label: 'Rouler le toncart',
    description: 'Roule le filtre en carton',
    action: 'swipe-right',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'place-toncart',
    emoji: '📦',
    label: 'Poser le toncart',
    description: 'Glisse le toncart au bout de la feuille',
    action: 'tap',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'add-tobacco',
    emoji: '🍂',
    label: 'Poser le tabac',
    description: 'Étale une pincée de tabac sur la feuille',
    action: 'swipe-down',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'add-weed',
    emoji: '🌿',
    label: 'Verser le cannabis',
    description: 'Ajoute le cannabis grindé',
    action: 'swipe-down',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'add-pollen',
    emoji: '✨',
    label: 'Ajouter le pollen',
    description: 'Récupère le pollen du fond du grindeur',
    action: 'tap',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'pack-down',
    emoji: '👇',
    label: 'Tasser le mélange',
    description: 'Tasse doucement pour bien répartir',
    action: 'rapid-tap',
    target: 8,
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'roll-pinch',
    emoji: '🤌',
    label: 'Rouler en pinçant',
    description: 'Pince et roule jusqu\'au bout',
    action: 'swipe-right',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'lick',
    emoji: '👅',
    label: 'Lécher la feuille',
    description: 'Passe la langue sur la bande de colle',
    action: 'swipe-right',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'seal-top',
    emoji: '🔒',
    label: 'Fermer le haut',
    description: 'Tords proprement le bout du joint',
    action: 'swipe-up',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'twist-bottom',
    emoji: '🔀',
    label: 'Tordre le bas',
    description: 'Tords le bas pour bien fermer',
    action: 'swipe-down',
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'light',
    emoji: '🔥',
    label: 'Allumer !',
    description: 'Tiens appuyé pour allumer le joint',
    action: 'hold',
    target: 1000,
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'first-puff',
    emoji: '💨',
    label: 'Tirer la première taffe',
    description: 'Tiens appuyé pour tirer une longue taffe',
    action: 'hold',
    target: 1400,
    basePoints: 60,
    bonusPoints: 100,
  },
  {
    id: 'exhale',
    emoji: '🌬️',
    label: 'Souffler',
    description: 'Souffle lentement la fumée',
    action: 'swipe-up',
    basePoints: 60,
    bonusPoints: 100,
  },
];

/** Speed target (ms) per level: complete within this time to get full bonus */
export const SPEED_TARGET: Record<DifficultyLevel, number> = {
  1: 7000,
  2: 5000,
  3: 3500,
  4: 2500,
  5: 1600,
};

/**
 * Min score needed to win a level.
 * Total base: 17 * 60 = 1020 — Total max (all fast): 17 * 160 = 2720
 */
export const WIN_SCORE: Record<DifficultyLevel, number> = {
  1: 850,   // just complete all steps, any speed
  2: 1200,  // need ~2 speed bonuses
  3: 1650,  // need ~5 speed bonuses
  4: 2100,  // need ~8 speed bonuses
  5: 2600,  // need nearly all speed bonuses
};
