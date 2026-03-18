import type { LevelConfig, TileType } from './types';

// Helper: parse grid from string array
// P=PATH, B=BUILD, X=BLOCKED, C=CORE
function parseGrid(lines: string[]): TileType[][] {
  return lines.map(line =>
    line.split('').map(c => {
      if (c === 'P') return 'PATH';
      if (c === 'C') return 'CORE';
      if (c === 'X') return 'BLOCKED';
      return 'BUILD';
    })
  );
}

// ─── Level 1 — Chemin en L ──────────────────────────────────────────────────
const L1_GRID = parseGrid([
  'BBBBBBBBBBBBBBBB', // row 0
  'BBBBBBBBBBBBBBBB', // row 1
  'PPPPPPPPPPPPBBBB', // row 2  →
  'BBBBBBBBBBPPBBBB', // row 3  ↓
  'BBBBBBBBBBPPBBBB', // row 4
  'BBBBBBBBBBPPBBBB', // row 5
  'BBBBBBBBBBPPBBBB', // row 6
  'BBBBBBBBBBPPBBBB', // row 7
  'BBBBBBBBBBPPBBBB', // row 8
  'BBBBBBBBBBPPPPPP', // row 9  →
  'BBBBBBBBBBBBBBC',  // row 10 CORE
]);
const L1_PATH = [
  { col: 0, row: 2 }, { col: 9, row: 2 },
  { col: 9, row: 9 },
  { col: 15, row: 9 }, { col: 15, row: 10 },
];

// ─── Level 2 — Zigzag ────────────────────────────────────────────────────────
const L2_GRID = parseGrid([
  'PPPPPPBBBBBBBBBB', // row 0
  'BBBBPPBBBBBBBBBB', // row 1
  'BBBBPPPPPPPPBBBB', // row 2
  'BBBBBBBBBBPPBBBB', // row 3
  'BBBBBBBBBBPPPPPP', // row 4
  'BBBBBBBBBBBBBBPP', // row 5
  'PPPPPPPPPPPPBBPP', // row 6
  'PPBBBBBBBBBBBBBB', // row 7
  'PPBBBBBBBBBBBBBB', // row 8
  'PPPPPPPPPPPPPPBB', // row 9
  'BBBBBBBBBBBBBBC',  // row 10
]);
const L2_PATH = [
  { col: 0, row: 0 }, { col: 3, row: 0 },
  { col: 3, row: 2 }, { col: 9, row: 2 },
  { col: 9, row: 4 }, { col: 15, row: 4 },
  { col: 15, row: 6 }, { col: 1, row: 6 },
  { col: 1, row: 9 }, { col: 13, row: 9 },
  { col: 13, row: 10 },
];

// ─── Level 3 — Longue serpentine ──────────────────────────────────────────
const L3_GRID = parseGrid([
  'PPPPPPPPPPPPPPBB', // row 0
  'BBBBBBBBBBBBBBPP', // row 1
  'PPPPPPPPPPPPPPBB', // row 2
  'BBBBBBBBBBBBBBPP', // row 3
  'PPPPPPPPPPPPPPBB', // row 4
  'BBBBBBBBBBBBBBPP', // row 5
  'PPPPPPPPPPPPPPBB', // row 6
  'BBBBBBBBBBBBBBPP', // row 7
  'PPPPPPPPPPPPPPBB', // row 8
  'BBBBBBBBBBBBBBPP', // row 9
  'BBBBBBBBBBBBBBC',  // row 10
]);
const L3_PATH = [
  { col: 0, row: 0 }, { col: 13, row: 0 },
  { col: 13, row: 1 }, { col: 0, row: 2 },
  { col: 0, row: 2 }, { col: 13, row: 2 },
  { col: 13, row: 3 }, { col: 0, row: 4 },
  { col: 0, row: 4 }, { col: 13, row: 4 },
  { col: 13, row: 5 }, { col: 0, row: 6 },
  { col: 0, row: 6 }, { col: 13, row: 6 },
  { col: 13, row: 7 }, { col: 0, row: 8 },
  { col: 0, row: 8 }, { col: 13, row: 8 },
  { col: 13, row: 9 }, { col: 15, row: 9 },
  { col: 15, row: 10 },
];

