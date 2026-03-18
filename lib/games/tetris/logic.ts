import type { DifficultyLevel } from '@/lib/types';

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;

export const DROP_SPEED: Record<DifficultyLevel, number> = {
  1: 800,
  2: 500,
  3: 300,
  4: 180,
  5: 100,
};

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Essences des Vosges — chaque pièce = un bois différent
export const PIECES: Record<TetrominoType, {
  cells: [number, number][];
  color: string;
  highlight: string;
  wood: { bg: string; border: string };
}> = {
  // I — Pin des Vosges : grain long, jaune-brun clair
  I: {
    cells: [[-1,0],[0,0],[1,0],[2,0]],
    color: '#C8A06E', highlight: '#DEB887',
    wood: {
      bg: `repeating-linear-gradient(87deg, transparent 0, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 7px), linear-gradient(175deg, #DEB887 0%, #C8A06E 45%, #A0784A 100%)`,
      border: '#C8A06E',
    },
  },
  // O — Chêne : coupe transversale avec cernes concentriques
  O: {
    cells: [[0,0],[0,1],[1,0],[1,1]],
    color: '#8B5E3C', highlight: '#A0724E',
    wood: {
      bg: `repeating-radial-gradient(ellipse at 50% 50%, transparent 0, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 3px), linear-gradient(145deg, #A0724E 0%, #8B5E3C 50%, #6B3E26 100%)`,
      border: '#8B5E3C',
    },
  },
  // T — Noyer : grain dense, chocolat foncé
  T: {
    cells: [[0,-1],[0,0],[0,1],[-1,0]],
    color: '#5C3317', highlight: '#7A4A22',
    wood: {
      bg: `repeating-linear-gradient(86deg, transparent 0, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 3px, transparent 3px, transparent 5px), linear-gradient(175deg, #7A4A22 0%, #5C3317 50%, #3D2108 100%)`,
      border: '#7A4A22',
    },
  },
  // S — Bouleau : crème ivoire avec marques sombres d'écorce
  S: {
    cells: [[0,0],[0,1],[-1,-1],[-1,0]],
    color: '#C4A882', highlight: '#F5ECD8',
    wood: {
      bg: `repeating-linear-gradient(88deg, transparent 0, transparent 4px, rgba(80,50,20,0.12) 4px, rgba(80,50,20,0.12) 5px, transparent 5px, transparent 10px), repeating-linear-gradient(92deg, transparent 0, transparent 8px, rgba(80,50,20,0.06) 8px, rgba(80,50,20,0.06) 9px), linear-gradient(175deg, #F5ECD8 0%, #E8D5B7 40%, #C4A882 100%)`,
      border: '#C4A882',
    },
  },
  // Z — Cerisier : brun-rouge chaleureux
  Z: {
    cells: [[-1,0],[-1,1],[0,-1],[0,0]],
    color: '#8B3A3A', highlight: '#A84D4D',
    wood: {
      bg: `repeating-linear-gradient(87deg, transparent 0, transparent 3px, rgba(0,0,0,0.09) 3px, rgba(0,0,0,0.09) 4px, transparent 4px, transparent 6px), linear-gradient(175deg, #A84D4D 0%, #8B3A3A 50%, #6B2424 100%)`,
      border: '#A84D4D',
    },
  },
  // J — Érable : très clair, grain très fin
  J: {
    cells: [[-1,-1],[0,-1],[0,0],[0,1]],
    color: '#D4A574', highlight: '#E8C49A',
    wood: {
      bg: `repeating-linear-gradient(88deg, transparent 0, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 3px, transparent 3px, transparent 5px), linear-gradient(175deg, #E8C49A 0%, #D4A574 45%, #B88050 100%)`,
      border: '#D4A574',
    },
  },
  // L — Mélèze : brun-orange ambré, résineux
  L: {
    cells: [[-1,1],[0,-1],[0,0],[0,1]],
    color: '#9C6B32', highlight: '#BA8346',
    wood: {
      bg: `repeating-linear-gradient(86deg, transparent 0, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px, transparent 4px, transparent 8px), linear-gradient(175deg, #BA8346 0%, #9C6B32 50%, #7A4F1E 100%)`,
      border: '#BA8346',
    },
  },
};

// Board stores TetrominoType so we can retrieve color + emoji on render
export type Board = (TetrominoType | null)[][];

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

export interface Tetromino {
  type: TetrominoType;
  row: number;
  col: number;
  cells: [number, number][];
}

export function randomPiece(): Tetromino {
  const types = Object.keys(PIECES) as TetrominoType[];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    row: 0,
    col: Math.floor(BOARD_COLS / 2),
    cells: PIECES[type].cells,
  };
}

export function rotate(cells: [number, number][]): [number, number][] {
  return cells.map(([r, c]) => [-c, r] as [number, number]);
}

export function isValid(board: Board, cells: [number, number][], row: number, col: number): boolean {
  return cells.every(([dr, dc]) => {
    const nr = row + dr;
    const nc = col + dc;
    // Cells above the board are allowed (piece entering from top)
    if (nr < 0) return true;
    return nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS && board[nr][nc] === null;
  });
}

export function placePiece(board: Board, piece: Tetromino): Board {
  const newBoard = board.map((r) => [...r]);
  piece.cells.forEach(([dr, dc]) => {
    const nr = piece.row + dr;
    const nc = piece.col + dc;
    if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
      newBoard[nr][nc] = piece.type;
    }
  });
  return newBoard;
}

export function clearLines(board: Board): { board: Board; linesCleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const linesCleared = BOARD_ROWS - remaining.length;
  const newBoard = [
    ...Array.from({ length: linesCleared }, () => Array(BOARD_COLS).fill(null)),
    ...remaining,
  ];
  return { board: newBoard as Board, linesCleared };
}

export function scoreLines(lines: number): number {
  return [0, 100, 300, 500, 800][Math.min(lines, 4)];
}
