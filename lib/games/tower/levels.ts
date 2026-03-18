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
// Enemies enter left row 2, go right, turn down col 9-10, then right to core
const L1_GRID = parseGrid([
  'BBBBBBBBBBBBBBBB', // row 0
  'BBBBBBBBBBBBBBBB', // row 1
  'PPPPPPPPPPPBBBBB', // row 2  path right (cols 0-10)
  'BBBBBBBBBPPBBBBB', // row 3  vertical (cols 9-10)
  'BBBBBBBBBPPBBBBB', // row 4
  'BBBBBBBBBPPBBBBB', // row 5
  'BBBBBBBBBPPBBBBB', // row 6
  'BBBBBBBBBPPBBBBB', // row 7
  'BBBBBBBBBPPBBBBB', // row 8
  'BBBBBBBBBPPPPPPP', // row 9  path right (cols 9-15)
  'BBBBBBBBBBBBBBBC', // row 10 core at col 15
]);
const L1_PATH = [
  { col: 0, row: 2 }, { col: 9, row: 2 },
  { col: 9, row: 9 },
  { col: 15, row: 9 }, { col: 15, row: 10 },
];

// ─── Level 2 — Zigzag ────────────────────────────────────────────────────────
const L2_GRID = parseGrid([
  'PPPPPBBBBBBBBBBB', // row 0  enter right (cols 0-4)
  'BBBBPBBBBBBBBBBB', // row 1  down col 4
  'BBBBPPPPPPPBBBBB', // row 2  right (cols 4-10)
  'BBBBBBBBBBPBBBBB', // row 3  down col 10
  'BBBBBBBBBBPPPPPB', // row 4  right (cols 10-14)
  'BBBBBBBBBBBBBBPB', // row 5  down col 14
  'BPPPPPPPPPPPPPPB', // row 6  left (cols 1-14)
  'BPBBBBBBBBBBBBBB', // row 7  down col 1
  'BPBBBBBBBBBBBBBB', // row 8  down col 1
  'BPPPPPPPPPPPPPPP', // row 9  right (cols 1-15)
  'BBBBBBBBBBBBBBBC', // row 10 core at col 15
]);
const L2_PATH = [
  { col: 0, row: 0 }, { col: 4, row: 0 },
  { col: 4, row: 2 }, { col: 10, row: 2 },
  { col: 10, row: 4 }, { col: 14, row: 4 },
  { col: 14, row: 6 }, { col: 1, row: 6 },
  { col: 1, row: 9 }, { col: 15, row: 9 },
  { col: 15, row: 10 },
];

// ─── Level 3 — Serpentine ────────────────────────────────────────────────────
const L3_GRID = parseGrid([
  'PPPPPPPPPPPPPPBB', // row 0  right (cols 0-13)
  'BBBBBBBBBBBBBPBB', // row 1  down col 13
  'PPPPPPPPPPPPPPBB', // row 2  left (cols 0-13)
  'PBBBBBBBBBBBBBBB', // row 3  down col 0
  'PPPPPPPPPPPPPPBB', // row 4  right (cols 0-13)
  'BBBBBBBBBBBBBPBB', // row 5  down col 13
  'PPPPPPPPPPPPPPBB', // row 6  left (cols 0-13)
  'PBBBBBBBBBBBBBBB', // row 7  down col 0
  'PPPPPPPPPPPPPPPP', // row 8  right (cols 0-15)
  'BBBBBBBBBBBBBBBP', // row 9  down col 15
  'BBBBBBBBBBBBBBBC', // row 10 core at col 15
]);
const L3_PATH = [
  { col: 0, row: 0 }, { col: 13, row: 0 },
  { col: 13, row: 2 }, { col: 0, row: 2 },
  { col: 0, row: 4 }, { col: 13, row: 4 },
  { col: 13, row: 6 }, { col: 0, row: 6 },
  { col: 0, row: 8 }, { col: 15, row: 8 },
  { col: 15, row: 10 },
];

// ─── Level 4 — Two entry points ──────────────────────────────────────────────
// Path A enters top-left, path B enters mid-left. Both converge at row 9.
const L4_GRID = parseGrid([
  'PPPPPPPBBBBBBBBB', // row 0  path A enter (cols 0-6)
  'BBBBBBPBBBBBBBBB', // row 1  down col 6
  'BBBBBBPBBBBBBBBB', // row 2  down col 6
  'BBBBBBPBBBBBBBBB', // row 3  down col 6
  'BBBBBBPBBBBBBBBB', // row 4  down col 6
  'BBBBBBPPPPPBBBBB', // row 5  right (cols 6-10)
  'BBBBBBBBBBPBBBBB', // row 6  down col 10
  'PPPPPPPBBBPBBBBB', // row 7  path B enter (cols 0-6) + col 10
  'BBBBBBPBBBPBBBBB', // row 8  down col 6 + col 10
  'BBBBBBPPPPPPPPPP', // row 9  merge right (cols 6-15)
  'BBBBBBBBBBBBBBBC', // row 10 core at col 15
]);
const L4_PATH_A = [
  { col: 0, row: 0 }, { col: 6, row: 0 },
  { col: 6, row: 5 }, { col: 10, row: 5 },
  { col: 10, row: 9 }, { col: 15, row: 9 }, { col: 15, row: 10 },
];
const L4_PATH_B = [
  { col: 0, row: 7 }, { col: 6, row: 7 },
  { col: 6, row: 9 }, { col: 10, row: 9 },
  { col: 15, row: 9 }, { col: 15, row: 10 },
];

// ─── Level 5 — Boss level ─────────────────────────────────────────────────────
// Path A enters top-left, path B enters mid-left. Both merge on row 8.
const L5_GRID = parseGrid([
  'BBBBBBBBBBBBBBBB', // row 0
  'PPPPPPBBBBBBBBBB', // row 1  path A enter (cols 0-5)
  'BBBBBPBBBBBBBBBB', // row 2  down col 5
  'BBBBBPBBBBBBBBBB', // row 3  down col 5
  'BBBBBPPPPPPPBBBB', // row 4  right (cols 5-11)
  'BBBBBBBBBBBPBBBB', // row 5  down col 11
  'PPPPPPBBBBBPBBBB', // row 6  path B enter (cols 0-5) + col 11
  'BBBBBPBBBBBPBBBB', // row 7  down col 5 + col 11
  'BBBBBPPPPPPPPPPP', // row 8  merge right (cols 5-15)
  'BBBBBBBBBBBBBBBP', // row 9  down col 15
  'BBBBBBBBBBBBBBBC', // row 10 core at col 15
]);
const L5_PATH_A = [
  { col: 0, row: 1 }, { col: 5, row: 1 },
  { col: 5, row: 4 }, { col: 11, row: 4 },
  { col: 11, row: 8 }, { col: 15, row: 8 },
  { col: 15, row: 10 },
];
const L5_PATH_B = [
  { col: 0, row: 6 }, { col: 5, row: 6 },
  { col: 5, row: 8 }, { col: 11, row: 8 },
  { col: 15, row: 8 }, { col: 15, row: 10 },
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
  // Level 3 — Hard serpentine, 5 waves
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
    paths: [L4_PATH_A, L4_PATH_B],
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
    paths: [L5_PATH_A, L5_PATH_B],
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
