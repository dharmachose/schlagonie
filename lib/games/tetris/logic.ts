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

// Rasta color palette: rouge / jaune-or / vert (3 nuances de chaque)
export const PIECES: Record<TetrominoType, { cells: [number, number][]; color: string; highlight: string }> = {
  I: { cells: [[-1,0],[0,0],[1,0],[2,0]], color: '#00C851', highlight: '#00FF66' }, // vert vif
  O: { cells: [[0,0],[0,1],[1,0],[1,1]],  color: '#FFD700', highlight: '#FFF04D' }, // or
  T: { cells: [[0,-1],[0,0],[0,1],[-1,0]], color: '#E8212E', highlight: '#FF5566' }, // rouge
  S: { cells: [[0,0],[0,1],[-1,-1],[-1,0]], color: '#22AA44', highlight: '#44DD66' }, // vert forêt
  Z: { cells: [[-1,0],[-1,1],[0,-1],[0,0]], color: '#CC0022', highlight: '#FF3344' }, // rouge foncé
  J: { cells: [[-1,-1],[0,-1],[0,0],[0,1]], color: '#FFCC00', highlight: '#FFE84D' }, // jaune
  L: { cells: [[-1,1],[0,-1],[0,0],[0,1]],  color: '#FF6600', highlight: '#FF9933' }, // orange-rouge
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
