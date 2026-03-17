import type { DifficultyLevel } from '@/lib/types';

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;

// Drop speed in ms per row, per level
export const DROP_SPEED: Record<DifficultyLevel, number> = {
  1: 800,
  2: 500,
  3: 300,
  4: 180,
  5: 100,
};

// Shlagonie-themed pieces: still standard Tetrominos but named after Vosges things
// Shapes encoded as [row][col] offsets from pivot
export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export const PIECES: Record<TetrominoType, { cells: [number, number][]; emoji: string; color: string }> = {
  I: { cells: [[-1,0],[0,0],[1,0],[2,0]], emoji: '🪵', color: '#32CD32' }, // bûche
  O: { cells: [[0,0],[0,1],[1,0],[1,1]], emoji: '🍺', color: '#FFD700' }, // bédot
  T: { cells: [[0,-1],[0,0],[0,1],[-1,0]], emoji: '🌲', color: '#228B22' }, // sapin
  S: { cells: [[0,0],[0,1],[-1,-1],[-1,0]], emoji: '🌿', color: '#32CD32' }, // feuilles
  Z: { cells: [[-1,0],[-1,1],[0,-1],[0,0]], emoji: '🍄', color: '#DC143C' }, // champignon
  J: { cells: [[-1,-1],[0,-1],[0,0],[0,1]], emoji: '❄️', color: '#87CEEB' }, // neige
  L: { cells: [[-1,1],[0,-1],[0,0],[0,1]], emoji: '⛰️', color: '#FFA500' }, // montagne
};

export type Board = (string | null)[][];

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
    return nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS && board[nr][nc] === null;
  });
}

export function placePiece(board: Board, piece: Tetromino): Board {
  const newBoard = board.map((r) => [...r]);
  piece.cells.forEach(([dr, dc]) => {
    const nr = piece.row + dr;
    const nc = piece.col + dc;
    if (nr >= 0 && nr < BOARD_ROWS) {
      newBoard[nr][nc] = PIECES[piece.type].color;
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
  return { board: newBoard, linesCleared };
}

export function scoreLines(lines: number): number {
  return [0, 100, 300, 500, 800][Math.min(lines, 4)];
}
