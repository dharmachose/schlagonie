import Phaser from 'phaser';
import type {
  LevelConfig, Tower, Enemy, Projectile,
  TileType, GamePhase, TargetPriority, GameBridge,
  UIState, TowerType, Pos, Tile,
} from './types';
import { TOWER_DEFS, ENEMY_DEFS, CELL_SIZE, PLACEMENT_DURATION } from './config';

let _id = 0;
const uid = () => String(++_id);

const TILE_FILL: Record<TileType, number> = {
  BUILD:   0x2d5a1b,
  PATH:    0x8b6914,
  BLOCKED: 0x1a3a0a,
  CORE:    0x7b0000,
};

export class GameScene extends Phaser.Scene {
  // ── Config ─────────────────────────────────────────────────────────────
  private levelConfig: LevelConfig;
  private bridge: GameBridge;

  // ── State ──────────────────────────────────────────────────────────────
  private phase: GamePhase = 'placement';
  private wave = 0;
  private lives = 20;
  private gold = 150;
  private placementTimeLeft = PLACEMENT_DURATION;
  private waveElapsed = 0;  // seconds since wave start
  private gameSpeed = 1;
  private isPaused = false;
  private startTime = 0;

  // ── Game objects ───────────────────────────────────────────────────────
  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];

  // ── Phaser display objects ────────────────────────────────────────────
  private bgGfx!: Phaser.GameObjects.Graphics;
  private rangeGfx!: Phaser.GameObjects.Graphics;
  private projGfx!: Phaser.GameObjects.Graphics;
  private hpGfx!: Phaser.GameObjects.Graphics;
  private towerTexts = new Map<string, Phaser.GameObjects.Text>();
  private enemyTexts = new Map<string, Phaser.GameObjects.Text>();

  // ── Interaction state ─────────────────────────────────────────────────
  private placingType: TowerType | null = 'brasseur';
  private selectedTowerId: string | null = null;
  private hoverCol = -1;
  private hoverRow = -1;

  // ── One-shot flags ─────────────────────────────────────────────────────
  private gameOverFired = false;
  private victoryFired = false;

  // ── Dirty flag for React state ─────────────────────────────────────────
  private stateDirty = true;
  private lastEmitTime = 0;

  constructor(levelConfig: LevelConfig, bridge: GameBridge) {
    super({ key: 'GameScene' });
    this.levelConfig = levelConfig;
    this.bridge = bridge;
  }

  preload() {}

  create() {
    this.lives = this.levelConfig.startLives;
    this.gold = this.levelConfig.startGold;
    this.startTime = Date.now();

    // ── Layers (depth order) ──
    this.bgGfx    = this.add.graphics().setDepth(0);
    this.rangeGfx = this.add.graphics().setDepth(2);
    this.projGfx  = this.add.graphics().setDepth(6);
    this.hpGfx    = this.add.graphics().setDepth(7);

    this.drawBackground();

    // ── Input ──
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      this.hoverCol = Math.floor(ptr.x / CELL_SIZE);
      this.hoverRow = Math.floor(ptr.y / CELL_SIZE);
    });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.rightButtonDown()) {
        this.selectedTowerId = null;
        this.stateDirty = true;
        return;
      }
      this.handleClick(ptr.x, ptr.y);
    });

    // ── Wire bridge (React ↔ Scene) ──
    this.bridge.setPlacingType = (t) => {
      this.placingType = t;
      this.selectedTowerId = null;
      this.stateDirty = true;
    };
    this.bridge.startWave = () => this.startWave();
    this.bridge.setSpeed = (s) => { this.gameSpeed = s; this.stateDirty = true; };
    this.bridge.setPaused = (p) => { this.isPaused = p; this.stateDirty = true; };
    this.bridge.upgradeTower = () => this.upgradeSelectedTower();
    this.bridge.sellTower = () => this.sellSelectedTower();
    this.bridge.deselectTower = () => { this.selectedTowerId = null; this.stateDirty = true; };
    this.bridge.setTargetPriority = (p) => this.setSelectedPriority(p);

    // ── First wave queue ──
    this.enemies = this.buildSpawnQueue(0);
    this.stateDirty = true;
  }

  update(_time: number, delta: number) {
    if (this.isPaused) return;

    const dt = (delta / 1000) * this.gameSpeed;

    if (this.phase === 'placement' || this.phase === 'wave_end') {
      this.placementTimeLeft = Math.max(0, this.placementTimeLeft - dt);
      if (this.placementTimeLeft <= 0) this.startWave();
    } else if (this.phase === 'battle') {
      this.waveElapsed += dt;
      this.runBattle(dt);
    }

    this.drawDynamic();

    // Throttle React state emissions to ~15fps to avoid perf issues
    const now = Date.now();
    if (this.stateDirty || now - this.lastEmitTime > 66) {
      this.stateDirty = false;
      this.lastEmitTime = now;
      this.emitState();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BACKGROUND (drawn once)
  // ─────────────────────────────────────────────────────────────────────────
  private drawBackground() {
    const { grid, rows, cols } = this.levelConfig;
    const g = this.bgGfx;
    g.clear();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = grid[r]?.[c] ?? 'BUILD';
        g.fillStyle(TILE_FILL[tile] ?? TILE_FILL.BUILD, 1);
        g.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        g.lineStyle(0.5, 0x000000, 0.18);
        g.strokeRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    // CORE emoji (Mairie de La Baffe)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r]?.[c] === 'CORE') {
          this.add.text(
            c * CELL_SIZE + CELL_SIZE / 2,
            r * CELL_SIZE + CELL_SIZE / 2,
            '🏛️',
            { fontSize: `${Math.round(CELL_SIZE * 0.72)}px` }
          ).setOrigin(0.5).setDepth(1);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DYNAMIC RENDERING (every frame)
  // ─────────────────────────────────────────────────────────────────────────
  private drawDynamic() {
    this.rangeGfx.clear();
    this.projGfx.clear();
    this.hpGfx.clear();

    const placing = this.phase === 'placement' || this.phase === 'wave_end';

    // ── Range circle preview on hover (placement, no tower selected) ──
    if (placing && this.placingType && !this.selectedTowerId) {
      const tile = this.levelConfig.grid[this.hoverRow]?.[this.hoverCol];
      if (tile === 'BUILD') {
        const occupied = this.towers.some(t => t.col === this.hoverCol && t.row === this.hoverRow);
        if (!occupied) {
          const def = TOWER_DEFS[this.placingType];
          const cx = this.hoverCol * CELL_SIZE + CELL_SIZE / 2;
          const cy = this.hoverRow * CELL_SIZE + CELL_SIZE / 2;
          this.rangeGfx.fillStyle(0xffffff, 0.08);
          this.rangeGfx.fillRect(this.hoverCol * CELL_SIZE, this.hoverRow * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          this.rangeGfx.lineStyle(1.5, 0xffffff, 0.3);
          this.rangeGfx.strokeCircle(cx, cy, def.range);
          this.rangeGfx.fillStyle(0xffffff, 0.03);
          this.rangeGfx.fillCircle(cx, cy, def.range);
        }
      }
    }

    // ── Selected tower range + highlight ──
    if (this.selectedTowerId) {
      const tower = this.towers.find(t => t.id === this.selectedTowerId);
      if (tower) {
        const cx = tower.col * CELL_SIZE + CELL_SIZE / 2;
        const cy = tower.row * CELL_SIZE + CELL_SIZE / 2;
        this.rangeGfx.lineStyle(2, 0xFFD700, 0.8);
        this.rangeGfx.strokeCircle(cx, cy, tower.range);
        this.rangeGfx.fillStyle(0xFFD700, 0.06);
        this.rangeGfx.fillCircle(cx, cy, tower.range);
        this.rangeGfx.lineStyle(2, 0xFFD700, 1);
        this.rangeGfx.strokeRect(tower.col * CELL_SIZE, tower.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    // ── Projectiles ──
    for (const proj of this.projectiles) {
      const col = parseInt(proj.color.replace('#', ''), 16);
      this.projGfx.fillStyle(col, 1);
      this.projGfx.fillCircle(proj.x, proj.y, 4);
      this.projGfx.fillStyle(col, 0.25);
      this.projGfx.fillCircle(proj.x, proj.y, 7);
    }

    // ── Enemy HP bars + status overlays ──
    for (const e of this.enemies) {
      if (!e.alive || !e.spawned || e.reached) continue;

      const bw = Math.min(38, CELL_SIZE * 0.68);
      const bh = 4;
      const bx = e.pos.x - bw / 2;
      const by = e.pos.y - CELL_SIZE * 0.44;
      const pct = e.hp / e.maxHp;

      // HP bar background
      this.hpGfx.fillStyle(0x222222, 0.9);
      this.hpGfx.fillRect(bx, by, bw, bh);
      // HP bar fill
      const barColor = pct > 0.5 ? 0x4caf50 : pct > 0.25 ? 0xff9800 : 0xf44336;
      this.hpGfx.fillStyle(barColor, 1);
      this.hpGfx.fillRect(bx, by, bw * pct, bh);

      // Frozen overlay
      if (e.freezeTimer > 0) {
        this.hpGfx.fillStyle(0x4fc3f7, 0.4);
        this.hpGfx.fillCircle(e.pos.x, e.pos.y, CELL_SIZE * 0.34);
        this.hpGfx.lineStyle(1.5, 0x4fc3f7, 0.7);
        this.hpGfx.strokeCircle(e.pos.x, e.pos.y, CELL_SIZE * 0.34);
      } else if (e.slowTimer > 0) {
        this.hpGfx.fillStyle(0x0099dd, 0.25);
        this.hpGfx.fillCircle(e.pos.x, e.pos.y, CELL_SIZE * 0.34);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INPUT — CLICK
  // ─────────────────────────────────────────────────────────────────────────
  private handleClick(x: number, y: number) {
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    // Click on placed tower → select
    const hit = this.towers.find(t => t.col === col && t.row === row);
    if (hit) {
      this.selectedTowerId = hit.id;
      this.placingType = null;
      this.stateDirty = true;
      return;
    }

    // Deselect when clicking non-tower
    if (this.selectedTowerId) {
      this.selectedTowerId = null;
      this.stateDirty = true;
    }

    // Place tower during placement / wave_end
    const placing = this.phase === 'placement' || this.phase === 'wave_end';
    if (!placing || !this.placingType) return;
    const tileType = this.levelConfig.grid[row]?.[col];
    if (tileType !== 'BUILD') return;
    if (this.towers.some(t => t.col === col && t.row === row)) return;

    const def = TOWER_DEFS[this.placingType];
    if (this.gold < def.cost) return;

    const tower: Tower = {
      id: uid(),
      type: this.placingType,
      col, row,
      level: 1,
      totalInvested: def.cost,
      damage: def.damage,
      range: def.range,
      fireRate: def.fireRate,
      aoe: def.aoe,
      slowFactor: def.slowFactor,
      freezeDuration: def.freezeDuration,
      cooldown: 0,
      priority: 'first',
    };
    this.towers.push(tower);
    this.gold -= def.cost;

    // Create emoji text (depth 3 = above background, below HP bars)
    const cx = col * CELL_SIZE + CELL_SIZE / 2;
    const cy = row * CELL_SIZE + CELL_SIZE / 2;
    const txt = this.add.text(cx, cy, def.emoji, {
      fontSize: `${Math.round(CELL_SIZE * 0.55)}px`,
    }).setOrigin(0.5).setDepth(3);
    this.towerTexts.set(tower.id, txt);

    this.stateDirty = true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WAVE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  private startWave() {
    this.phase = 'battle';
    this.waveElapsed = 0;
    this.stateDirty = true;
  }

  private buildSpawnQueue(waveIdx: number): Enemy[] {
    const wave = this.levelConfig.waves[waveIdx];
    const paths = this.levelConfig.paths;
    const enemies: Enemy[] = [];
    let robin = 0;

    for (const entry of wave.spawns) {
      for (let i = 0; i < entry.count; i++) {
        const delay = entry.delay + i * entry.interval;
        const pathIdx = robin % paths.length;
        const def = ENEMY_DEFS[entry.type];
        const start = paths[pathIdx][0];
        const startPos = this.tileCenter(start.col, start.row);

        enemies.push({
          id: uid(),
          type: entry.type,
          emoji: def.emoji,
          pos: { ...startPos },
          pathIndex: pathIdx,
          pathProgress: 0,
          hp: def.hp,
          maxHp: def.hp,
          speed: def.speed,
          alive: true,
          reached: false,
          slowTimer: 0,
          slowFactor: 1,
          freezeTimer: 0,
          spawnDelay: delay,
          spawned: false,
          reward: def.reward,
          liveDamage: def.liveDamage,
        });
        robin++;
      }
    }

    return enemies.sort((a, b) => a.spawnDelay - b.spawnDelay);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BATTLE UPDATE
  // ─────────────────────────────────────────────────────────────────────────
  private runBattle(dt: number) {
    // Spawn
    for (const e of this.enemies) {
      if (!e.spawned && e.spawnDelay <= this.waveElapsed) {
        e.spawned = true;
        const path = this.levelConfig.paths[e.pathIndex];
        e.pos = this.tileCenter(path[0].col, path[0].row);
        const txt = this.add.text(e.pos.x, e.pos.y, e.emoji, {
          fontSize: `${Math.round(e.type === 'boss' ? CELL_SIZE * 0.82 : CELL_SIZE * 0.56)}px`,
        }).setOrigin(0.5).setDepth(5);
        this.enemyTexts.set(e.id, txt);
        this.stateDirty = true;
      }
    }

    // Update timers & move enemies
    for (const e of this.enemies) {
      if (!e.alive || !e.spawned || e.reached) continue;

      if (e.freezeTimer > 0) e.freezeTimer = Math.max(0, e.freezeTimer - dt);
      if (e.slowTimer > 0) {
        e.slowTimer = Math.max(0, e.slowTimer - dt);
        if (e.slowTimer <= 0) e.slowFactor = 1;
      }

      const effectiveSpeed = e.freezeTimer > 0 ? 0 : e.speed * e.slowFactor;
      const reached = this.moveEnemy(e, effectiveSpeed, dt);

      if (reached) {
        this.lives = Math.max(0, this.lives - e.liveDamage);
        this.destroyEnemyText(e.id);
        this.stateDirty = true;
      } else {
        const txt = this.enemyTexts.get(e.id);
        if (txt) txt.setPosition(e.pos.x, e.pos.y);
      }
    }

    // Mamie healing
    this.applyMamieHealing(dt);

    // Tower shooting
    for (const tower of this.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      if (tower.cooldown > 0) continue;
      const target = this.findTarget(tower);
      if (!target) continue;

      tower.cooldown = 1 / tower.fireRate;
      const orig = this.tileCenter(tower.col, tower.row);
      const def = TOWER_DEFS[tower.type];

      this.projectiles.push({
        id: uid(),
        x: orig.x, y: orig.y,
        targetId: target.id,
        speed: 400,
        damage: tower.damage,
        aoe: tower.aoe,
        slowFactor: tower.slowFactor,
        freezeDuration: tower.freezeDuration,
        color: def.color,
      });
    }

    // Move projectiles
    this.projectiles = this.projectiles.filter(proj => {
      const target = this.enemies.find(e => e.id === proj.targetId);
      if (!target || !target.alive) return false;

      const dx = target.pos.x - proj.x;
      const dy = target.pos.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = proj.speed * dt;

      if (dist <= step) {
        this.applyHit(proj, target);
        return false;
      }
      proj.x += (dx / dist) * step;
      proj.y += (dy / dist) * step;
      return true;
    });

    // Check game over
    if (this.lives <= 0 && !this.gameOverFired) {
      this.gameOverFired = true;
      this.phase = 'defeat';
      this.stateDirty = true;
      this.bridge.onGameOver();
      return;
    }

    // Check wave complete
    const allSpawned = this.enemies.every(e => e.spawned);
    const allDone = this.enemies.every(e => !e.alive || e.reached);

    if (allSpawned && allDone) {
      const next = this.wave + 1;
      if (next >= this.levelConfig.waves.length) {
        if (!this.victoryFired) {
          this.victoryFired = true;
          this.phase = 'victory';
          this.stateDirty = true;
          this.bridge.onLevelComplete(Date.now() - this.startTime);
        }
      } else {
        this.wave = next;
        this.phase = 'wave_end';
        this.placementTimeLeft = PLACEMENT_DURATION;
        this.projectiles = [];
        this.enemyTexts.forEach(t => t.destroy());
        this.enemyTexts.clear();
        this.enemies = this.buildSpawnQueue(this.wave);
        this.stateDirty = true;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATHFINDING
  // ─────────────────────────────────────────────────────────────────────────
  private moveEnemy(enemy: Enemy, speed: number, dt: number): boolean {
    const path = this.levelConfig.paths[enemy.pathIndex];
    if (!path || path.length < 2) return false;

    let remaining = speed * dt;

    while (remaining > 0) {
      const wpIdx = Math.floor(enemy.pathProgress);
      if (wpIdx >= path.length - 1) {
        enemy.reached = true;
        enemy.alive = false;
        return true;
      }

      const curr = this.tileCenter(path[wpIdx].col, path[wpIdx].row);
      const next = this.tileCenter(path[wpIdx + 1].col, path[wpIdx + 1].row);
      const segLen = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);
      if (segLen === 0) { enemy.pathProgress = wpIdx + 1; continue; }

      const frac = enemy.pathProgress - wpIdx;
      const distToNext = segLen * (1 - frac);

      if (remaining >= distToNext) {
        remaining -= distToNext;
        enemy.pathProgress = wpIdx + 1;
      } else {
        enemy.pathProgress += remaining / segLen;
        remaining = 0;
      }
    }

    // Update pixel position
    const wpIdx = Math.min(Math.floor(enemy.pathProgress), path.length - 2);
    const frac = enemy.pathProgress - wpIdx;
    const a = this.tileCenter(path[wpIdx].col, path[wpIdx].row);
    const b = this.tileCenter(path[Math.min(wpIdx + 1, path.length - 1)].col, path[Math.min(wpIdx + 1, path.length - 1)].row);
    enemy.pos = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };

    return false;
  }

  private tileCenter(col: number, row: number): Pos {
    return { x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMBAT
  // ─────────────────────────────────────────────────────────────────────────
  private findTarget(tower: Tower): Enemy | null {
    const origin = this.tileCenter(tower.col, tower.row);
    const inRange = this.enemies.filter(e => {
      if (!e.alive || !e.spawned || e.reached) return false;
      const dx = e.pos.x - origin.x;
      const dy = e.pos.y - origin.y;
      return Math.sqrt(dx * dx + dy * dy) <= tower.range;
    });
    if (!inRange.length) return null;

    switch (tower.priority) {
      case 'first':    return inRange.reduce((a, b) => a.pathProgress > b.pathProgress ? a : b);
      case 'last':     return inRange.reduce((a, b) => a.pathProgress < b.pathProgress ? a : b);
      case 'strongest': return inRange.reduce((a, b) => a.hp > b.hp ? a : b);
      default:         return inRange[0];
    }
  }

  private applyHit(proj: Projectile, primary: Enemy) {
    if (proj.aoe > 0) {
      // AOE
      for (const e of this.enemies) {
        if (!e.alive || e.reached) continue;
        const dx = e.pos.x - primary.pos.x;
        const dy = e.pos.y - primary.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) <= proj.aoe) {
          this.damageEnemy(e, proj.damage);
        }
      }
      // Explosion flash
      const boom = this.add.text(primary.pos.x, primary.pos.y, '💥', {
        fontSize: `${Math.round(CELL_SIZE * 0.7)}px`,
      }).setOrigin(0.5).setDepth(9);
      this.tweens.add({
        targets: boom,
        y: primary.pos.y - 30,
        alpha: 0,
        scaleX: 1.6, scaleY: 1.6,
        duration: 380,
        onComplete: () => boom.destroy(),
      });
    } else {
      this.damageEnemy(primary, proj.damage);
      if (proj.freezeDuration > 0) {
        primary.freezeTimer = Math.max(primary.freezeTimer, proj.freezeDuration);
      } else if (proj.slowFactor < 1) {
        primary.slowFactor = Math.min(primary.slowFactor, proj.slowFactor);
        primary.slowTimer = Math.max(primary.slowTimer, 2.5);
      }
    }
  }

  private damageEnemy(enemy: Enemy, damage: number) {
    enemy.hp -= damage;
    this.stateDirty = true;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.gold += enemy.reward;
      // Death tween
      const txt = this.enemyTexts.get(enemy.id);
      if (txt) {
        this.tweens.add({
          targets: txt,
          y: txt.y - 40,
          alpha: 0,
          scaleX: 1.3, scaleY: 1.3,
          duration: 450,
          onComplete: () => txt.destroy(),
        });
        this.enemyTexts.delete(enemy.id);
      }
    }
  }

  private destroyEnemyText(id: string) {
    const txt = this.enemyTexts.get(id);
    if (txt) { txt.destroy(); this.enemyTexts.delete(id); }
  }

  private applyMamieHealing(dt: number) {
    const def = ENEMY_DEFS.mamie;
    const mamies = this.enemies.filter(e => e.alive && e.spawned && !e.reached && e.type === 'mamie');
    for (const mamie of mamies) {
      for (const target of this.enemies) {
        if (!target.alive || target.reached || target.type === 'mamie') continue;
        const dx = target.pos.x - mamie.pos.x;
        const dy = target.pos.y - mamie.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) <= (def.healRadius ?? 65)) {
          target.hp = Math.min(target.maxHp, target.hp + (def.healRate ?? 10) * dt);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOWER MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  private upgradeSelectedTower() {
    if (!this.selectedTowerId) return;
    const tower = this.towers.find(t => t.id === this.selectedTowerId);
    if (!tower || tower.level >= 3) return;

    const def = TOWER_DEFS[tower.type];
    const upgrade = def.upgrades[tower.level - 1];
    if (!upgrade || this.gold < upgrade.cost) return;

    this.gold -= upgrade.cost;
    tower.totalInvested += upgrade.cost;
    tower.level++;
    tower.damage = upgrade.damage;
    tower.range = upgrade.range;
    tower.fireRate = upgrade.fireRate;
    if (upgrade.aoe !== undefined)           tower.aoe = upgrade.aoe;
    if (upgrade.slowFactor !== undefined)    tower.slowFactor = upgrade.slowFactor;
    if (upgrade.freezeDuration !== undefined) tower.freezeDuration = upgrade.freezeDuration;

    // Flash animation
    const txt = this.towerTexts.get(tower.id);
    if (txt) {
      this.tweens.add({ targets: txt, scaleX: 1.5, scaleY: 1.5, duration: 120, yoyo: true });
    }
    // Gold particle
    const cx = tower.col * CELL_SIZE + CELL_SIZE / 2;
    const cy = tower.row * CELL_SIZE + CELL_SIZE / 2;
    const star = this.add.text(cx, cy, '⭐', { fontSize: '18px' }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: star, y: cy - 40, alpha: 0, duration: 600, onComplete: () => star.destroy() });

    this.stateDirty = true;
  }

  private sellSelectedTower() {
    if (!this.selectedTowerId) return;
    const idx = this.towers.findIndex(t => t.id === this.selectedTowerId);
    if (idx === -1) return;

    const tower = this.towers[idx];
    this.gold += Math.floor(tower.totalInvested * 0.75);

    const txt = this.towerTexts.get(tower.id);
    if (txt) {
      this.tweens.add({ targets: txt, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 250, onComplete: () => txt.destroy() });
      this.towerTexts.delete(tower.id);
    }
    this.towers.splice(idx, 1);
    this.selectedTowerId = null;
    this.stateDirty = true;
  }

  private setSelectedPriority(priority: TargetPriority) {
    if (!this.selectedTowerId) return;
    const tower = this.towers.find(t => t.id === this.selectedTowerId);
    if (tower) { tower.priority = priority; this.stateDirty = true; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE EMIT → REACT
  // ─────────────────────────────────────────────────────────────────────────
  private emitState() {
    let selectedTower: UIState['selectedTower'] = null;
    if (this.selectedTowerId) {
      const tower = this.towers.find(t => t.id === this.selectedTowerId);
      if (tower) {
        const def = TOWER_DEFS[tower.type];
        const upgrade = def.upgrades[tower.level - 1];
        const upgradeable = tower.level < 3 && !!upgrade;
        selectedTower = {
          towerType: tower.type,
          level: tower.level,
          totalInvested: tower.totalInvested,
          upgradeable,
          upgradeCost: upgrade?.cost ?? 0,
          upgradeLabel: upgrade?.label ?? '',
          sellValue: Math.floor(tower.totalInvested * 0.75),
          priority: tower.priority,
        };
      }
    }

    this.bridge.onStateChange({
      phase: this.phase,
      wave: this.wave,
      totalWaves: this.levelConfig.waves.length,
      lives: this.lives,
      gold: this.gold,
      placementTimeLeft: Math.ceil(this.placementTimeLeft),
      gameSpeed: this.gameSpeed,
      paused: this.isPaused,
      selectedTower,
    });
  }
}