// ─── Level 4 — Deux entrées ───────────────────────────────────────────────
const L4_GRID = parseGrid([
  'PPPPPPBBBBBBBBBB', // row 0 — entrée A
  'BBBBPPBBBBBBBBBB', // row 1
  'BBBBPPBBPPPPPPBB', // row 2 — entrée B
  'PPPPPPBBPPBBBBBB', // row 3
  'PPBBBBBBPPBBBBBB', // row 4
  'PPPPPPPPPPBBBBBB', // row 5 — merge
  'BBBBBBBBPPBBBBBB', // row 6
  'BBBBBBBBPPPPPPBB', // row 7
  'BBBBBBBBBBBBPPBB', // row 8
  'BBBBBBBBBBBBPPPP', // row 9
  'BBBBBBBBBBBBBBC',  // row 10
]);
const L4_PATH_A = [
  { col: 0, row: 0 }, { col: 3, row: 0 },
  { col: 3, row: 3 }, { col: 0, row: 3 },
  { col: 0, row: 5 }, { col: 8, row: 5 },
];
const L4_PATH_B = [
  { col: 8, row: 2 }, { col: 8, row: 5 },
];
const L4_PATH_TAIL = [
  { col: 8, row: 5 }, { col: 8, row: 7 },
  { col: 12, row: 7 }, { col: 12, row: 9 },
  { col: 15, row: 9 }, { col: 15, row: 10 },
];

// ─── Level 5 — Triple invasion (Boss final) ───────────────────────────────
const L5_GRID = parseGrid([
  'PPPPBBBBBBBBBBBB', // row 0
  'BBPPBBBBBBBBBBBB', // row 1
  'BBPPPPPPPPPPBBBB', // row 2
  'PPBBBBBBBBPPBBBB', // row 3
  'PPPPBBBBBBPPBBBB', // row 4
  'BBBBPPPPPPPPBBBB', // row 5
  'BBBBPPBBBBBBBBBB', // row 6
  'BBBBPPPPPPPPPPBB', // row 7
  'BBBBBBBBBBBBPPBB', // row 8
  'BBBBBBBBBBBBPPPP', // row 9
  'BBBBBBBBBBBBBBC',  // row 10
]);
const L5_PATH_A = [
  { col: 0, row: 0 }, { col: 1, row: 0 },
  { col: 1, row: 2 }, { col: 10, row: 2 },
  { col: 10, row: 5 },
];
const L5_PATH_B = [
  { col: 0, row: 3 }, { col: 0, row: 4 },
  { col: 3, row: 4 }, { col: 3, row: 5 },
  { col: 10, row: 5 },
];
const L5_PATH_TAIL = [
  { col: 10, row: 5 }, { col: 4, row: 5 },
  { col: 4, row: 7 }, { col: 12, row: 7 },
  { col: 12, row: 9 }, { col: 15, row: 9 },
  { col: 15, row: 10 },
];

