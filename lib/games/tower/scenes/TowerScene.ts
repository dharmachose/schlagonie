import * as Phaser from 'phaser';
import type { GameState, Tower, TowerType, TargetingMode, LevelConfig } from '../types';
import { LEVELS } from '../levels';
import {
  TOWER_DEFS, TOWER_COSTS,
  PLACEMENT_DURATION, UPGRADE_MULTIPLIERS, UPGRADE_COSTS,
  UPGRADE_EMOJIS, SELL_REFUND_RATIO, ENEMY_DEFS,
} from '../config';
import { buildSpawnQueue, updateBattle, dist } from '../engine';

const COLS = 16;
const ROWS = 11;

const TILE_COLORS: Record<string, number> = {
  BUILD: 0x2d5a1b, PATH: 0x8B6914, BLOCKED: 0x1a3a0a, CORE: 0x8B0000,
};
const TILE_LIGHT: Record<string, number> = {
  BUILD: 0x3a6e25, PATH: 0x9d7a1e, BLOCKED: 0x224510, CORE: 0xa00000,
};

let _idCounter = 0;
const uid = () => `t${++_idCounter}`;

export interface TowerSceneEvents {
  onStateChange: (state: GameState) => void;
  onLevelComplete: (elapsedMs: number) => void;
  onGameOver: () => void;
}

interface TowerSceneData {
  levelIndex: number;
  tileSize: number;
  events: TowerSceneEvents;
}

export default class TowerScene extends Phaser.Scene {
  private levelIndex = 0;
  private levelConfig!: LevelConfig;
  private sceneEvents!: TowerSceneEvents;
  private T = 40; // tile size, set dynamically

  state!: GameState;
  private waveElapsed = 0;
  private gameStartTime = 0;
  private gameOverFired = false;
  private victoryFired = false;

  private gridLayer!: Phaser.GameObjects.Graphics;
  private rangeCircle!: Phaser.GameObjects.Graphics;
  private projectileLayer!: Phaser.GameObjects.Graphics;
  private effectsLayer!: Phaser.GameObjects.Container;
  private towerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private enemySprites: Map<string, Phaser.GameObjects.Container> = new Map();

  private hoverCol = -1;
  private hoverRow = -1;

  selectedTowerType: TowerType = 'canon';
  selectedTower: Tower | null = null;
  private stateThrottle = 0;

  constructor() {
    super({ key: 'TowerScene' });
  }

  init(data: TowerSceneData) {
    this.levelIndex = data.levelIndex;
    this.levelConfig = LEVELS[this.levelIndex];
    this.sceneEvents = data.events;
    this.T = data.tileSize;
  }

  // Tile center in pixels using dynamic tile size
  private tc(col: number, row: number) {
    return { x: col * this.T + this.T / 2, y: row * this.T + this.T / 2 };
  }

  // Engine uses TILE_SIZE=40, we need to scale positions
  private scalePos(pos: { x: number; y: number }) {
    const ratio = this.T / 40;
    return { x: pos.x * ratio, y: pos.y * ratio };
  }

  create() {
    this.gameStartTime = Date.now();
    this.gameOverFired = false;
    this.victoryFired = false;

    this.state = {
      phase: 'placement',
      wave: 0,
      lives: this.levelConfig.startLives,
      gold: this.levelConfig.startGold,
      towers: [],
      enemies: buildSpawnQueue(this.levelConfig.waves[0], this.levelConfig.paths),
      projectiles: [],
      particles: [],
      placementTimer: PLACEMENT_DURATION,
      spawnedCount: 0,
      speedMultiplier: 1,
    };

    this.gridLayer = this.add.graphics();
    this.rangeCircle = this.add.graphics().setDepth(3);
    this.projectileLayer = this.add.graphics().setDepth(12);
    this.effectsLayer = this.add.container(0, 0).setDepth(20);

    this.drawGrid();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.handleClick(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.hoverCol = Math.floor(p.x / this.T);
      this.hoverRow = Math.floor(p.y / this.T);
    });

