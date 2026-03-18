import type { DifficultyLevel } from '@/lib/types';

// Gem types (Vosges themed)
export const GEMS = ['🌲', '👋', '🥤', '🌿', '❄️', '🍄', '⛰️'];

// Number of gem types and target score per level
export const LEVEL_CONFIG: Record<DifficultyLevel, { gemTypes: number; gridSize: number; targetScore: number }> = {
  1: { gemTypes: 4, gridSize: 6, targetScore: 300 },
  2: { gemTypes: 5, gridSize: 7, targetScore: 600 },
  3: { gemTypes: 5, gridSize: 8, targetScore: 1000 },
  4: { gemTypes: 6, gridSize: 8, targetScore: 1500 },
  5: { gemTypes: 7, gridSize: 9, targetScore: 2500 },
};

export type Grid = (string | null)[][];

export function buildGrid(level: DifficultyLevel): Grid {
  const { gridSize, gemTypes } = LEVEL_CONFIG[level];
  const availableGems = GEMS.slice(0, gemTypes);
  let grid: Grid;
  // Keep rebuilding until no initial matches
  do {
    grid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => availableGems[Math.floor(Math.random() * availableGems.length)])
    );
  } while (findMatches(grid).length > 0);
  return grid;
}

export interface Match {
  cells: [number, number][];
}

export function findMatches(grid: Grid): Match[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const matched = new Set<string>();
  const matches: Match[] = [];

  // Horizontal
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols - 2) {
      const gem = grid[r][c];
      if (gem && grid[r][c + 1] === gem && grid[r][c + 2] === gem) {
        let len = 3;
        while (c + len < cols && grid[r][c + len] === gem) len++;
        const cells: [number, number][] = Array.from({ length: len }, (_, i) => [r, c + i]);
        cells.forEach(([rr, cc]) => matched.add(`${rr},${cc}`));
        matches.push({ cells });
        c += len;
      } else {
        c++;
      }
    }
  }

  // Vertical
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows - 2) {
      const gem = grid[r][c];
      if (gem && grid[r + 1][c] === gem && grid[r + 2][c] === gem) {
        let len = 3;
        while (r + len < rows && grid[r + len][c] === gem) len++;
        const cells: [number, number][] = Array.from({ length: len }, (_, i) => [r + i, c]);
        cells.forEach(([rr, cc]) => matched.add(`${rr},${cc}`));
        matches.push({ cells });
        r += len;
      } else {
        r++;
      }
    }
  }

  return matches;
}

export function removeMatches(grid: Grid, matches: Match[]): { grid: Grid; points: number } {
  const newGrid = grid.map((r) => [...r]);
  let points = 0;
  matches.forEach(({ cells }) => {
    cells.forEach(([r, c]) => { newGrid[r][c] = null; });
    points += cells.length * 10 + Math.max(0, (cells.length - 3)) * 20;
  });
  return { grid: newGrid, points };
}

export function applyGravity(grid: Grid, gemTypes: number, availableGems: string[]): Grid {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid = grid.map((r) => [...r]);

  for (let c = 0; c < cols; c++) {
    // Drop existing gems
    const existing = newGrid.map((r) => r[c]).filter(Boolean) as string[];
    const fill = rows - existing.length;
    const newCol = [
      ...Array.from({ length: fill }, () => availableGems[Math.floor(Math.random() * gemTypes)]),
      ...existing,
    ];
    for (let r = 0; r < rows; r++) newGrid[r][c] = newCol[r];
  }
  return newGrid;
}

export function canSwap(grid: Grid, r1: number, c1: number, r2: number, c2: number): boolean {
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false;
  const newGrid = grid.map((r) => [...r]);
  [newGrid[r1][c1], newGrid[r2][c2]] = [newGrid[r2][c2], newGrid[r1][c1]];
  return findMatches(newGrid).length > 0;
}
