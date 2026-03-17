import type { DifficultyLevel } from '@/lib/types';

export type Cell = 'wall' | 'dot' | 'power' | 'empty';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Pos { row: number; col: number; }

// Base maze template (0=wall, 1=dot, 2=power pellet, 3=empty/ghost house)
const MAZE_TEMPLATE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
  [0,2,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,2,0],
  [0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,3,3,3,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,3,3,3,3,3,3,3,0,1,0,0,0,0],
  [1,1,1,1,1,1,3,3,3,3,3,3,3,1,1,1,1,1,1],
  [0,0,0,0,1,0,3,3,3,3,3,3,3,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
  [0,2,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,2,0],
  [0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
  [0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

export const ROWS = MAZE_TEMPLATE.length;
export const COLS = MAZE_TEMPLATE[0].length;

export function buildMaze(): Cell[][] {
  return MAZE_TEMPLATE.map((row) =>
    row.map((cell) => {
      if (cell === 0) return 'wall';
      if (cell === 1) return 'dot';
      if (cell === 2) return 'power';
      return 'empty';
    })
  );
}

export function countDots(maze: Cell[][]): number {
  return maze.flat().filter((c) => c === 'dot' || c === 'power').length;
}

// Ghost speed multiplier per level
export const GHOST_SPEED: Record<DifficultyLevel, number> = {
  1: 800,
  2: 600,
  3: 450,
  4: 300,
  5: 200,
};

export const PACMAN_SPEED: Record<DifficultyLevel, number> = {
  1: 200,
  2: 175,
  3: 150,
  4: 130,
  5: 110,
};

export const GHOST_COUNT: Record<DifficultyLevel, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 4,
};

export const GHOST_EMOJIS = ['👻', '🎃', '💀', '👿'];

export interface GhostState {
  pos: Pos;
  dir: Direction;
  scared: boolean;
  emoji: string;
}

export function getNeighbors(maze: Cell[][], pos: Pos): { dir: Direction; pos: Pos }[] {
  const dirs: { dir: Direction; dr: number; dc: number }[] = [
    { dir: 'up', dr: -1, dc: 0 },
    { dir: 'down', dr: 1, dc: 0 },
    { dir: 'left', dr: 0, dc: -1 },
    { dir: 'right', dr: 0, dc: 1 },
  ];
  return dirs
    .map(({ dir, dr, dc }) => ({ dir, pos: { row: pos.row + dr, col: pos.col + dc } }))
    .filter(({ pos: p }) =>
      p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS &&
      maze[p.row][p.col] !== 'wall'
    );
}

export function moveGhost(
  maze: Cell[][],
  ghost: GhostState,
  pacPos: Pos,
  scared: boolean
): GhostState {
  const neighbors = getNeighbors(maze, ghost.pos);
  if (neighbors.length === 0) return ghost;

  let chosen: { dir: Direction; pos: Pos };
  if (scared) {
    // Run away from pacman
    chosen = neighbors.reduce((best, n) => {
      const distBest = Math.abs(best.pos.row - pacPos.row) + Math.abs(best.pos.col - pacPos.col);
      const distN = Math.abs(n.pos.row - pacPos.row) + Math.abs(n.pos.col - pacPos.col);
      return distN > distBest ? n : best;
    });
  } else {
    // Chase with 70% probability, random 30%
    if (Math.random() < 0.7) {
      chosen = neighbors.reduce((best, n) => {
        const distBest = Math.abs(best.pos.row - pacPos.row) + Math.abs(best.pos.col - pacPos.col);
        const distN = Math.abs(n.pos.row - pacPos.row) + Math.abs(n.pos.col - pacPos.col);
        return distN < distBest ? n : best;
      });
    } else {
      chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
    }
  }

  return { ...ghost, pos: chosen.pos, dir: chosen.dir, scared };
}
