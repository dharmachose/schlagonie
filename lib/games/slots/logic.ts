import type { DifficultyLevel } from '@/lib/types';

export const ALL_SYMBOLS = ['🌲', '🥾', '⛰️', '🦌', '🍄', '👋', '🌿', '❄️', '🪵'] as const;

// Familles de symboles — combo si 3 du même groupe (unlockés progressivement)
// Forêt (🌲🍄🌿) disponible à partir du niveau 3 (🌿 = index 6)
// Montagne (⛰️❄️🥾) disponible à partir du niveau 4 (❄️ = index 7)
// Vosges (👋🦌🪵) disponible au niveau 5 (🪵 = index 8)
export const SYMBOL_FAMILIES: Record<string, readonly string[]> = {
  foret:    ['🌲', '🍄', '🌿'],
  montagne: ['⛰️', '❄️', '🥾'],
  vosges:   ['👋', '🦌', '🪵'],
};

const FAMILY_LABELS: Record<string, string> = {
  foret:    '🌲 Combo Forêt !',
  montagne: '⛰️ Combo Montagne !',
  vosges:   '👋 Combo Vosges !',
};

export interface LevelConfig {
  symbolCount: number;
  target:      number;
  maxSpins:    number;
  tickMs:      number; // ms entre chaque changement de symbole
}

export const LEVEL_CONFIG: Record<DifficultyLevel, LevelConfig> = {
  1: { symbolCount: 5, target: 50,  maxSpins: 20, tickMs: 120 },
  2: { symbolCount: 6, target: 80,  maxSpins: 18, tickMs: 90  },
  3: { symbolCount: 7, target: 120, maxSpins: 16, tickMs: 70  },
  4: { symbolCount: 8, target: 180, maxSpins: 14, tickMs: 55  },
  5: { symbolCount: 9, target: 250, maxSpins: 12, tickMs: 65  },
};

export function getReelSymbols(level: DifficultyLevel): string[] {
  return ALL_SYMBOLS.slice(0, LEVEL_CONFIG[level].symbolCount);
}

// Near-miss : 2 symboles d'une même famille mais pas le 3e (résultat = 0 pièces)
export function calcNearMiss(line: [string, string, string]): { symbol: string; label: string } | null {
  if (calcPayout(line).coins > 0) return null;
  for (const [, syms] of Object.entries(SYMBOL_FAMILIES)) {
    const inFamily = line.filter((x) => (syms as readonly string[]).includes(x));
    if (inFamily.length === 2) {
      const missing = (syms as readonly string[]).find((s) => !line.includes(s)) ?? syms[0];
      return { symbol: missing, label: `Presque ! Il manquait ${missing}` };
    }
  }
  return null;
}

export function calcPayout(line: [string, string, string]): { coins: number; label: string } {
  const [a, b, c] = line;

  // Jackpot : 3 identiques
  if (a === b && b === c) return { coins: 30, label: '🎰 Jackpot !' };

  // Combo famille : les 3 symboles appartiennent à la même famille
  for (const [family, syms] of Object.entries(SYMBOL_FAMILIES)) {
    if (line.every((x) => syms.includes(x))) {
      return { coins: 20, label: FAMILY_LABELS[family] };
    }
  }

  // Paire : 2 identiques
  if (a === b || b === c || a === c) return { coins: 8, label: '✨ Paire !' };

  return { coins: 0, label: '' };
}
