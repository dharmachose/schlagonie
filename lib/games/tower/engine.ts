import type { GameState, Enemy, Tower, Projectile, Particle, Tile, Pos, TargetingMode } from './types';
import type { LevelConfig, WaveConfig } from './types';
import { ENEMY_DEFS, ENEMY_LIVES_DAMAGE, TILE_SIZE } from './config';

let _idCounter = 0;
const uid = () => String(++_idCounter);

// ─── Pixel position of the CENTER of a tile ──────────────────────────────────
export function tileCenter(col: number, row: number): Pos {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

// ─── Distance between two positions ──────────────────────────────────────────
export function dist(a: Pos, b: Pos): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ─── Spawn one enemy at start of path ────────────────────────────────────────
export function spawnEnemy(
  type: Enemy['type'],
  pathIndex: number,
  paths: Tile[][],
  spawnDelay: number
): Enemy {
  const def = ENEMY_DEFS[type];
  const startTile = paths[pathIndex][0];
  return {
    ...def,
    id: uid(),
    pos: tileCenter(startTile.col, startTile.row),
    pathIndex,
    pathProgress: 0,
    alive: true,
    reached: false,
    slow: 1,
    slowTimer: 0,
    frozen: false,
    frozenTimer: 0,
    spawnDelay,
    spawned: false,
  };
}

// ─── Build enemy spawn queue from wave config ─────────────────────────────────
export function buildSpawnQueue(wave: WaveConfig, paths: Tile[][]): Enemy[] {
  const enemies: Enemy[] = [];
  const pathCount = paths.length;
  let pathRobin = 0;

  for (const entry of wave.spawns) {
    for (let i = 0; i < entry.count; i++) {
      const delay = entry.delay + i * entry.interval;
      const pathIdx = pathRobin % pathCount;
      enemies.push(spawnEnemy(entry.type, pathIdx, paths, delay));
      pathRobin++;
    }
  }

  return enemies.sort((a, b) => a.spawnDelay - b.spawnDelay);
}

// ─── Move enemy along its path ────────────────────────────────────────────────
function moveEnemy(enemy: Enemy, paths: Tile[][], dtMs: number): { reached: boolean } {
  const path = paths[enemy.pathIndex % paths.length];
  if (!path || path.length < 2) return { reached: false };

  const effectiveSpeed = enemy.frozen ? 0 : enemy.speed * enemy.slow;
  const dtSec = dtMs / 1000;
  let remainingDist = effectiveSpeed * dtSec;

  while (remainingDist > 0) {
    const wpIdx = Math.floor(enemy.pathProgress);
    if (wpIdx >= path.length - 1) {
      enemy.reached = true;
      return { reached: true };
    }

    const current = tileCenter(path[wpIdx].col, path[wpIdx].row);
    const next = tileCenter(path[wpIdx + 1].col, path[wpIdx + 1].row);
    const segLen = dist(current, next);
    const fracProgress = enemy.pathProgress - wpIdx;
    const distToNextWp = segLen * (1 - fracProgress);

    if (remainingDist >= distToNextWp) {
      remainingDist -= distToNextWp;
      enemy.pathProgress = wpIdx + 1;
    } else {
      const fraction = remainingDist / segLen;
      enemy.pathProgress += fraction;
      remainingDist = 0;
    }
  }

  const wpIdx = Math.min(Math.floor(enemy.pathProgress), path.length - 2);
  const frac = enemy.pathProgress - wpIdx;
  const a = tileCenter(path[wpIdx].col, path[wpIdx].row);
  const b = tileCenter(path[Math.min(wpIdx + 1, path.length - 1)].col, path[Math.min(wpIdx + 1, path.length - 1)].row);
  enemy.pos = {
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
  };

  return { reached: false };
}

// ─── Find best target for a tower based on targeting mode ────────────────────
export function findTarget(tower: Tower, enemies: Enemy[]): Enemy | null {
  const towerPos: Pos = tileCenter(tower.col, tower.row);
  const inRange: Enemy[] = [];

  for (const e of enemies) {
    if (!e.alive || !e.spawned || e.reached) continue;
    const d = dist(towerPos, e.pos);
    if (d <= tower.range) inRange.push(e);
  }

  if (inRange.length === 0) return null;

  const mode: TargetingMode = tower.targeting || 'farthest';

  switch (mode) {
    case 'farthest':
      return inRange.reduce((best, e) => e.pathProgress > best.pathProgress ? e : best);
    case 'closest':
      return inRange.reduce((best, e) => {
        const dBest = dist(towerPos, best.pos);
        const dE = dist(towerPos, e.pos);
        return dE < dBest ? e : best;
      });
    case 'strongest':
      return inRange.reduce((best, e) => e.hp > best.hp ? e : best);
    case 'weakest':
      return inRange.reduce((best, e) => e.hp < best.hp ? e : best);
    default:
      return inRange.reduce((best, e) => e.pathProgress > best.pathProgress ? e : best);
  }
}

// ─── Fire a projectile ────────────────────────────────────────────────────────
function fireProjectile(tower: Tower, target: Enemy, nowMs: number): Projectile {
  tower.lastShot = nowMs;
  return {
    id: uid(),
    pos: { ...tileCenter(tower.col, tower.row) },
    targetId: target.id,
    speed: 350,
    damage: tower.damage,
    aoe: tower.aoe,
    slow: tower.slow,
    freezeDuration: tower.freezeDuration,
    color: tower.color,
    dead: false,
  };
}

// ─── Apply AOE damage ─────────────────────────────────────────────────────────
function applyAoe(pos: Pos, radius: number, damage: number, enemies: Enemy[], particles: Particle[]) {
  for (const e of enemies) {
    if (!e.alive || e.reached) continue;
    if (dist(pos, e.pos) <= radius) {
      e.hp -= damage;
      if (e.hp <= 0) { e.alive = false; spawnDeathParticle(e, particles); }
    }
  }
  particles.push({ id: uid(), pos: { ...pos }, emoji: '💥', createdAt: Date.now(), duration: 500, scale: 1.5 });
}

function spawnDeathParticle(e: Enemy, particles: Particle[]) {
  particles.push({ id: uid(), pos: { ...e.pos }, emoji: e.emoji, createdAt: Date.now(), duration: 600, scale: 1 });
}

// ─── Mamie healing ────────────────────────────────────────────────────────────
const MAMIE_HEAL_RADIUS = 60;
const MAMIE_HEAL_RATE = 8; // HP/s

function applyMamieHealing(enemies: Enemy[], dtMs: number) {
  const mamies = enemies.filter(e => e.alive && e.spawned && !e.reached && e.type === 'mamie');
  for (const mamie of mamies) {
    for (const target of enemies) {
      if (!target.alive || target.reached || target.type === 'mamie') continue;
      if (dist(mamie.pos, target.pos) <= MAMIE_HEAL_RADIUS) {
        target.hp = Math.min(target.maxHp, target.hp + MAMIE_HEAL_RATE * dtMs / 1000);
      }
    }
  }
}

// ─── Main update ─────────────────────────────────────────────────────────────
export interface UpdateResult {
  livesLost: number;
  goldEarned: number;
  waveComplete: boolean;
  kills: Array<{ enemy: Enemy; pos: Pos }>;
  hits: Array<{ pos: Pos; aoe: boolean }>;
}

export function updateBattle(
  state: GameState,
  level: LevelConfig,
  dtMs: number,
  nowMs: number,
  elapsedWaveMs: number
): UpdateResult {
  let livesLost = 0;
  let goldEarned = 0;
  const kills: Array<{ enemy: Enemy; pos: Pos }> = [];
  const hits: Array<{ pos: Pos; aoe: boolean }> = [];

  // ── Spawn enemies ──
  for (const e of state.enemies) {
    if (!e.spawned && e.spawnDelay <= elapsedWaveMs) {
      e.spawned = true;
      const path = level.paths[e.pathIndex % level.paths.length];
      const startTile = path[0];
      e.pos = tileCenter(startTile.col, startTile.row);
    }
  }

  // ── Update timers (freeze/slow) ──
  for (const e of state.enemies) {
    if (!e.alive || !e.spawned) continue;
    if (e.frozenTimer > 0) {
      e.frozenTimer = Math.max(0, e.frozenTimer - dtMs);
      e.frozen = e.frozenTimer > 0;
    }
    if (e.slowTimer > 0) {
      e.slowTimer = Math.max(0, e.slowTimer - dtMs);
      if (e.slowTimer === 0) e.slow = 1;
    }
  }

  // ── Move enemies ──
  for (const e of state.enemies) {
    if (!e.alive || !e.spawned || e.reached) continue;
    const { reached } = moveEnemy(e, level.paths, dtMs);
    if (reached) {
      livesLost += ENEMY_LIVES_DAMAGE[e.type];
    }
  }

  // ── Mamie healing ──
  applyMamieHealing(state.enemies, dtMs);

  // ── Tower shooting ──
  for (const tower of state.towers) {
    const cooldown = 1000 / tower.fireRate;
    if (nowMs - tower.lastShot < cooldown) continue;
    const target = findTarget(tower, state.enemies);
    if (!target) continue;
    state.projectiles.push(fireProjectile(tower, target, nowMs));
  }

  // ── Move projectiles ──
  const toRemove: string[] = [];
  for (const proj of state.projectiles) {
    if (proj.dead) { toRemove.push(proj.id); continue; }
    const target = state.enemies.find(e => e.id === proj.targetId);
    if (!target || !target.alive) { proj.dead = true; toRemove.push(proj.id); continue; }

    const d = dist(proj.pos, target.pos);
    const step = proj.speed * dtMs / 1000;

    if (d <= step) {
      proj.dead = true;
      toRemove.push(proj.id);

      if (proj.aoe > 0) {
        applyAoe(target.pos, proj.aoe, proj.damage, state.enemies, state.particles);
        hits.push({ pos: { ...target.pos }, aoe: true });
      } else {
        target.hp -= proj.damage;
        hits.push({ pos: { ...target.pos }, aoe: false });
        if (proj.freezeDuration > 0) {
          target.frozen = true;
          target.frozenTimer = proj.freezeDuration;
        }
        if (proj.slow < 1) {
          target.slow = proj.slow;
          target.slowTimer = 2000;
        }
        if (target.hp <= 0) {
          target.alive = false;
          goldEarned += target.reward;
          kills.push({ enemy: target, pos: { ...target.pos } });
          spawnDeathParticle(target, state.particles);
        }
      }
    } else {
      const angle = Math.atan2(target.pos.y - proj.pos.y, target.pos.x - proj.pos.x);
      proj.pos = {
        x: proj.pos.x + Math.cos(angle) * step,
        y: proj.pos.y + Math.sin(angle) * step,
      };
    }
  }
  state.projectiles = state.projectiles.filter(p => !toRemove.includes(p.id));

  // ── Expire particles ──
  const now = Date.now();
  state.particles = state.particles.filter(p => now - p.createdAt < p.duration);

  // ── Check wave complete ──
  const allSpawned = state.enemies.every(e => e.spawned);
  const allDone = state.enemies.every(e => !e.alive || e.reached);
  const waveComplete = allSpawned && allDone;

  return { livesLost, goldEarned, waveComplete, kills, hits };
}
