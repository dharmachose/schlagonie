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

// ═══════════════════════════════════════════════════════════════════════════════
// All levels are 9 cols × 16 rows (portrait) for mobile-first layout.
// Enemies enter from the top, core at the bottom.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Level 1 — Simple Z-path ────────────────────────────────────────────────
// Enter top col 4, Z down-left then down-right to core
const L1_GRID = parseGrid([
  'BBBBPBBBB', // row 0   enter col 4
  'BBBBPBBBB', // row 1
  'BBBBPBBBB', // row 2
  'BBBBPBBBB', // row 3
  'BPPPPBBBB', // row 4   left (cols 1-4)
  'BPBBBBBBB', // row 5   down col 1
  'BPBBBBBBB', // row 6
  'BPBBBBBBB', // row 7
  'BPBBBBBBB', // row 8
  'BPPPPPPBB', // row 9   right (cols 1-6)
  'BBBBBBPBB', // row 10  down col 6
  'BBBBBBPBB', // row 11
  'BBBBBBPBB', // row 12
  'BBBBBBPBB', // row 13
  'BBBBBBPBB', // row 14
  'BBBBBBCBB', // row 15  core col 6
]);
const L1_PATH = [
  { col: 4, row: 0 }, { col: 4, row: 4 },
  { col: 1, row: 4 }, { col: 1, row: 9 },
  { col: 6, row: 9 }, { col: 6, row: 15 },
];

// ─── Level 2 — Extended zigzag ──────────────────────────────────────────────
// Enter top col 4, zigzag left-right-left-right down to core
const L2_GRID = parseGrid([
  'BBBBPBBBB', // row 0   enter col 4
  'BBBBPBBBB', // row 1
  'BPPPPBBBB', // row 2   left (cols 1-4)
  'BPBBBBBBB', // row 3   down col 1
  'BPBBBBBBB', // row 4
  'BPPPPPPPB', // row 5   right (cols 1-7)
  'BBBBBBBPB', // row 6   down col 7
  'BBBBBBBPB', // row 7
  'BPPPPPPPB', // row 8   left (cols 1-7)
  'BPBBBBBBB', // row 9   down col 1
  'BPBBBBBBB', // row 10
  'BPPPPPPPB', // row 11  right (cols 1-7)
  'BBBBBBBPB', // row 12  down col 7
  'BBBBBBBPB', // row 13
  'BBBBBBBPB', // row 14
  'BBBBBBBCB', // row 15  core col 7
]);
const L2_PATH = [
  { col: 4, row: 0 }, { col: 4, row: 2 },
  { col: 1, row: 2 }, { col: 1, row: 5 },
  { col: 7, row: 5 }, { col: 7, row: 8 },
  { col: 1, row: 8 }, { col: 1, row: 11 },
  { col: 7, row: 11 }, { col: 7, row: 15 },
];

// ─── Level 3 — Full serpentine ──────────────────────────────────────────────
// Enter top-left col 1, serpentine all the way down
const L3_GRID = parseGrid([
  'BPPPPPPPB', // row 0   right (cols 1-7)
  'BBBBBBBPB', // row 1   down col 7
  'BPPPPPPPB', // row 2   left (cols 1-7)
  'BPBBBBBBB', // row 3   down col 1
  'BPPPPPPPB', // row 4   right (cols 1-7)
  'BBBBBBBPB', // row 5   down col 7
  'BPPPPPPPB', // row 6   left (cols 1-7)
  'BPBBBBBBB', // row 7   down col 1
  'BPPPPPPPB', // row 8   right (cols 1-7)
  'BBBBBBBPB', // row 9   down col 7
  'BPPPPPPPB', // row 10  left (cols 1-7)
  'BPBBBBBBB', // row 11  down col 1
  'BPPPPPPPB', // row 12  right (cols 1-7)
  'BBBBBBBPB', // row 13  down col 7
  'BBBBBBBPB', // row 14
  'BBBBBBBCB', // row 15  core col 7
]);
const L3_PATH = [
  { col: 1, row: 0 }, { col: 7, row: 0 },
  { col: 7, row: 2 }, { col: 1, row: 2 },
  { col: 1, row: 4 }, { col: 7, row: 4 },
  { col: 7, row: 6 }, { col: 1, row: 6 },
  { col: 1, row: 8 }, { col: 7, row: 8 },
  { col: 7, row: 10 }, { col: 1, row: 10 },
  { col: 1, row: 12 }, { col: 7, row: 12 },
  { col: 7, row: 15 },
];

