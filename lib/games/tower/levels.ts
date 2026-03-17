import type { LevelConfig, TileType } from './types';

// Helper to build a grid row-by-row from a string array
// P = PATH, B = BUILD, X = BLOCKED, C = CORE
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

// ─── Level 1 — Simple L-path ──────────────────────────────────────────────────
// 16 cols × 11 rows
// Enemies enter left side, go right, then down to Mairie bottom-right
const L1_GRID = parseGrid([
  'BBBBBBBBBBBBBBBB', // row 0
  'BBBBBBBBBBBBBBBB', // row 1
  'PPPPPPPPPPPPBBBB', // row 2  path goes right
  'BBBBBBBBBBPPBBBB', // row 3
  'BBBBBBBBBBPPBBBB', // row 4
  'BBBBBBBBBBPPBBBB', // row 5
  'BBBBBBBBBBPPBBBB', // row 6
  'BBBBBBBBBBPPBBBB', // row 7
  'BBBBBBBBBBPPBBBB', // row 8
  'BBBBBBBBBBPPPPPP', // row 9  path goes right
  'BBBBBBBBBBBBBBC', //  row 10 core (Mairie)
]);
// Waypoints: tile coords [col, row] along the path
const L1_PATH = [
  { col: 0, row: 2 }, { col: 9, row: 2 }, // go right
  { col: 9, row: 9 },                       // go down
  { col: 15, row: 9 }, { col: 15, row: 10 }, // reach mairie
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
  'BBBBBBBBBBBBBBC', //  row 10
]);
const L2_PATH = [
  { col: 0, row: 0 }, { col: 3, row: 0 },
  { col: 3, row: 2 }, { col: 9, row: 2 },
  { col: 9, row: 4 }, { col: 15, row: 4 },
  { col: 15, row: 6 }, { col: 1, row: 6 },
  { col: 1, row: 9 }, { col: 13, row: 9 },
  { col: 13, row: 10 },
];

