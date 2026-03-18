import type { GameState, Ghost, GhostName, GhostMode, Direction, TilePos, Vec2 } from './types';
import { DIR_VECTORS, OPPOSITE_DIR, dist2, vecFromTile } from './types';
import { GHOST_COLORS, GHOST_EXIT_DELAYS, TUNNEL_SPEED_FACTOR, FRIGHTENED_SPEED_FACTOR, EATEN_SPEED_FACTOR, SCATTER_CHASE_SEQUENCE } from './config';

const ALL_DIRS: Direction[] = ['up', 'left', 'down', 'right'];

export function createGhosts(state: GameState): Ghost[] {
  const names: GhostName[] = ['blinky', 'pinky', 'inky', 'clyde'];
  const { mazeDef } = state;
  const { rows, cols } = mazeDef;

  const scatterTargets: Record<GhostName, TilePos> = {
    blinky: { row: 0, col: cols - 1 },
    pinky: { row: 0, col: 0 },
    inky: { row: rows - 1, col: cols - 1 },
    clyde: { row: rows - 1, col: 0 },
  };

  return names.slice(0, state.ghosts.length || 4).map((name, i) => {
    const spawn = mazeDef.ghostSpawns[i] || mazeDef.ghostSpawns[0];
    const isBlinky = name === 'blinky';
    return {
      name,
      pos: isBlinky ? vecFromTile(mazeDef.ghostHouseEntry) : vecFromTile(spawn),
      tilePos: isBlinky ? { ...mazeDef.ghostHouseEntry } : { ...spawn },
      dir: 'left' as Direction,
      nextDir: 'left' as Direction,
      mode: 'scatter' as GhostMode,
      prevMode: 'scatter' as GhostMode,
      color: GHOST_COLORS[name],
      scatterTarget: scatterTargets[name],
      speed: 0,
      exitDelay: isBlinky ? 0 : GHOST_EXIT_DELAYS[name],
      inHouse: !isBlinky,
      bobOffset: i * Math.PI * 0.5,
    };
  });
}

function isWalkable(state: GameState, pos: TilePos): boolean {
  const { maze, mazeDef } = state;
  if (pos.row < 0 || pos.row >= mazeDef.rows || pos.col < 0 || pos.col >= mazeDef.cols) {
    // Allow tunnel wrapping
    for (const t of mazeDef.tunnels) {
      if (pos.row === t.row) return true;
    }
    return false;
  }
  const tile = maze[pos.row][pos.col];
  return tile !== 'wall';
}

function isWalkableForGhost(state: GameState, pos: TilePos, ghost: Ghost): boolean {
  if (!isWalkable(state, pos)) return false;
  // Ghosts can't enter ghost house unless eaten
  if (ghost.mode !== 'eaten' && !ghost.inHouse) {
    const tile = state.maze[pos.row]?.[pos.col];
    if (tile === 'ghostHouse') return false;
  }
  return true;
}

function getGhostTarget(ghost: Ghost, state: GameState): TilePos {
  if (ghost.mode === 'scatter') return ghost.scatterTarget;
  if (ghost.mode === 'eaten') return state.mazeDef.ghostHouseEntry;

  if (ghost.mode === 'frightened') {
    // Random target
    return {
      row: Math.floor(Math.random() * state.mazeDef.rows),
      col: Math.floor(Math.random() * state.mazeDef.cols),
    };
  }

  // Chase mode — different per ghost
  const pac = state.pacman.tilePos;
  const pacDir = state.pacman.dir;
  const dv = DIR_VECTORS[pacDir];

  switch (ghost.name) {
    case 'blinky':
      return pac;

    case 'pinky':
      return { row: pac.row + dv.y * 4, col: pac.col + dv.x * 4 };

    case 'inky': {
      const ahead = { row: pac.row + dv.y * 2, col: pac.col + dv.x * 2 };
      const blinky = state.ghosts.find(g => g.name === 'blinky');
      if (!blinky) return pac;
      return {
        row: ahead.row + (ahead.row - blinky.tilePos.row),
        col: ahead.col + (ahead.col - blinky.tilePos.col),
      };
    }

    case 'clyde': {
      const d = Math.abs(ghost.tilePos.row - pac.row) + Math.abs(ghost.tilePos.col - pac.col);
      return d > 8 ? pac : ghost.scatterTarget;
    }

    default:
      return pac;
  }
}

function chooseBestDir(state: GameState, ghost: Ghost, target: TilePos): Direction {
  const { tilePos, dir } = ghost;
  const reverse = OPPOSITE_DIR[dir];

  let bestDir: Direction = dir;
  let bestDist = Infinity;

  for (const d of ALL_DIRS) {
    if (d === reverse) continue; // ghosts never reverse
    const dv = DIR_VECTORS[d];
    const nextTile: TilePos = { row: tilePos.row + dv.y, col: tilePos.col + dv.x };
    if (!isWalkableForGhost(state, nextTile, ghost)) continue;

    // Euclidean distance to target
    const dx = nextTile.col - target.col;
    const dy = nextTile.row - target.row;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = d;
    }
  }

  return bestDir;
}