// ─── Exported levels ──────────────────────────────────────────────────────
export const LEVELS: LevelConfig[] = [
  // Level 1 — Facile (4 vagues)
  {
    cols: 16, rows: 11,
    grid: L1_GRID,
    paths: [L1_PATH],
    startGold: 150, startLives: 20,
    waves: [
      { spawns: [{ type: 'aydoillard', count: 8,  interval: 1.2, delay: 0 }] },
      { spawns: [{ type: 'aydoillard', count: 8,  interval: 1.0, delay: 0 }, { type: 'sanglier', count: 4, interval: 1.5, delay: 4 }] },
      { spawns: [{ type: 'aydoillard', count: 10, interval: 0.9, delay: 0 }, { type: 'sanglier', count: 6, interval: 1.2, delay: 3 }] },
      { spawns: [{ type: 'aydoillard', count: 12, interval: 0.8, delay: 0 }, { type: 'sanglier', count: 8, interval: 1.0, delay: 2 }] },
    ],
  },
  // Level 2 — Moyen (5 vagues)
  {
    cols: 16, rows: 11,
    grid: L2_GRID,
    paths: [L2_PATH],
    startGold: 150, startLives: 20,
    waves: [
      { spawns: [{ type: 'aydoillard', count: 10, interval: 1.0, delay: 0 }] },
      { spawns: [{ type: 'aydoillard', count: 8,  interval: 0.9, delay: 0 }, { type: 'hippie', count: 2, interval: 3.0, delay: 5 }] },
      { spawns: [{ type: 'sanglier',   count: 10, interval: 0.8, delay: 0 }, { type: 'hippie', count: 3, interval: 2.5, delay: 3 }] },
      { spawns: [{ type: 'aydoillard', count: 12, interval: 0.7, delay: 0 }, { type: 'sanglier', count: 6, interval: 0.9, delay: 2 }] },
      { spawns: [{ type: 'hippie',     count: 6,  interval: 2.0, delay: 0 }, { type: 'sanglier', count: 10, interval: 0.7, delay: 4 }] },
    ],
  },
  // Level 3 — Difficile serpentine (5 vagues)
  {
    cols: 16, rows: 11,
    grid: L3_GRID,
    paths: [L3_PATH],
    startGold: 150, startLives: 20,
    waves: [
      { spawns: [{ type: 'sanglier',   count: 15, interval: 0.6, delay: 0 }] },
      { spawns: [{ type: 'aydoillard', count: 15, interval: 0.6, delay: 0 }, { type: 'hippie',  count: 4,  interval: 2.0, delay: 4 }] },
      { spawns: [{ type: 'sanglier',   count: 12, interval: 0.5, delay: 0 }, { type: 'hippie',  count: 5,  interval: 1.8, delay: 3 }] },
      { spawns: [{ type: 'aydoillard', count: 15, interval: 0.5, delay: 0 }, { type: 'hippie',  count: 6,  interval: 1.8, delay: 2 }, { type: 'sanglier', count: 10, interval: 0.6, delay: 8 }] },
      { spawns: [{ type: 'hippie',     count: 10, interval: 1.5, delay: 0 }, { type: 'sanglier', count: 15, interval: 0.5, delay: 3 }] },
    ],
  },
  // Level 4 — Deux entrées + Mamies (6 vagues)
  {
    cols: 16, rows: 11,
    grid: L4_GRID,
    paths: [
      [...L4_PATH_A, ...L4_PATH_TAIL],
      [...L4_PATH_B, ...L4_PATH_TAIL],
    ],
    startGold: 150, startLives: 20,
    waves: [
      { spawns: [{ type: 'aydoillard', count: 10, interval: 0.9, delay: 0 }, { type: 'mamie', count: 2, interval: 3.0, delay: 5 }] },
      { spawns: [{ type: 'sanglier',   count: 12, interval: 0.7, delay: 0 }, { type: 'mamie', count: 3, interval: 2.5, delay: 3 }] },
      { spawns: [{ type: 'hippie',     count: 6,  interval: 1.8, delay: 0 }, { type: 'mamie', count: 4, interval: 2.0, delay: 2 }] },
      { spawns: [{ type: 'aydoillard', count: 15, interval: 0.6, delay: 0 }, { type: 'mamie', count: 4, interval: 2.0, delay: 3 }, { type: 'hippie', count: 5, interval: 1.8, delay: 7 }] },
      { spawns: [{ type: 'hippie',     count: 8,  interval: 1.5, delay: 0 }, { type: 'mamie', count: 5, interval: 2.0, delay: 2 }, { type: 'sanglier', count: 15, interval: 0.5, delay: 6 }] },
      { spawns: [{ type: 'aydoillard', count: 20, interval: 0.5, delay: 0 }, { type: 'hippie', count: 10, interval: 1.2, delay: 3 }, { type: 'mamie', count: 6, interval: 1.8, delay: 8 }] },
    ],
  },
  // Level 5 — Deux entrées + BOSS (7 vagues)
  {
    cols: 16, rows: 11,
    grid: L5_GRID,
    paths: [
      [...L5_PATH_A, ...L5_PATH_TAIL],
      [...L5_PATH_B, ...L5_PATH_TAIL],
    ],
    startGold: 150, startLives: 20,
    waves: [
      { spawns: [{ type: 'aydoillard', count: 15, interval: 0.6, delay: 0 }, { type: 'mamie', count: 3, interval: 2.0, delay: 4 }] },
      { spawns: [{ type: 'sanglier',   count: 20, interval: 0.4, delay: 0 }, { type: 'hippie', count: 5, interval: 1.5, delay: 4 }] },
      { spawns: [{ type: 'hippie',     count: 10, interval: 1.2, delay: 0 }, { type: 'mamie',  count: 5, interval: 1.8, delay: 3 }] },
      { spawns: [{ type: 'aydoillard', count: 20, interval: 0.5, delay: 0 }, { type: 'sanglier', count: 15, interval: 0.5, delay: 4 }, { type: 'mamie', count: 6, interval: 1.5, delay: 8 }] },
      { spawns: [{ type: 'hippie',     count: 12, interval: 1.0, delay: 0 }, { type: 'mamie', count: 8, interval: 1.5, delay: 3 }, { type: 'sanglier', count: 20, interval: 0.4, delay: 7 }] },
      { spawns: [{ type: 'aydoillard', count: 25, interval: 0.4, delay: 0 }, { type: 'hippie',  count: 15, interval: 1.0, delay: 3 }, { type: 'mamie', count: 8, interval: 1.5, delay: 7 }] },
      // Vague finale : BOSS + escorte
      { spawns: [{ type: 'boss',       count: 1,  interval: 0,   delay: 0 }, { type: 'mamie', count: 5, interval: 2.0, delay: 3 }, { type: 'hippie', count: 10, interval: 1.0, delay: 5 }] },
    ],
  },
];