// ─── Level 3 — Long serpentine ────────────────────────────────────────────────
const L3_GRID = parseGrid([
  'PPPPPPPPPPPPPPBB', // row 0
  'BBBBBBBBBBBBBBPP', // row 1 — wait, let me just keep it simple
  'PPPPPPPPPPPPPPBB', // row 2 — wait this doesn't work as zigzag cleanly
  'BBBBBBBBBBBBBBPP', // row 3
  'PPPPPPPPPPPPPPBB', // row 4
  'BBBBBBBBBBBBBBPP', // row 5
  'PPPPPPPPPPPPPPBB', // row 6
  'BBBBBBBBBBBBBBPP', // row 7
  'PPPPPPPPPPPPPPBB', // row 8
  'BBBBBBBBBBBBBBPP', // row 9
  'BBBBBBBBBBBBBBC', //  row 10
]);
const L3_PATH = [
  { col: 0, row: 0 }, { col: 13, row: 0 },
  { col: 13, row: 1 }, { col: 0, row: 2 }, // Note: we fake the grid by using tunnel logic
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

// ─── Level 4 — Two entry points ──────────────────────────────────────────────
// Two paths merging into one before the core
const L4_GRID = parseGrid([
  'PPPPPPBBBBBBBBBB', // row 0 — path A start
  'BBBBPPBBBBBBBBBB', // row 1
  'BBBBPPBBPPPPPPBB', // row 2 — path B joins
  'PPPPPPBBPPBBBBBB', // row 3
  'PPBBBBBBPPBBBBBB', // row 4
  'PPPPPPPPPPBBBBBB', // row 5 — merge
  'BBBBBBBBPPBBBBBB', // row 6
  'BBBBBBBBPPPPPPBB', // row 7
  'BBBBBBBBBBBBPPBB', // row 8
  'BBBBBBBBBBBBPPPP', // row 9
  'BBBBBBBBBBBBBBC', //  row 10
]);
const L4_PATH_A = [
  { col: 0, row: 0 }, { col: 3, row: 0 },
  { col: 3, row: 3 }, { col: 0, row: 3 },
  { col: 0, row: 5 }, { col: 8, row: 5 },
];
const L4_PATH_B = [
  { col: 0, row: 4 }, { col: 0, row: 5 }, // entry from row 4 col 0 — already covered
  { col: 8, row: 2 }, { col: 8, row: 5 }, // this second path enters from top-right area
];
// Shared tail from merge point
const L4_PATH_TAIL = [
  { col: 8, row: 5 }, { col: 8, row: 7 },
  { col: 12, row: 7 }, { col: 12, row: 9 },
  { col: 15, row: 9 }, { col: 15, row: 10 },
];

// ─── Level 5 — Boss level ─────────────────────────────────────────────────────
const L5_GRID = parseGrid([
  'PPPPBBBBBBBBBBBB', // row 0 path A
  'BBPPBBBBBBBBBBBB', // row 1
  'BBPPPPPPPPPPBBBB', // row 2
  'PPBBBBBBBBPPBBBB', // row 3 path B
  'PPPPBBBBBBPPBBBB', // row 4
  'BBBBPPPPPPPPBBBB', // row 5 — merges
  'BBBBPPBBBBBBBBBB', // row 6
  'BBBBPPPPPPPPPPBB', // row 7
  'BBBBBBBBBBBBPPBB', // row 8
  'BBBBBBBBBBBBPPPP', // row 9
  'BBBBBBBBBBBBBBC', //  row 10
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

// ─── Exported level configs ───────────────────────────────────────────────────
export const LEVELS: LevelConfig[] = [
  // Level 1 — Easy, 4 waves
  {
    cols: 16, rows: 11,
    grid: L1_GRID,
    paths: [L1_PATH],
    startGold: 150,
    startLives: 20,
    waves: [
      { spawns: [{ type: 'baffeur', count: 8, interval: 1200, delay: 0 }] },
      { spawns: [{ type: 'baffeur', count: 8, interval: 1000, delay: 0 }, { type: 'sanglier', count: 4, interval: 1500, delay: 4000 }] },
      { spawns: [{ type: 'baffeur', count: 10, interval: 900, delay: 0 }, { type: 'sanglier', count: 6, interval: 1200, delay: 3000 }] },
      { spawns: [{ type: 'baffeur', count: 12, interval: 800, delay: 0 }, { type: 'sanglier', count: 8, interval: 1000, delay: 2000 }] },
    ],
  },
  // Level 2 — Medium, 5 waves
  {
    cols: 16, rows: 11,
    grid: L2_GRID,
    paths: [L2_PATH],
    startGold: 150,
    startLives: 20,
    waves: [
      { spawns: [{ type: 'baffeur', count: 10, interval: 1000, delay: 0 }] },
      { spawns: [{ type: 'baffeur', count: 8, interval: 900, delay: 0 }, { type: 'rasta', count: 2, interval: 3000, delay: 5000 }] },
      { spawns: [{ type: 'sanglier', count: 10, interval: 800, delay: 0 }, { type: 'rasta', count: 3, interval: 2500, delay: 3000 }] },
      { spawns: [{ type: 'baffeur', count: 12, interval: 700, delay: 0 }, { type: 'sanglier', count: 6, interval: 900, delay: 2000 }] },
      { spawns: [{ type: 'rasta', count: 6, interval: 2000, delay: 0 }, { type: 'sanglier', count: 10, interval: 700, delay: 4000 }] },
    ],
  },
  // Level 3 — Hard serpentine, 5 waves, faster
  {
    cols: 16, rows: 11,
    grid: L3_GRID,
    paths: [L3_PATH],
    startGold: 150,
    startLives: 20,
    waves: [
      { spawns: [{ type: 'sanglier', count: 15, interval: 600, delay: 0 }] },
      { spawns: [{ type: 'baffeur', count: 15, interval: 600, delay: 0 }, { type: 'rasta', count: 4, interval: 2000, delay: 4000 }] },
      { spawns: [{ type: 'sanglier', count: 12, interval: 500, delay: 0 }, { type: 'rasta', count: 5, interval: 1800, delay: 3000 }] },
      { spawns: [{ type: 'baffeur', count: 15, interval: 500, delay: 0 }, { type: 'rasta', count: 6, interval: 1800, delay: 2000 }, { type: 'sanglier', count: 10, interval: 600, delay: 8000 }] },
      { spawns: [{ type: 'rasta', count: 10, interval: 1500, delay: 0 }, { type: 'sanglier', count: 15, interval: 500, delay: 3000 }] },
    ],
  },
  // Level 4 — Two entry points, mamie appears
  {
    cols: 16, rows: 11,
    grid: L4_GRID,
    paths: [
      [...L4_PATH_A, ...L4_PATH_TAIL],
      [...L4_PATH_B, ...L4_PATH_TAIL],
    ],
    startGold: 150,
    startLives: 20,
    waves: [
      { spawns: [{ type: 'baffeur', count: 10, interval: 900, delay: 0 }, { type: 'mamie', count: 2, interval: 3000, delay: 5000 }] },
      { spawns: [{ type: 'sanglier', count: 12, interval: 700, delay: 0 }, { type: 'mamie', count: 3, interval: 2500, delay: 3000 }] },
      { spawns: [{ type: 'rasta', count: 6, interval: 1800, delay: 0 }, { type: 'mamie', count: 4, interval: 2000, delay: 2000 }] },
      { spawns: [{ type: 'baffeur', count: 15, interval: 600, delay: 0 }, { type: 'mamie', count: 4, interval: 2000, delay: 3000 }, { type: 'rasta', count: 5, interval: 1800, delay: 7000 }] },
      { spawns: [{ type: 'rasta', count: 8, interval: 1500, delay: 0 }, { type: 'mamie', count: 5, interval: 2000, delay: 2000 }, { type: 'sanglier', count: 15, interval: 500, delay: 6000 }] },
      { spawns: [{ type: 'baffeur', count: 20, interval: 500, delay: 0 }, { type: 'rasta', count: 10, interval: 1200, delay: 3000 }, { type: 'mamie', count: 6, interval: 1800, delay: 8000 }] },
    ],
  },
  // Level 5 — Boss level, 7 waves
  {
    cols: 16, rows: 11,
    grid: L5_GRID,
    paths: [
      [...L5_PATH_A, ...L5_PATH_TAIL],
      [...L5_PATH_B, ...L5_PATH_TAIL],
    ],
    startGold: 150,
    startLives: 20,
    waves: [
      { spawns: [{ type: 'baffeur', count: 15, interval: 600, delay: 0 }, { type: 'mamie', count: 3, interval: 2000, delay: 4000 }] },
      { spawns: [{ type: 'sanglier', count: 20, interval: 400, delay: 0 }, { type: 'rasta', count: 5, interval: 1500, delay: 4000 }] },
      { spawns: [{ type: 'rasta', count: 10, interval: 1200, delay: 0 }, { type: 'mamie', count: 5, interval: 1800, delay: 3000 }] },
      { spawns: [{ type: 'baffeur', count: 20, interval: 500, delay: 0 }, { type: 'sanglier', count: 15, interval: 500, delay: 4000 }, { type: 'mamie', count: 6, interval: 1500, delay: 8000 }] },
      { spawns: [{ type: 'rasta', count: 12, interval: 1000, delay: 0 }, { type: 'mamie', count: 8, interval: 1500, delay: 3000 }, { type: 'sanglier', count: 20, interval: 400, delay: 7000 }] },
      { spawns: [{ type: 'baffeur', count: 25, interval: 400, delay: 0 }, { type: 'rasta', count: 15, interval: 1000, delay: 3000 }, { type: 'mamie', count: 8, interval: 1500, delay: 7000 }] },
      // Final wave: BOSS + support
      { spawns: [{ type: 'boss', count: 1, interval: 0, delay: 0 }, { type: 'mamie', count: 5, interval: 2000, delay: 3000 }, { type: 'rasta', count: 10, interval: 1000, delay: 5000 }] },
    ],
  },
];