    this.emitState();
  }

  // ─── Grid ─────────────────────────────────────────────────────────────────
  private drawGrid() {
    const g = this.gridLayer;
    const T = this.T;
    g.clear();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tt = this.levelConfig.grid[row]?.[col] ?? 'BUILD';
        const x = col * T;
        const y = row * T;

        // Base
        g.fillStyle(TILE_COLORS[tt] ?? TILE_COLORS.BUILD, 1);
        g.fillRect(x, y, T, T);

        // Top/left highlight
        g.fillStyle(TILE_LIGHT[tt] ?? TILE_LIGHT.BUILD, 0.25);
        g.fillRect(x, y, T, 2);
        g.fillRect(x, y, 2, T);

        // Bottom/right shadow
        g.fillStyle(0x000000, 0.12);
        g.fillRect(x, y + T - 2, T, 2);
        g.fillRect(x + T - 2, y, 2, T);

        // Grid line
        g.lineStyle(0.5, 0x000000, 0.08);
        g.strokeRect(x, y, T, T);

        // Path pebbles
        if (tt === 'PATH') {
          g.fillStyle(0x6b5510, 0.3);
          const s = (row * 17 + col * 31) % 7;
          g.fillCircle(x + T * 0.25 + s, y + T * 0.3 + s * 0.5, T * 0.04);
          g.fillCircle(x + T * 0.7 - s * 0.5, y + T * 0.75 - s * 0.3, T * 0.035);
        }

        // Build grass
        if (tt === 'BUILD') {
          g.fillStyle(0x4a8a30, 0.2);
          const s = (row * 13 + col * 7) % 5;
          g.fillRect(x + T * 0.2 + s * 2, y + T * 0.35 + s, 1, T * 0.1);
          g.fillRect(x + T * 0.6 - s, y + T * 0.7, 1, T * 0.08);
        }

        // CORE
        if (tt === 'CORE') {
          g.fillStyle(0xff4444, 0.12);
          g.fillCircle(x + T / 2, y + T / 2, T * 0.7);
          this.add.text(x + T / 2, y + T / 2, '🏛️', { fontSize: `${T * 0.75}px` }).setOrigin(0.5).setDepth(1);
        }
      }
    }
  }

  // ─── Input ────────────────────────────────────────────────────────────────
  private handleClick(pointer: Phaser.Input.Pointer) {
    const col = Math.floor(pointer.x / this.T);
    const row = Math.floor(pointer.y / this.T);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    const existing = this.state.towers.find(t => t.col === col && t.row === row);
    if (existing) {
      this.selectedTower = this.selectedTower?.id === existing.id ? null : existing;
      this.emitState();
      return;
    }

    this.selectedTower = null;

    if (this.state.phase !== 'placement' && this.state.phase !== 'wave_end') return;
    if (this.levelConfig.grid[row]?.[col] !== 'BUILD') return;
    const cost = TOWER_COSTS[this.selectedTowerType];
    if (this.state.gold < cost) return;
    if (this.state.towers.some(t => t.col === col && t.row === row)) return;

    const def = TOWER_DEFS[this.selectedTowerType];
    const tower: Tower = { ...def, id: uid(), col, row, lastShot: 0, level: 1, targeting: 'farthest' };
    this.state.towers.push(tower);
    this.state.gold -= cost;

    this.spawnEffect(this.tc(col, row), '✨', 0x4caf50);
    this.emitState();
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  startWave() {
    if (this.state.phase !== 'placement' && this.state.phase !== 'wave_end') return;
    this.state.phase = 'battle';
    this.waveElapsed = 0;
    this.emitState();
  }

  setSpeed(s: number) { this.state.speedMultiplier = s; this.emitState(); }
  setSelectedTowerType(t: TowerType) { this.selectedTowerType = t; this.selectedTower = null; }

  upgradeTower(tower: Tower) {
    const nl = tower.level + 1;
    if (nl > 3) return;
    const cost = UPGRADE_COSTS[tower.type][nl];
    if (this.state.gold < cost) return;
    this.state.gold -= cost;
    tower.level = nl;
    const base = TOWER_DEFS[tower.type];
    const m = UPGRADE_MULTIPLIERS[nl];
    tower.damage = Math.round(base.damage * m.damage);
    tower.range = Math.round(base.range * m.range);
    tower.fireRate = +(base.fireRate * m.fireRate).toFixed(2);
    tower.emoji = UPGRADE_EMOJIS[tower.type][nl];
    const sp = this.towerSprites.get(tower.id);
    if (sp) { sp.destroy(); this.towerSprites.delete(tower.id); }
    this.spawnEffect(this.tc(tower.col, tower.row), '⭐', 0xffd700);
    this.emitState();
  }

  sellTower(tower: Tower) {
    let total = TOWER_COSTS[tower.type];
    for (let l = 2; l <= tower.level; l++) total += UPGRADE_COSTS[tower.type][l];
    this.state.gold += Math.floor(total * SELL_REFUND_RATIO);
    this.state.towers = this.state.towers.filter(t => t.id !== tower.id);
    const sp = this.towerSprites.get(tower.id);
    if (sp) { sp.destroy(); this.towerSprites.delete(tower.id); }
    this.selectedTower = null;
    this.spawnEffect(this.tc(tower.col, tower.row), '💰', 0xffd700);
    this.emitState();
  }

  setTargeting(tower: Tower, mode: TargetingMode) { tower.targeting = mode; this.emitState(); }

  private emitState() { this.sceneEvents.onStateChange({ ...this.state }); }

  // ─── Effects ──────────────────────────────────────────────────────────────
  private spawnEffect(pos: { x: number; y: number }, emoji: string, color: number) {
    const txt = this.add.text(pos.x, pos.y, emoji, { fontSize: `${this.T * 0.7}px` }).setOrigin(0.5).setDepth(25);
    this.effectsLayer.add(txt);
    this.tweens.add({ targets: txt, y: pos.y - this.T * 0.8, alpha: 0, scale: 1.5, duration: 600, ease: 'Quad.easeOut', onComplete: () => txt.destroy() });
  }

  private spawnHitEffect(pos: { x: number; y: number }, aoe: boolean) {
    const p = this.scalePos(pos);
    if (aoe) {
      const ring = this.add.graphics().setDepth(15);
      ring.lineStyle(3, 0xff6600, 1);
      ring.strokeCircle(p.x, p.y, this.T * 0.15);
      this.effectsLayer.add(ring);
      this.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 350, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });

      const flash = this.add.graphics().setDepth(14);
      flash.fillStyle(0xff4400, 0.4);
      flash.fillCircle(p.x, p.y, this.T * 0.5);
      this.effectsLayer.add(flash);
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 250, onComplete: () => flash.destroy() });
    } else {
      const spark = this.add.graphics().setDepth(15);
      spark.fillStyle(0xffffff, 0.8);
      spark.fillCircle(p.x, p.y, this.T * 0.06);
      this.effectsLayer.add(spark);
      this.tweens.add({ targets: spark, alpha: 0, scaleX: 3, scaleY: 3, duration: 150, onComplete: () => spark.destroy() });
    }
  }

  private spawnKillEffect(pos: { x: number; y: number }, emoji: string, reward: number) {
    const p = this.scalePos(pos);
    const e = this.add.text(p.x, p.y, emoji, { fontSize: `${this.T * 0.8}px` }).setOrigin(0.5).setDepth(25);
    this.effectsLayer.add(e);
    this.tweens.add({ targets: e, y: p.y - this.T * 0.9, alpha: 0, scaleX: 1.4, scaleY: 1.4, rotation: 0.5, duration: 600, ease: 'Quad.easeOut', onComplete: () => e.destroy() });

    const g = this.add.text(p.x + this.T * 0.3, p.y, `+${reward}g`, { fontSize: `${this.T * 0.28}px`, color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold' }).setOrigin(0.5).setDepth(25);
    this.effectsLayer.add(g);
    this.tweens.add({ targets: g, y: p.y - this.T, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  }

  // ─── Game loop ────────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    const state = this.state;
    const dtMs = Math.min(delta, 50) * state.speedMultiplier;

    if (state.phase === 'defeat' || state.phase === 'victory') return;

    if (state.phase === 'placement' || state.phase === 'wave_end') {
      state.placementTimer = Math.max(0, state.placementTimer - dtMs);
      if (state.placementTimer <= 0) this.startWave();
    } else if (state.phase === 'battle') {
      this.waveElapsed += dtMs;
      const now = performance.now();
      const result = updateBattle(state, this.levelConfig, dtMs, now, this.waveElapsed);

      state.lives = Math.max(0, state.lives - result.livesLost);
      state.gold += result.goldEarned;

      for (const hit of result.hits) this.spawnHitEffect(hit.pos, hit.aoe);
      for (const kill of result.kills) this.spawnKillEffect(kill.pos, kill.enemy.emoji, kill.enemy.reward);

      // Gentle screen shake only for big hits
      if (result.livesLost >= 3) this.cameras.main.shake(150, 0.003);

      if (state.lives <= 0 && !this.gameOverFired) {
        this.gameOverFired = true;
        state.phase = 'defeat';
        this.emitState();
        this.sceneEvents.onGameOver();
        return;
      }

      if (result.waveComplete) {
        const nw = state.wave + 1;
        if (nw >= this.levelConfig.waves.length) {
          if (!this.victoryFired) {
            this.victoryFired = true;
            state.phase = 'victory';
            this.emitState();
            this.sceneEvents.onLevelComplete(Date.now() - this.gameStartTime);
          }
          return;
        } else {
          state.wave = nw;
          state.phase = 'wave_end';
          state.placementTimer = PLACEMENT_DURATION;
          state.enemies = buildSpawnQueue(this.levelConfig.waves[nw], this.levelConfig.paths);
          state.projectiles = [];
          this.waveElapsed = 0;
          this.cleanupEnemySprites();
        }
      }
    }

    this.renderRange();
    this.renderTowers();
    this.renderEnemies();
    this.renderProjectiles();

    this.stateThrottle += delta;
    if (this.stateThrottle > 100) { this.stateThrottle = 0; this.emitState(); }
  }

  // ─── Range ────────────────────────────────────────────────────────────────
  private renderRange() {
    const rc = this.rangeCircle;
    rc.clear();
    const ratio = this.T / 40;

    if (this.selectedTower) {
      const t = this.selectedTower;
      const cx = t.col * this.T + this.T / 2;
      const cy = t.row * this.T + this.T / 2;
      const r = t.range * ratio;
      const c = Phaser.Display.Color.HexStringToColor(t.color).color;
      rc.fillStyle(c, 0.08);
      rc.fillCircle(cx, cy, r);
      rc.lineStyle(2, c, 0.4);
      rc.strokeCircle(cx, cy, r);
    }

    if (this.hoverCol >= 0 && this.hoverRow >= 0 && this.hoverCol < COLS && this.hoverRow < ROWS) {
      const ht = this.state.towers.find(t => t.col === this.hoverCol && t.row === this.hoverRow);
      if (ht && ht !== this.selectedTower) {
        const cx = ht.col * this.T + this.T / 2;
        const cy = ht.row * this.T + this.T / 2;
        rc.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(ht.color).color, 0.3);
        rc.strokeCircle(cx, cy, ht.range * ratio);
      }

      const isP = this.state.phase === 'placement' || this.state.phase === 'wave_end';
      if (isP && !ht && this.levelConfig.grid[this.hoverRow]?.[this.hoverCol] === 'BUILD'
          && !this.state.towers.some(t => t.col === this.hoverCol && t.row === this.hoverRow)) {
        const def = TOWER_DEFS[this.selectedTowerType];
        const cx = this.hoverCol * this.T + this.T / 2;
        const cy = this.hoverRow * this.T + this.T / 2;
        rc.fillStyle(0xffffff, 0.06);
        rc.fillRect(this.hoverCol * this.T, this.hoverRow * this.T, this.T, this.T);
        rc.lineStyle(1, 0xffffff, 0.2);
        rc.strokeCircle(cx, cy, def.range * ratio);
      }
    }
  }

  // ─── Towers ───────────────────────────────────────────────────────────────
  private renderTowers() {
    const T = this.T;
    const activeIds = new Set(this.state.towers.map(t => t.id));
    for (const [id, s] of this.towerSprites) { if (!activeIds.has(id)) { s.destroy(); this.towerSprites.delete(id); } }

    for (const tower of this.state.towers) {
      const cx = tower.col * T + T / 2;
      const cy = tower.row * T + T / 2;
      let sp = this.towerSprites.get(tower.id);

      if (!sp) {
        sp = this.add.container(cx, cy).setDepth(5);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.25);
        shadow.fillEllipse(T * 0.04, T * 0.1, T * 0.7, T * 0.3);
        sp.add(shadow);

        // Base
        const base = this.add.graphics();
        const c = Phaser.Display.Color.HexStringToColor(tower.color).color;
        base.fillStyle(c, 1);
        base.fillCircle(0, 0, T * 0.42);
        base.fillStyle(0xffffff, 0.15);
        base.fillCircle(-T * 0.08, -T * 0.1, T * 0.18);
        base.lineStyle(2, 0xffffff, 0.35);
        base.strokeCircle(0, 0, T * 0.42);
        sp.add(base);

        // Emoji - BIGGER
        const emoji = this.add.text(0, -T * 0.02, tower.emoji, { fontSize: `${T * 0.6}px` }).setOrigin(0.5);
        sp.add(emoji);

        // Level stars
        if (tower.level > 1) {
          const stars = '★'.repeat(tower.level - 1);
          sp.add(this.add.text(0, -T * 0.48, stars, {
            fontSize: `${T * 0.22}px`, color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold',
          }).setOrigin(0.5));
        }

        this.towerSprites.set(tower.id, sp);
      }

      sp.setPosition(cx, cy);
      sp.setScale(this.selectedTower?.id === tower.id ? 1.12 : 1);
    }
  }

  // ─── Enemies ──────────────────────────────────────────────────────────────
  private renderEnemies() {
    const T = this.T;
    const ratio = T / 40;
    const activeIds = new Set<string>();

    for (const enemy of this.state.enemies) {
      if (!enemy.alive || !enemy.spawned || enemy.reached) continue;
      activeIds.add(enemy.id);

      const ex = enemy.pos.x * ratio;
      const ey = enemy.pos.y * ratio;

      let sp = this.enemySprites.get(enemy.id);

      if (!sp) {
        sp = this.add.container(ex, ey).setDepth(10);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillEllipse(1, T * 0.15, T * 0.45, T * 0.15);
        sp.add(shadow);

        // Status
        const status = this.add.graphics().setName('status');
        sp.add(status);

        // HP bar bg
        const hpBg = this.add.graphics();
        const barW = T * 0.7;
        hpBg.fillStyle(0x000000, 0.5);
        hpBg.fillRoundedRect(-barW / 2, -T * 0.52, barW, T * 0.12, 2);
        sp.add(hpBg);

        // HP bar
        const hpBar = this.add.graphics().setName('hpBar');
        sp.add(hpBar);

        // Emoji - BIGGER
        const isBoss = enemy.type === 'boss';
        const sz = isBoss ? T * 1.0 : T * 0.72;
        sp.add(this.add.text(0, 0, enemy.emoji, { fontSize: `${sz}px` }).setOrigin(0.5));

        this.enemySprites.set(enemy.id, sp);
      }

      // Position with subtle bob
      const bob = Math.sin(this.time.now / 350 + ex * 0.1) * T * 0.03;
      sp.setPosition(ex, ey + bob);

      // HP bar
      const hpBar = sp.getByName('hpBar') as Phaser.GameObjects.Graphics;
      if (hpBar) {
        hpBar.clear();
        const pct = Math.max(0, enemy.hp / enemy.maxHp);
        const barW = T * 0.7;
        const barH = T * 0.1;
        const c = pct > 0.5 ? 0x4caf50 : pct > 0.25 ? 0xff9800 : 0xf44336;
        hpBar.fillStyle(c, 1);
        hpBar.fillRoundedRect(-barW / 2 + 1, -T * 0.51, (barW - 2) * pct, barH - 2, 1);
      }

      // Status overlay
      const status = sp.getByName('status') as Phaser.GameObjects.Graphics;
      if (status) {
        status.clear();
        if (enemy.frozen) {
          status.fillStyle(0x4fc3f7, 0.3);
          status.fillCircle(0, 0, T * 0.4);
          status.lineStyle(1.5, 0x4fc3f7, 0.5);
          status.strokeCircle(0, 0, T * 0.4);
        } else if (enemy.slow < 1) {
          status.fillStyle(0x0096c8, 0.2);
          status.fillCircle(0, 0, T * 0.35);
        }
      }
    }

    for (const [id, s] of this.enemySprites) { if (!activeIds.has(id)) { s.destroy(); this.enemySprites.delete(id); } }
  }

  private cleanupEnemySprites() {
    for (const [, s] of this.enemySprites) s.destroy();
    this.enemySprites.clear();
  }

  // ─── Projectiles ──────────────────────────────────────────────────────────
  private renderProjectiles() {
    const pl = this.projectileLayer;
    pl.clear();
    const ratio = this.T / 40;
    const r = this.T * 0.08;

    for (const proj of this.state.projectiles) {
      if (proj.dead) continue;
      const px = proj.pos.x * ratio;
      const py = proj.pos.y * ratio;
      const c = Phaser.Display.Color.HexStringToColor(proj.color).color;

      // Glow
      pl.fillStyle(c, 0.15);
      pl.fillCircle(px, py, r * 3);
      // Trail
      pl.fillStyle(c, 0.4);
      pl.fillCircle(px, py, r * 1.8);
      // Core
      pl.fillStyle(c, 1);
      pl.fillCircle(px, py, r);
      // Center
      pl.fillStyle(0xffffff, 0.6);
      pl.fillCircle(px, py, r * 0.5);
    }
  }
}
