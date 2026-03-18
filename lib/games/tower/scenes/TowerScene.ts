import * as Phaser from 'phaser';
import type { GameState, Tower, TowerType, TargetingMode, LevelConfig } from '../types';
import { LEVELS } from '../levels';
import {
  TILE_SIZE, TOWER_DEFS, TOWER_COSTS,
  PLACEMENT_DURATION, UPGRADE_MULTIPLIERS, UPGRADE_COSTS,
  UPGRADE_EMOJIS, SELL_REFUND_RATIO, ENEMY_DEFS,
} from '../config';
import { tileCenter, buildSpawnQueue, updateBattle, dist } from '../engine';

// Grid only — UI is handled by React
const COLS = 16;
const ROWS = 11;
const GRID_W = COLS * TILE_SIZE;
const GRID_H = ROWS * TILE_SIZE;

const TILE_COLORS: Record<string, number> = {
  BUILD:   0x2d5a1b,
  PATH:    0x8B6914,
  BLOCKED: 0x1a3a0a,
  CORE:    0x8B0000,
};

const TILE_COLORS_LIGHT: Record<string, number> = {
  BUILD:   0x3a6e25,
  PATH:    0x9d7a1e,
  BLOCKED: 0x224510,
  CORE:    0xa00000,
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
  events: TowerSceneEvents;
}

export default class TowerScene extends Phaser.Scene {
  private levelIndex = 0;
  private levelConfig!: LevelConfig;
  private sceneEvents!: TowerSceneEvents;

  // State
  state!: GameState;
  private waveElapsed = 0;
  private gameStartTime = 0;
  private gameOverFired = false;
  private victoryFired = false;

  // Graphics
  private gridLayer!: Phaser.GameObjects.Graphics;
  private rangeCircle!: Phaser.GameObjects.Graphics;
  private projectileLayer!: Phaser.GameObjects.Graphics;
  private effectsLayer!: Phaser.GameObjects.Container;
  private towerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private enemySprites: Map<string, Phaser.GameObjects.Container> = new Map();

  // Hover
  private hoverCol = -1;
  private hoverRow = -1;

  // External control
  selectedTowerType: TowerType = 'canon';
  selectedTower: Tower | null = null;
  private stateChangeThrottle = 0;

  constructor() {
    super({ key: 'TowerScene' });
  }

  init(data: TowerSceneData) {
    this.levelIndex = data.levelIndex;
    this.levelConfig = LEVELS[this.levelIndex];
    this.sceneEvents = data.events;
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

    // Layers
    this.gridLayer = this.add.graphics();
    this.rangeCircle = this.add.graphics();
    this.projectileLayer = this.add.graphics();
    this.effectsLayer = this.add.container(0, 0);

    this.drawGrid();

    // Input
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.handleClick(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.handleHover(p));

    this.emitState();
  }

  // ─── Grid rendering ──────────────────────────────────────────────────────
  private drawGrid() {
    const g = this.gridLayer;
    g.clear();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tileType = this.levelConfig.grid[row]?.[col] ?? 'BUILD';
        const baseColor = TILE_COLORS[tileType] ?? TILE_COLORS.BUILD;
        const lightColor = TILE_COLORS_LIGHT[tileType] ?? TILE_COLORS_LIGHT.BUILD;

        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        // Base fill
        g.fillStyle(baseColor, 1);
        g.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Subtle inner highlight (top-left)
        g.fillStyle(lightColor, 0.3);
        g.fillRect(x, y, TILE_SIZE, 2);
        g.fillRect(x, y, 2, TILE_SIZE);

        // Subtle shadow (bottom-right)
        g.fillStyle(0x000000, 0.15);
        g.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
        g.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);

        // Grid lines
        g.lineStyle(0.5, 0x000000, 0.1);
        g.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

        // Path decoration: small dots on path tiles
        if (tileType === 'PATH') {
          g.fillStyle(0x6b5510, 0.4);
          // Random-looking but deterministic pebbles
          const seed = (row * 17 + col * 31) % 7;
          g.fillCircle(x + 10 + seed * 2, y + 12 + seed, 2);
          g.fillCircle(x + 28 - seed, y + 30 - seed * 2, 1.5);
          if (seed > 3) g.fillCircle(x + 20 + seed, y + 22, 1.5);
        }