// ─── Level 4 — Two entry points ─────────────────────────────────────────────
// Path A enters top-left col 0, Path B enters top-right col 6.
// They merge at row 3, then zigzag down to core.
const L4_GRID = parseGrid([
  'PBBBBBPBB', // row 0   A col 0, B col 6
  'PBBBBBPBB', // row 1
  'PBBBBBPBB', // row 2
  'PPPPPPPBB', // row 3   merge (cols 0-6)
  'BBBBBBPBB', // row 4   down col 6
  'BBBBBBPBB', // row 5
  'BPPPPPPBB', // row 6   left (cols 1-6)
  'BPBBBBBBB', // row 7   down col 1
  'BPBBBBBBB', // row 8
  'BPPPPPPPB', // row 9   right (cols 1-7)
  'BBBBBBBPB', // row 10  down col 7
  'BBBBBBBPB', // row 11
  'BPPPPPPPB', // row 12  left (cols 1-7)
  'BPBBBBBBB', // row 13  down col 1
  'BPPPPBBBB', // row 14  right (cols 1-4)
  'BBBBCBBBB', // row 15  core col 4
]);
const L4_PATH_A = [
  { col: 0, row: 0 }, { col: 0, row: 3 },
  { col: 6, row: 3 }, { col: 6, row: 6 },
  { col: 1, row: 6 }, { col: 1, row: 9 },
  { col: 7, row: 9 }, { col: 7, row: 12 },
  { col: 1, row: 12 }, { col: 1, row: 14 },
  { col: 4, row: 14 }, { col: 4, row: 15 },
];
const L4_PATH_B = [
  { col: 6, row: 0 }, { col: 6, row: 6 },
  { col: 1, row: 6 }, { col: 1, row: 9 },
  { col: 7, row: 9 }, { col: 7, row: 12 },
  { col: 1, row: 12 }, { col: 1, row: 14 },
  { col: 4, row: 14 }, { col: 4, row: 15 },
];

// ─── Level 5 — Boss level, two entries ──────────────────────────────────────
// Path A enters top-left col 1, Path B enters top-right col 7.
// Dense serpentine after merge.
const L5_GRID = parseGrid([
  'BPBBBBBPB', // row 0   A col 1, B col 7
  'BPBBBBBPB', // row 1
  'BPPPPPPPB', // row 2   merge (cols 1-7)
  'BBBBBBBPB', // row 3   down col 7
  'BPPPPPPPB', // row 4   left (cols 1-7)
  'BPBBBBBBB', // row 5   down col 1
  'BPPPPPPPB', // row 6   right (cols 1-7)
  'BBBBBBBPB', // row 7   down col 7
  'BPPPPPPPB', // row 8   left (cols 1-7)
  'BPBBBBBBB', // row 9   down col 1
  'BPPPPPPPB', // row 10  right (cols 1-7)
  'BBBBBBBPB', // row 11  down col 7
  'BPPPPPPPB', // row 12  left (cols 1-7)
  'BPBBBBBBB', // row 13  down col 1
  'BPPPPPPPB', // row 14  right (cols 1-7)
  'BBBBBBBCB', // row 15  core col 7
]);
const L5_PATH_A = [
  { col: 1, row: 0 }, { col: 1, row: 2 },
  { col: 7, row: 2 }, { col: 7, row: 4 },
  { col: 1, row: 4 }, { col: 1, row: 6 },
  { col: 7, row: 6 }, { col: 7, row: 8 },
  { col: 1, row: 8 }, { col: 1, row: 10 },
  { col: 7, row: 10 }, { col: 7, row: 12 },
  { col: 1, row: 12 }, { col: 1, row: 14 },
  { col: 7, row: 14 }, { col: 7, row: 15 },
];
const L5_PATH_B = [
  { col: 7, row: 0 }, { col: 7, row: 4 },
  { col: 1, row: 4 }, { col: 1, row: 6 },
  { col: 7, row: 6 }, { col: 7, row: 8 },
  { col: 1, row: 8 }, { col: 1, row: 10 },
  { col: 7, row: 10 }, { col: 7, row: 12 },
  { col: 1, row: 12 }, { col: 1, row: 14 },
  { col: 7, row: 14 }, { col: 7, row: 15 },
];

// ─── Exported level configs ───────────────────────────────────────────────────
export const LEVELS: LevelConfig[] = [
  // Level 1 — Easy, 4 waves
  {
    cols: 9, rows: 16,
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
    cols: 9, rows: 16,
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
    cols: 9, rows: 16,
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
    cols: 9, rows: 16,
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
    cols: 9, rows: 16,
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
