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

export const PIECES: Record<TetrominoType, { cells: [number, number][]; emoji: string; color: string; label: string }> = {
  I: { cells: [[-1,0],[0,0],[1,0],[2,0]], emoji: '🚬', color: '#7CFC00', label: 'spliff' },
  O: { cells: [[0,0],[0,1],[1,0],[1,1]],  emoji: '🍺', color: '#FFD700', label: 'bédot' },
  T: { cells: [[0,-1],[0,0],[0,1],[-1,0]], emoji: '🌲', color: '#228B22', label: 'sapin' },
  S: { cells: [[0,0],[0,1],[-1,-1],[-1,0]], emoji: '🌿', color: '#32CD32', label: 'herbe' },
  Z: { cells: [[-1,0],[-1,1],[0,-1],[0,0]], emoji: '🍄', color: '#DC143C', label: 'champi' },
  J: { cells: [[-1,-1],[0,-1],[0,0],[0,1]], emoji: '❄️', color: '#87CEEB', label: 'neige' },
  L: { cells: [[-1,1],[0,-1],[0,0],[0,1]],  emoji: '🪵', color: '#FFA500', label: 'bûche' },
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