function wrapTunnel(state: GameState, ghost: Ghost): void {
  for (const t of state.mazeDef.tunnels) {
    if (Math.round(ghost.pos.y) === t.row) {
      if (ghost.pos.x < t.leftCol - 0.5) {
        ghost.pos.x = t.rightCol + 0.5;
      } else if (ghost.pos.x > t.rightCol + 0.5) {
        ghost.pos.x = t.leftCol - 0.5;
      }
    }
  }
}

function isAtTileCenter(pos: Vec2): boolean {
  const dx = pos.x - Math.round(pos.x);
  const dy = pos.y - Math.round(pos.y);
  return Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05;
}

function isTunnelTile(state: GameState, pos: TilePos): boolean {
  const tile = state.maze[pos.row]?.[pos.col];
  return tile === 'tunnel';
}

export function updateGhost(ghost: Ghost, state: GameState, dt: number): void {
  const cfg = state;

  // Handle ghost in house
  if (ghost.inHouse) {
    ghost.exitDelay -= dt * 1000;
    // Bob up and down
    ghost.bobOffset += dt * 3;
    const spawn = state.mazeDef.ghostSpawns[0];
    ghost.pos.y = spawn.row + Math.sin(ghost.bobOffset) * 0.3;

    if (ghost.exitDelay <= 0) {
      ghost.inHouse = false;
      ghost.pos = { ...vecFromTile(state.mazeDef.ghostHouseEntry) };
      ghost.tilePos = { ...state.mazeDef.ghostHouseEntry };
      ghost.dir = 'left';
    }
    return;
  }

  // Handle eaten ghost returning to house
  if (ghost.mode === 'eaten') {
    const entry = state.mazeDef.ghostHouseEntry;
    const target = vecFromTile(entry);
    const d = dist2(ghost.pos, target);
    if (d < 0.1) {
      // Arrived at house
      ghost.mode = ghost.prevMode;
      ghost.inHouse = true;
      ghost.exitDelay = 500;
      const spawn = state.mazeDef.ghostSpawns[0];
      ghost.pos = vecFromTile(spawn);
      ghost.tilePos = { ...spawn };
      return;
    }
  }

  // Calculate speed
  let speed = ghost.speed;
  if (isTunnelTile(state, ghost.tilePos)) speed *= TUNNEL_SPEED_FACTOR;
  if (ghost.mode === 'frightened') speed *= FRIGHTENED_SPEED_FACTOR;
  if (ghost.mode === 'eaten') speed *= EATEN_SPEED_FACTOR;

  // At tile center: decide direction
  if (isAtTileCenter(ghost.pos)) {
    ghost.pos.x = Math.round(ghost.pos.x);
    ghost.pos.y = Math.round(ghost.pos.y);
    ghost.tilePos = { row: Math.round(ghost.pos.y), col: Math.round(ghost.pos.x) };

    const target = getGhostTarget(ghost, state);
    ghost.dir = chooseBestDir(state, ghost, target);
  }

  // Move
  const dv = DIR_VECTORS[ghost.dir];
  ghost.pos.x += dv.x * speed * dt;
  ghost.pos.y += dv.y * speed * dt;

  wrapTunnel(state, ghost);
  ghost.tilePos = { row: Math.round(ghost.pos.y), col: Math.round(ghost.pos.x) };
}

export function frightenAllGhosts(state: GameState): void {
  for (const g of state.ghosts) {
    if (g.inHouse) continue;
    if (g.mode === 'eaten') continue;
    g.prevMode = g.mode === 'frightened' ? g.prevMode : g.mode;
    g.mode = 'frightened';
    // Reverse direction
    g.dir = OPPOSITE_DIR[g.dir];
  }
  state.ghostCombo = 0;
}

export function updateScatterChase(state: GameState, dt: number): void {
  if (state.scaredTimer > 0) return; // don't advance during frighten

  state.scatterChaseTimer -= dt * 1000;
  if (state.scatterChaseTimer <= 0) {
    state.scatterChaseIndex = Math.min(state.scatterChaseIndex + 1, SCATTER_CHASE_SEQUENCE.length - 1);
    const phase = SCATTER_CHASE_SEQUENCE[state.scatterChaseIndex];
    state.isScatterMode = phase.mode === 'scatter';
    state.scatterChaseTimer = phase.duration;

    // Switch all non-frightened, non-eaten ghosts
    for (const g of state.ghosts) {
      if (g.mode === 'frightened' || g.mode === 'eaten' || g.inHouse) continue;
      const newMode: GhostMode = state.isScatterMode ? 'scatter' : 'chase';
      g.dir = OPPOSITE_DIR[g.dir]; // reverse on mode change
      g.mode = newMode;
      g.prevMode = newMode;
    }
  }
}

export function endFrightenedMode(state: GameState): void {
  const mode: GhostMode = state.isScatterMode ? 'scatter' : 'chase';
  for (const g of state.ghosts) {
    if (g.mode === 'frightened') {
      g.mode = mode;
      g.prevMode = mode;
    }
  }
}