        // Build tile: tiny grass marks
        if (tileType === 'BUILD') {
          g.fillStyle(0x4a8a30, 0.25);
          const s = (row * 13 + col * 7) % 5;
          g.fillRect(x + 8 + s * 3, y + 15 + s, 1, 4);
          g.fillRect(x + 22 - s, y + 28 - s * 2, 1, 3);
          if (s > 2) g.fillRect(x + 32, y + 10 + s, 1, 4);
        }

        // CORE
        if (tileType === 'CORE') {
          // Glow
          g.fillStyle(0xff4444, 0.15);
          g.fillCircle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.7);

          this.add.text(x + TILE_SIZE / 2, y + TILE_SIZE / 2, '🏛️', {
            fontSize: `${TILE_SIZE * 0.7}px`,
          }).setOrigin(0.5).setDepth(1);
        }
      }
    }
  }

  // ─── Input ────────────────────────────────────────────────────────────────
  private handleClick(pointer: Phaser.Input.Pointer) {
    const col = Math.floor(pointer.x / TILE_SIZE);
    const row = Math.floor(pointer.y / TILE_SIZE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    // Click existing tower → select it
    const existing = this.state.towers.find(t => t.col === col && t.row === row);
    if (existing) {
      this.selectedTower = this.selectedTower?.id === existing.id ? null : existing;
      this.emitState();
      return;
    }

    // Deselect tower
    this.selectedTower = null;

    // Place tower
    if (this.state.phase !== 'placement' && this.state.phase !== 'wave_end') return;
    const tileType = this.levelConfig.grid[row]?.[col];
    if (tileType !== 'BUILD') return;
    const cost = TOWER_COSTS[this.selectedTowerType];
    if (this.state.gold < cost) return;
    if (this.state.towers.some(t => t.col === col && t.row === row)) return;

    const def = TOWER_DEFS[this.selectedTowerType];
    const tower: Tower = { ...def, id: uid(), col, row, lastShot: 0, level: 1, targeting: 'farthest' };
    this.state.towers.push(tower);
    this.state.gold -= cost;

    this.spawnPlaceEffect(tileCenter(col, row));
    this.emitState();
  }

  private handleHover(pointer: Phaser.Input.Pointer) {
    this.hoverCol = Math.floor(pointer.x / TILE_SIZE);
    this.hoverRow = Math.floor(pointer.y / TILE_SIZE);
  }

  // ─── Public API (called from React) ───────────────────────────────────────
  startWave() {
    if (this.state.phase !== 'placement' && this.state.phase !== 'wave_end') return;
    this.state.phase = 'battle';
    this.waveElapsed = 0;
    this.emitState();
  }

  setSpeed(speed: number) {
    this.state.speedMultiplier = speed;
    this.emitState();
  }

  setSelectedTowerType(type: TowerType) {
    this.selectedTowerType = type;
    this.selectedTower = null;
  }

  upgradeTower(tower: Tower) {
    const nextLevel = tower.level + 1;
    if (nextLevel > 3) return;
    const cost = UPGRADE_COSTS[tower.type][nextLevel];
    if (this.state.gold < cost) return;

    this.state.gold -= cost;
    tower.level = nextLevel;
    const baseDef = TOWER_DEFS[tower.type];
    const mult = UPGRADE_MULTIPLIERS[nextLevel];
    tower.damage = Math.round(baseDef.damage * mult.damage);
    tower.range = Math.round(baseDef.range * mult.range);
    tower.fireRate = +(baseDef.fireRate * mult.fireRate).toFixed(2);
    tower.emoji = UPGRADE_EMOJIS[tower.type][nextLevel];

    // Rebuild sprite
    const sprite = this.towerSprites.get(tower.id);
    if (sprite) { sprite.destroy(); this.towerSprites.delete(tower.id); }

    this.spawnUpgradeEffect(tileCenter(tower.col, tower.row));
    this.emitState();
  }

  sellTower(tower: Tower) {
    let total = TOWER_COSTS[tower.type];
    for (let lvl = 2; lvl <= tower.level; lvl++) total += UPGRADE_COSTS[tower.type][lvl];
    this.state.gold += Math.floor(total * SELL_REFUND_RATIO);
    this.state.towers = this.state.towers.filter(t => t.id !== tower.id);
    const sprite = this.towerSprites.get(tower.id);
    if (sprite) { sprite.destroy(); this.towerSprites.delete(tower.id); }
    this.selectedTower = null;
    this.spawnSellEffect(tileCenter(tower.col, tower.row));
    this.emitState();
  }

  setTargeting(tower: Tower, mode: TargetingMode) {
    tower.targeting = mode;
    this.emitState();
  }

  // ─── State emit ───────────────────────────────────────────────────────────
  private emitState() {
    this.sceneEvents.onStateChange({ ...this.state });
  }

  // ─── Effects ──────────────────────────────────────────────────────────────
  private spawnPlaceEffect(pos: { x: number; y: number }) {
    const c = this.add.graphics();
    c.lineStyle(2, 0x4caf50, 0.8);
    c.strokeCircle(pos.x, pos.y, 5);
    this.effectsLayer.add(c);
    this.tweens.add({ targets: c, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, ease: 'Quad.easeOut', onComplete: () => c.destroy() });
  }

  private spawnUpgradeEffect(pos: { x: number; y: number }) {
    const s = this.add.text(pos.x, pos.y, '⭐', { fontSize: '28px' }).setOrigin(0.5).setDepth(20);
    this.effectsLayer.add(s);
    this.tweens.add({ targets: s, y: pos.y - 35, alpha: 0, scale: 1.8, duration: 700, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
  }

  private spawnSellEffect(pos: { x: number; y: number }) {
    const s = this.add.text(pos.x, pos.y, '💰', { fontSize: '24px' }).setOrigin(0.5).setDepth(20);
    this.effectsLayer.add(s);
    this.tweens.add({ targets: s, y: pos.y - 40, alpha: 0, duration: 500, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
  }

  private spawnHitEffect(pos: { x: number; y: number }, aoe: boolean) {
    if (aoe) {
      const ring = this.add.graphics().setDepth(15);
      ring.lineStyle(3, 0xff6600, 1);
      ring.strokeCircle(pos.x, pos.y, 5);
      this.effectsLayer.add(ring);
      this.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 400, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });

      const flash = this.add.graphics().setDepth(14);
      flash.fillStyle(0xff4400, 0.5);
      flash.fillCircle(pos.x, pos.y, 25);
      this.effectsLayer.add(flash);
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 250, onComplete: () => flash.destroy() });
    } else {
      const spark = this.add.graphics().setDepth(15);
      spark.fillStyle(0xffffff, 0.9);
      spark.fillCircle(pos.x, pos.y, 3);
      this.effectsLayer.add(spark);
      this.tweens.add({ targets: spark, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 180, onComplete: () => spark.destroy() });
    }
  }

  private spawnKillEffect(pos: { x: number; y: number }, emoji: string) {
    const e = this.add.text(pos.x, pos.y, emoji, { fontSize: '28px' }).setOrigin(0.5).setDepth(20);
    this.effectsLayer.add(e);
    this.tweens.add({ targets: e, y: pos.y - 35, alpha: 0, scaleX: 1.6, scaleY: 1.6, rotation: 0.6, duration: 650, ease: 'Quad.easeOut', onComplete: () => e.destroy() });

    const g = this.add.text(pos.x + 12, pos.y - 5, '+💰', { fontSize: '12px', color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold' }).setOrigin(0.5).setDepth(20);
    this.effectsLayer.add(g);
    this.tweens.add({ targets: g, y: pos.y - 35, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
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
      for (const kill of result.kills) this.spawnKillEffect(kill.pos, kill.enemy.emoji);

      if (result.livesLost > 0) this.cameras.main.shake(200, 0.008 * result.livesLost);

      if (state.lives <= 0 && !this.gameOverFired) {
        this.gameOverFired = true;
        state.phase = 'defeat';
        this.emitState();
        this.sceneEvents.onGameOver();
        return;
      }

      if (result.waveComplete) {
        const nextWave = state.wave + 1;
        if (nextWave >= this.levelConfig.waves.length) {
          if (!this.victoryFired) {
            this.victoryFired = true;
            state.phase = 'victory';
            this.emitState();
            this.sceneEvents.onLevelComplete(Date.now() - this.gameStartTime);
          }
          return;
        } else {
          state.wave = nextWave;
          state.phase = 'wave_end';
          state.placementTimer = PLACEMENT_DURATION;
          state.enemies = buildSpawnQueue(this.levelConfig.waves[nextWave], this.levelConfig.paths);
          state.projectiles = [];
          this.waveElapsed = 0;
          this.cleanupEnemySprites();
        }
      }
    }

    // Render
    this.renderRange();
    this.renderTowers();
    this.renderEnemies();
    this.renderProjectiles();

    // Throttle state updates to React (~10 fps)
    this.stateChangeThrottle += delta;
    if (this.stateChangeThrottle > 100) {
      this.stateChangeThrottle = 0;
      this.emitState();
    }
  }

  // ─── Render range ─────────────────────────────────────────────────────────
  private renderRange() {
    this.rangeCircle.clear();

    // Selected tower range
    if (this.selectedTower) {
      const t = this.selectedTower;
      const cx = t.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = t.row * TILE_SIZE + TILE_SIZE / 2;
      const c = Phaser.Display.Color.HexStringToColor(t.color).color;
      this.rangeCircle.fillStyle(c, 0.1);
      this.rangeCircle.fillCircle(cx, cy, t.range);
      this.rangeCircle.lineStyle(2, c, 0.5);
      this.rangeCircle.strokeCircle(cx, cy, t.range);
    }

    // Hovered tower range
    if (this.hoverCol >= 0 && this.hoverRow >= 0) {
      const ht = this.state.towers.find(t => t.col === this.hoverCol && t.row === this.hoverRow);
      if (ht && ht !== this.selectedTower) {
        const cx = ht.col * TILE_SIZE + TILE_SIZE / 2;
        const cy = ht.row * TILE_SIZE + TILE_SIZE / 2;
        const c = Phaser.Display.Color.HexStringToColor(ht.color).color;
        this.rangeCircle.lineStyle(1.5, c, 0.35);
        this.rangeCircle.strokeCircle(cx, cy, ht.range);
      }

      // Preview placement range
      const isPlacing = this.state.phase === 'placement' || this.state.phase === 'wave_end';
      if (isPlacing && !ht) {
        const tileType = this.levelConfig.grid[this.hoverRow]?.[this.hoverCol];
        if (tileType === 'BUILD' && !this.state.towers.some(t => t.col === this.hoverCol && t.row === this.hoverRow)) {
          const def = TOWER_DEFS[this.selectedTowerType];
          const cx = this.hoverCol * TILE_SIZE + TILE_SIZE / 2;
          const cy = this.hoverRow * TILE_SIZE + TILE_SIZE / 2;
          this.rangeCircle.fillStyle(0xffffff, 0.08);
          this.rangeCircle.fillRect(this.hoverCol * TILE_SIZE, this.hoverRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.rangeCircle.lineStyle(1, 0xffffff, 0.25);
          this.rangeCircle.strokeCircle(cx, cy, def.range);
        }
      }
    }
  }

  // ─── Render towers ────────────────────────────────────────────────────────
  private renderTowers() {
    const activeIds = new Set(this.state.towers.map(t => t.id));

    for (const [id, sprite] of this.towerSprites) {
      if (!activeIds.has(id)) { sprite.destroy(); this.towerSprites.delete(id); }
    }

    for (const tower of this.state.towers) {
      const cx = tower.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = tower.row * TILE_SIZE + TILE_SIZE / 2;
      let sprite = this.towerSprites.get(tower.id);

      if (!sprite) {
        sprite = this.add.container(cx, cy).setDepth(5);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillEllipse(2, 4, TILE_SIZE * 0.8, TILE_SIZE * 0.4);
        sprite.add(shadow);

        // Base circle
        const circle = this.add.graphics();
        const color = Phaser.Display.Color.HexStringToColor(tower.color).color;
        circle.fillStyle(color, 1);
        circle.fillCircle(0, 0, TILE_SIZE * 0.42);
        // Highlight
        circle.fillStyle(0xffffff, 0.2);
        circle.fillCircle(-3, -4, TILE_SIZE * 0.2);
        // Border
        circle.lineStyle(2, 0xffffff, 0.4);
        circle.strokeCircle(0, 0, TILE_SIZE * 0.42);
        sprite.add(circle);

        // Emoji
        const emojiText = this.add.text(0, -1, tower.emoji, { fontSize: `${TILE_SIZE * 0.5}px` }).setOrigin(0.5);
        sprite.add(emojiText);

        // Level stars
        if (tower.level > 1) {
          const stars = '★'.repeat(tower.level - 1);
          const lvl = this.add.text(0, -TILE_SIZE * 0.48, stars, { fontSize: '9px', color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold' }).setOrigin(0.5);
          sprite.add(lvl);
        }

        this.towerSprites.set(tower.id, sprite);
      }

      sprite.setPosition(cx, cy);

      // Highlight selected
      const isSelected = this.selectedTower?.id === tower.id;
      if (isSelected) {
        sprite.setScale(1.1);
      } else {
        sprite.setScale(1);
      }
    }
  }

  // ─── Render enemies ───────────────────────────────────────────────────────
  private renderEnemies() {
    const activeIds = new Set<string>();

    for (const enemy of this.state.enemies) {
      if (!enemy.alive || !enemy.spawned || enemy.reached) continue;
      activeIds.add(enemy.id);

      let sprite = this.enemySprites.get(enemy.id);

      if (!sprite) {
        sprite = this.add.container(enemy.pos.x, enemy.pos.y).setDepth(10);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.25);
        shadow.fillEllipse(1, 6, 16, 6);
        sprite.add(shadow);

        // Status overlay
        const status = this.add.graphics().setName('status');
        sprite.add(status);

        // HP bar bg
        const hpBg = this.add.graphics();
        hpBg.fillStyle(0x000000, 0.6);
        hpBg.fillRoundedRect(-15, -20, 30, 5, 2);
        sprite.add(hpBg);

        // HP bar fill
        const hpBar = this.add.graphics().setName('hpBar');
        sprite.add(hpBar);

        // Emoji
        const sz = enemy.type === 'boss' ? TILE_SIZE * 0.9 : TILE_SIZE * 0.6;
        const emojiText = this.add.text(0, 0, enemy.emoji, { fontSize: `${sz}px` }).setOrigin(0.5);
        sprite.add(emojiText);

        this.enemySprites.set(enemy.id, sprite);
      }

      // Update position with slight bobbing
      const bob = Math.sin(this.time.now / 300 + enemy.pos.x) * 1.5;
      sprite.setPosition(enemy.pos.x, enemy.pos.y + bob);

      // HP bar
      const hpBar = sprite.getByName('hpBar') as Phaser.GameObjects.Graphics;
      if (hpBar) {
        hpBar.clear();
        const pct = Math.max(0, enemy.hp / enemy.maxHp);
        const hpColor = pct > 0.5 ? 0x4caf50 : pct > 0.25 ? 0xff9800 : 0xf44336;
        hpBar.fillStyle(hpColor, 1);
        hpBar.fillRoundedRect(-14, -19, 28 * pct, 3, 1);
      }

      // Status
      const status = sprite.getByName('status') as Phaser.GameObjects.Graphics;
      if (status) {
        status.clear();
        if (enemy.frozen) {
          status.fillStyle(0x4fc3f7, 0.35);
          status.fillCircle(0, 0, 15);
          status.lineStyle(1, 0x4fc3f7, 0.6);
          status.strokeCircle(0, 0, 15);
        } else if (enemy.slow < 1) {
          status.fillStyle(0x0096c8, 0.25);
          status.fillCircle(0, 0, 13);
        }
      }
    }

    // Cleanup
    for (const [id, sprite] of this.enemySprites) {
      if (!activeIds.has(id)) { sprite.destroy(); this.enemySprites.delete(id); }
    }
  }

  private cleanupEnemySprites() {
    for (const [, sprite] of this.enemySprites) sprite.destroy();
    this.enemySprites.clear();
  }

  // ─── Render projectiles ───────────────────────────────────────────────────
  private renderProjectiles() {
    this.projectileLayer.clear();
    this.projectileLayer.setDepth(12);

    for (const proj of this.state.projectiles) {
      if (proj.dead) continue;
      const c = Phaser.Display.Color.HexStringToColor(proj.color).color;

      // Glow
      this.projectileLayer.fillStyle(c, 0.2);
      this.projectileLayer.fillCircle(proj.pos.x, proj.pos.y, 8);
      // Trail
      this.projectileLayer.fillStyle(c, 0.4);
      this.projectileLayer.fillCircle(proj.pos.x, proj.pos.y, 5);
      // Core
      this.projectileLayer.fillStyle(c, 1);
      this.projectileLayer.fillCircle(proj.pos.x, proj.pos.y, 3);
      // White center
      this.projectileLayer.fillStyle(0xffffff, 0.7);
      this.projectileLayer.fillCircle(proj.pos.x, proj.pos.y, 1.5);
    }
  }
}
