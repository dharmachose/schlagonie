import * as Phaser from 'phaser';
import type { GameState, Tower, TowerType, TargetingMode, LevelConfig } from '../types';
import { LEVELS } from '../levels';
import {
  TOWER_DEFS, TOWER_COSTS,
  PLACEMENT_DURATION, UPGRADE_MULTIPLIERS, UPGRADE_COSTS,
  UPGRADE_EMOJIS, SELL_REFUND_RATIO, ENEMY_DEFS,
  PROJECTILE_EMOJIS,
} from '../config';
import { buildSpawnQueue, updateBattle, dist, findTarget } from '../engine';

// Grid dimensions are read from levelConfig (cols/rows)

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
  gridOffsetX: number;
  gridOffsetY: number;
  events: TowerSceneEvents;
}

export default class TowerScene extends Phaser.Scene {
  private levelIndex = 0;
  private levelConfig!: LevelConfig;
  private sceneEvents!: TowerSceneEvents;
  private T = 40;
  private ox = 0; // grid offset X
  private oy = 0; // grid offset Y

  state!: GameState;
  private waveElapsed = 0;
  private gameStartTime = 0;
  private gameOverFired = false;
  private victoryFired = false;

  private gridLayer!: Phaser.GameObjects.Graphics;
  private rangeCircle!: Phaser.GameObjects.Graphics;
  private targetLineLayer!: Phaser.GameObjects.Graphics;
  private effectsLayer!: Phaser.GameObjects.Container;
  private towerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private enemySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private projSprites: Map<string, Phaser.GameObjects.Container> = new Map();

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
    this.ox = data.gridOffsetX;
    this.oy = data.gridOffsetY;
  }

  // Tile center in pixels (with grid offset)
  private tc(col: number, row: number) {
    return {
      x: col * this.T + this.T / 2 + this.ox,
      y: row * this.T + this.T / 2 + this.oy,
    };
  }

  // Scale engine position (TILE_SIZE=40) to screen position (with offset)
  private scalePos(pos: { x: number; y: number }) {
    const ratio = this.T / 40;
    return {
      x: pos.x * ratio + this.ox,
      y: pos.y * ratio + this.oy,
    };
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
    this.targetLineLayer = this.add.graphics().setDepth(2);
    this.rangeCircle = this.add.graphics().setDepth(3);
    this.effectsLayer = this.add.container(0, 0).setDepth(20);

    this.drawGrid();

    // Prevent page scrolling on the canvas
    const canvas = this.game.canvas;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.handleClick(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.hoverCol = Math.floor((p.x - this.ox) / this.T);
      this.hoverRow = Math.floor((p.y - this.oy) / this.T);
    });
    // Clear hover on touch end so range preview doesn't persist on mobile
    this.input.on('pointerup', () => { this.hoverCol = -1; this.hoverRow = -1; });
    this.input.on('pointerupoutside', () => { this.hoverCol = -1; this.hoverRow = -1; });

    this.emitState();
  }

  // ─── Grid ─────────────────────────────────────────────────────────────────
  private drawGrid() {
    const g = this.gridLayer;
    const T = this.T;
    const ox = this.ox;
    const oy = this.oy;
    g.clear();

    // Decorative border around grid
    const gridW = T * this.levelConfig.cols;
    const gridH = T * this.levelConfig.rows;

    // Subtle vignette / frame around the grid
    g.fillStyle(0x0a150a, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);

    // Decorative forest border strips
    if (oy > 4) {
      // Top decorative strip
      g.fillStyle(0x1a2a1a, 1);
      g.fillRect(0, oy - 4, this.scale.width, 4);
      g.fillStyle(0x142014, 0.8);
      g.fillRect(0, 0, this.scale.width, oy - 4);
      // Bottom decorative strip
      g.fillStyle(0x1a2a1a, 1);
      g.fillRect(0, oy + gridH, this.scale.width, 4);
      g.fillStyle(0x142014, 0.8);
      g.fillRect(0, oy + gridH + 4, this.scale.width, this.scale.height);
    }

    // Grid border glow
    g.lineStyle(2, 0x3a5a2a, 0.6);
    g.strokeRect(ox - 1, oy - 1, gridW + 2, gridH + 2);

    for (let row = 0; row < this.levelConfig.rows; row++) {
      for (let col = 0; col < this.levelConfig.cols; col++) {
        const tt = this.levelConfig.grid[row]?.[col] ?? 'BUILD';
        const x = col * T + ox;
        const y = row * T + oy;

        // Base fill
        g.fillStyle(TILE_COLORS[tt] ?? TILE_COLORS.BUILD, 1);
        g.fillRect(x, y, T, T);

        // Subtle noise variation
        const seed = (row * 17 + col * 31 + row * col * 7) % 100;
        const variation = (seed - 50) / 500;
        if (tt === 'BUILD' || tt === 'BLOCKED') {
          g.fillStyle(0x000000, Math.abs(variation));
          g.fillRect(x, y, T, T);
        }

        // Top/left highlight
        g.fillStyle(TILE_LIGHT[tt] ?? TILE_LIGHT.BUILD, 0.3);
        g.fillRect(x, y, T, 2);
        g.fillRect(x, y, 2, T);

        // Bottom/right shadow
        g.fillStyle(0x000000, 0.15);
        g.fillRect(x, y + T - 2, T, 2);
        g.fillRect(x + T - 2, y, 2, T);

        // Grid line
        g.lineStyle(0.5, 0x000000, 0.06);
        g.strokeRect(x, y, T, T);

        // Path details
        if (tt === 'PATH') {
          g.fillStyle(0x5a4a0a, 0.25);
          g.fillRect(x, y, T, 3);
          g.fillRect(x, y + T - 3, T, 3);
          g.fillRect(x, y, 3, T);
          g.fillRect(x + T - 3, y, 3, T);
          const s = seed;
          g.fillStyle(0x6b5510, 0.35);
          g.fillCircle(x + T * 0.25 + (s % 7), y + T * 0.3 + (s % 5) * 0.5, T * 0.04);
          g.fillCircle(x + T * 0.7 - (s % 6) * 0.5, y + T * 0.75 - (s % 4) * 0.3, T * 0.035);
          g.fillStyle(0xb89830, 0.08);
          g.fillRect(x + T * 0.3, y + T * 0.35, T * 0.4, T * 0.3);
        }

        // Build grass
        if (tt === 'BUILD') {
          const s = seed;
          g.fillStyle(0x4a8a30, 0.25);
          g.fillRect(x + T * 0.15 + (s % 4) * 2, y + T * 0.3, 1.5, T * 0.12);
          g.fillRect(x + T * 0.55 - (s % 3), y + T * 0.65, 1.5, T * 0.1);
          if (s % 8 === 0) {
            g.fillStyle(0xffeb3b, 0.3);
            g.fillCircle(x + T * 0.4, y + T * 0.55, T * 0.025);
          }
          if (s % 11 === 0) {
            g.fillStyle(0xff8a80, 0.25);
            g.fillCircle(x + T * 0.7, y + T * 0.35, T * 0.025);
          }
        }

        // CORE
        if (tt === 'CORE') {
          g.fillStyle(0xff2222, 0.06);
          g.fillCircle(x + T / 2, y + T / 2, T * 0.9);
          g.fillStyle(0xff4444, 0.1);
          g.fillCircle(x + T / 2, y + T / 2, T * 0.65);
          const coreSprite = this.add.text(x + T / 2, y + T / 2, '🏛️', {
            fontSize: `${T * 0.8}px`,
          }).setOrigin(0.5).setDepth(1);
          this.tweens.add({
            targets: coreSprite, scaleX: 1.15, scaleY: 1.15,
            duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }
      }
    }

    this.drawPathArrows();
  }

  private drawPathArrows() {
    const g = this.gridLayer;
    const T = this.T;
    for (const path of this.levelConfig.paths) {
      for (let i = 0; i < path.length - 1; i += 2) {
        const cur = path[i];
        const next = path[Math.min(i + 1, path.length - 1)];
        const dx = next.col - cur.col;
        const dy = next.row - cur.row;
        const cx = cur.col * T + T / 2 + this.ox;
        const cy = cur.row * T + T / 2 + this.oy;
        g.lineStyle(1.5, 0xb89830, 0.2);
        const a = T * 0.15;
        if (dx > 0) { g.lineBetween(cx + a * 0.5, cy - a, cx + a * 1.5, cy); g.lineBetween(cx + a * 0.5, cy + a, cx + a * 1.5, cy); }
        else if (dx < 0) { g.lineBetween(cx - a * 0.5, cy - a, cx - a * 1.5, cy); g.lineBetween(cx - a * 0.5, cy + a, cx - a * 1.5, cy); }
        else if (dy > 0) { g.lineBetween(cx - a, cy + a * 0.5, cx, cy + a * 1.5); g.lineBetween(cx + a, cy + a * 0.5, cx, cy + a * 1.5); }
        else if (dy < 0) { g.lineBetween(cx - a, cy - a * 0.5, cx, cy - a * 1.5); g.lineBetween(cx + a, cy - a * 0.5, cx, cy - a * 1.5); }
      }
    }
  }

  // ─── Input ────────────────────────────────────────────────────────────────
  private handleClick(pointer: Phaser.Input.Pointer) {
    const col = Math.floor((pointer.x - this.ox) / this.T);
    const row = Math.floor((pointer.y - this.oy) / this.T);
    if (col < 0 || col >= this.levelConfig.cols || row < 0 || row >= this.levelConfig.rows) return;

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

    const pos = this.tc(col, row);
    this.spawnEffect(pos, '✨', 0x4caf50);
    this.spawnPlacementRing(pos, Phaser.Display.Color.HexStringToColor(def.color).color);
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
    const pos = this.tc(tower.col, tower.row);
    this.spawnEffect(pos, '⭐', 0xffd700);
    this.spawnUpgradeRing(pos);
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
  private spawnEffect(pos: { x: number; y: number }, emoji: string, _color: number) {
    const txt = this.add.text(pos.x, pos.y, emoji, { fontSize: `${this.T * 0.7}px` }).setOrigin(0.5).setDepth(25);
    this.effectsLayer.add(txt);
    this.tweens.add({
      targets: txt, y: pos.y - this.T * 0.8, alpha: 0, scale: 1.5,
      duration: 600, ease: 'Quad.easeOut', onComplete: () => txt.destroy(),
    });
  }

  private spawnPlacementRing(pos: { x: number; y: number }, color: number) {
    const ring = this.add.graphics().setDepth(15);
    ring.lineStyle(2.5, color, 0.8);
    ring.strokeCircle(pos.x, pos.y, this.T * 0.2);
    this.effectsLayer.add(ring);
    this.tweens.add({
      targets: ring, scaleX: 3, scaleY: 3, alpha: 0,
      duration: 450, ease: 'Quad.easeOut', onComplete: () => ring.destroy(),
    });
  }

  private spawnUpgradeRing(pos: { x: number; y: number }) {
    for (let i = 0; i < 2; i++) {
      const ring = this.add.graphics().setDepth(15);
      ring.lineStyle(2, 0xffd700, 0.7);
      ring.strokeCircle(pos.x, pos.y, this.T * 0.15);
      this.effectsLayer.add(ring);
      this.tweens.add({
        targets: ring, scaleX: 4, scaleY: 4, alpha: 0,
        duration: 500, delay: i * 120, ease: 'Quad.easeOut', onComplete: () => ring.destroy(),
      });
    }
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const spark = this.add.text(
        pos.x + Math.cos(angle) * this.T * 0.15,
        pos.y + Math.sin(angle) * this.T * 0.15,
        '✦', { fontSize: `${this.T * 0.2}px`, color: '#FFD700' }
      ).setOrigin(0.5).setDepth(25);
      this.effectsLayer.add(spark);
      this.tweens.add({
        targets: spark,
        x: pos.x + Math.cos(angle) * this.T * 0.7,
        y: pos.y + Math.sin(angle) * this.T * 0.7,
        alpha: 0, scale: 0.3, duration: 450, ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private spawnHitEffect(pos: { x: number; y: number }, aoe: boolean, damage: number) {
    const p = this.scalePos(pos);
    if (aoe) {
      for (let i = 0; i < 3; i++) {
        const ring = this.add.graphics().setDepth(15);
        const colors = [0xff6600, 0xff4400, 0xff8800];
        ring.lineStyle(3 - i, colors[i], 0.9 - i * 0.25);
        ring.strokeCircle(p.x, p.y, this.T * 0.12);
        this.effectsLayer.add(ring);
        this.tweens.add({
          targets: ring, scaleX: 4 + i, scaleY: 4 + i, alpha: 0,
          duration: 350 + i * 80, delay: i * 40, ease: 'Quad.easeOut',
          onComplete: () => ring.destroy(),
        });
      }
      const flash = this.add.graphics().setDepth(14);
      flash.fillStyle(0xff4400, 0.5);
      flash.fillCircle(p.x, p.y, this.T * 0.5);
      this.effectsLayer.add(flash);
      this.tweens.add({
        targets: flash, alpha: 0, scaleX: 1.8, scaleY: 1.8,
        duration: 250, onComplete: () => flash.destroy(),
      });
      const boom = this.add.text(p.x, p.y, '💥', { fontSize: `${this.T * 0.5}px` }).setOrigin(0.5).setDepth(25);
      this.effectsLayer.add(boom);
      this.tweens.add({
        targets: boom, alpha: 0, scale: 1.8, duration: 400,
        ease: 'Quad.easeOut', onComplete: () => boom.destroy(),
      });
    } else {
      const spark = this.add.graphics().setDepth(15);
      spark.fillStyle(0xffffff, 0.9);
      spark.fillCircle(p.x, p.y, this.T * 0.07);
      this.effectsLayer.add(spark);
      this.tweens.add({
        targets: spark, alpha: 0, scaleX: 3, scaleY: 3,
        duration: 150, onComplete: () => spark.destroy(),
      });
    }
    if (damage > 0) {
      const dmgColor = aoe ? '#FF6600' : '#FFFFFF';
      const dmgTxt = this.add.text(
        p.x + (Math.random() - 0.5) * this.T * 0.3, p.y - this.T * 0.2, `-${damage}`,
        { fontSize: `${this.T * (aoe ? 0.3 : 0.22)}px`, color: dmgColor, fontFamily: 'sans-serif', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 }
      ).setOrigin(0.5).setDepth(26);
      this.effectsLayer.add(dmgTxt);
      this.tweens.add({
        targets: dmgTxt, y: p.y - this.T * 0.9, alpha: 0,
        duration: 700, ease: 'Quad.easeOut', onComplete: () => dmgTxt.destroy(),
      });
    }
  }

  private spawnKillEffect(pos: { x: number; y: number }, emoji: string, reward: number) {
    const p = this.scalePos(pos);
    const e = this.add.text(p.x, p.y, emoji, { fontSize: `${this.T * 0.8}px` }).setOrigin(0.5).setDepth(25);
    this.effectsLayer.add(e);
    this.tweens.add({
      targets: e, y: p.y - this.T * 1.0, alpha: 0, scaleX: 1.6, scaleY: 1.6, rotation: 0.6,
      duration: 650, ease: 'Quad.easeOut', onComplete: () => e.destroy(),
    });
    const flash = this.add.graphics().setDepth(14);
    flash.fillStyle(0xffffff, 0.4);
    flash.fillCircle(p.x, p.y, this.T * 0.3);
    this.effectsLayer.add(flash);
    this.tweens.add({
      targets: flash, alpha: 0, scaleX: 2.5, scaleY: 2.5,
      duration: 200, onComplete: () => flash.destroy(),
    });
    const g = this.add.text(p.x + this.T * 0.3, p.y, `+${reward}g`, {
      fontSize: `${this.T * 0.3}px`, color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25);
    this.effectsLayer.add(g);
    this.tweens.add({
      targets: g, y: p.y - this.T * 1.1, alpha: 0,
      duration: 900, ease: 'Quad.easeOut', onComplete: () => g.destroy(),
    });
  }

  private spawnShootPulse(towerId: string) {
    const sp = this.towerSprites.get(towerId);
    if (!sp) return;
    this.tweens.add({
      targets: sp, scaleX: 1.25, scaleY: 1.25,
      duration: 80, yoyo: true, ease: 'Quad.easeOut',
    });
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

      for (const hit of result.hits) this.spawnHitEffect(hit.pos, hit.aoe, hit.damage);
      for (const kill of result.kills) this.spawnKillEffect(kill.pos, kill.enemy.emoji, kill.enemy.reward);
      for (const shot of result.shots) this.spawnShootPulse(shot.towerId);

      if (result.livesLost >= 3) this.cameras.main.shake(150, 0.003);
      else if (result.livesLost === 1) this.cameras.main.shake(80, 0.001);

      if (state.lives <= 0 && !this.gameOverFired) {
        this.gameOverFired = true;
        state.phase = 'defeat';
        this.cameras.main.shake(300, 0.008);
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
          this.cleanupProjSprites();
        }
      }
    }

    this.renderTargetLines();
    this.renderRange();
    this.renderTowers();
    this.renderEnemies();
    this.renderProjectiles();

    this.stateThrottle += delta;
    if (this.stateThrottle > 100) { this.stateThrottle = 0; this.emitState(); }
  }

  // ─── Target lines ─────────────────────────────────────────────────────────
  private renderTargetLines() {
    const tl = this.targetLineLayer;
    tl.clear();
    if (this.state.phase !== 'battle') return;

    for (const tower of this.state.towers) {
      const target = findTarget(tower, this.state.enemies);
      if (!target) continue;
      const tc = this.tc(tower.col, tower.row);
      const ep = this.scalePos(target.pos);
      const c = Phaser.Display.Color.HexStringToColor(tower.color).color;
      tl.lineStyle(1, c, 0.12);
      tl.lineBetween(tc.x, tc.y, ep.x, ep.y);
      tl.lineStyle(1, c, 0.2);
      const s = this.T * 0.1;
      tl.lineBetween(ep.x - s, ep.y, ep.x + s, ep.y);
      tl.lineBetween(ep.x, ep.y - s, ep.x, ep.y + s);
    }
  }

  // ─── Range ────────────────────────────────────────────────────────────────
  private renderRange() {
    const rc = this.rangeCircle;
    rc.clear();
    const ratio = this.T / 40;

    if (this.selectedTower) {
      const t = this.selectedTower;
      const { x: cx, y: cy } = this.tc(t.col, t.row);
      const r = t.range * ratio;
      const c = Phaser.Display.Color.HexStringToColor(t.color).color;
      rc.fillStyle(c, 0.1);
      rc.fillCircle(cx, cy, r);
      rc.lineStyle(2, c, 0.5);
      rc.strokeCircle(cx, cy, r);
      rc.lineStyle(1, c, 0.15);
      rc.strokeCircle(cx, cy, r * 0.6);
    }

    if (this.hoverCol >= 0 && this.hoverRow >= 0 && this.hoverCol < this.levelConfig.cols && this.hoverRow < this.levelConfig.rows) {
      const ht = this.state.towers.find(t => t.col === this.hoverCol && t.row === this.hoverRow);
      if (ht && ht !== this.selectedTower) {
        const { x: cx, y: cy } = this.tc(ht.col, ht.row);
        rc.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(ht.color).color, 0.3);
        rc.strokeCircle(cx, cy, ht.range * ratio);
      }

      const isP = this.state.phase === 'placement' || this.state.phase === 'wave_end';
      if (isP && !ht && this.levelConfig.grid[this.hoverRow]?.[this.hoverCol] === 'BUILD'
          && !this.state.towers.some(t => t.col === this.hoverCol && t.row === this.hoverRow)) {
        const def = TOWER_DEFS[this.selectedTowerType];
        const { x: cx, y: cy } = this.tc(this.hoverCol, this.hoverRow);
        rc.fillStyle(0xffffff, 0.08);
        rc.fillRect(this.hoverCol * this.T + this.ox, this.hoverRow * this.T + this.oy, this.T, this.T);
        const c = Phaser.Display.Color.HexStringToColor(def.color).color;
        rc.lineStyle(1.5, c, 0.25);
        rc.strokeCircle(cx, cy, def.range * ratio);
        rc.fillStyle(c, 0.06);
        rc.fillCircle(cx, cy, def.range * ratio);
        rc.fillStyle(c, 0.2);
        rc.fillCircle(cx, cy, this.T * 0.35);
      }
    }
  }

  // ─── Towers ───────────────────────────────────────────────────────────────
  private renderTowers() {
    const T = this.T;
    const activeIds = new Set(this.state.towers.map(t => t.id));
    for (const [id, s] of this.towerSprites) {
      if (!activeIds.has(id)) { s.destroy(); this.towerSprites.delete(id); }
    }

    for (const tower of this.state.towers) {
      const { x: cx, y: cy } = this.tc(tower.col, tower.row);
      let sp = this.towerSprites.get(tower.id);

      if (!sp) {
        sp = this.add.container(cx, cy).setDepth(5);
        const c = Phaser.Display.Color.HexStringToColor(tower.color).color;

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillEllipse(T * 0.04, T * 0.12, T * 0.72, T * 0.32);
        sp.add(shadow);

        const platform = this.add.graphics();
        platform.fillStyle(c, 0.3);
        platform.fillCircle(0, 0, T * 0.47);
        sp.add(platform);

        const base = this.add.graphics();
        base.fillStyle(c, 1);
        base.fillCircle(0, 0, T * 0.42);
        base.fillStyle(0xffffff, 0.2);
        base.fillCircle(-T * 0.1, -T * 0.12, T * 0.2);
        base.lineStyle(2.5, 0xffffff, 0.3);
        base.strokeCircle(0, 0, T * 0.42);
        base.lineStyle(1, 0xffffff, 0.1);
        base.strokeCircle(0, 0, T * 0.3);
        sp.add(base);

        sp.add(this.add.text(0, -T * 0.02, tower.emoji, { fontSize: `${T * 0.6}px` }).setOrigin(0.5));

        if (tower.level > 1) {
          const stars = '★'.repeat(tower.level - 1);
          sp.add(this.add.text(0, -T * 0.5, stars, {
            fontSize: `${T * 0.22}px`, color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 1,
          }).setOrigin(0.5));
        }

        if (tower.level === 3) {
          const aura = this.add.graphics().setName('aura');
          aura.lineStyle(1.5, c, 0.3);
          aura.strokeCircle(0, 0, T * 0.52);
          sp.add(aura);
          this.tweens.add({
            targets: aura, scaleX: 1.3, scaleY: 1.3, alpha: 0.1,
            duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
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

      const ep = this.scalePos(enemy.pos);

      let sp = this.enemySprites.get(enemy.id);

      if (!sp) {
        sp = this.add.container(ep.x, ep.y).setDepth(10);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.25);
        shadow.fillEllipse(1, T * 0.17, T * 0.5, T * 0.18);
        sp.add(shadow);

        const status = this.add.graphics().setName('status');
        sp.add(status);

        const hpBg = this.add.graphics();
        const barW = T * 0.72;
        hpBg.fillStyle(0x000000, 0.6);
        hpBg.fillRoundedRect(-barW / 2 - 1, -T * 0.54, barW + 2, T * 0.14, 2);
        hpBg.fillStyle(0x333333, 0.4);
        hpBg.fillRoundedRect(-barW / 2, -T * 0.53, barW, T * 0.12, 2);
        sp.add(hpBg);

        sp.add(this.add.graphics().setName('hpBar'));

        const isBoss = enemy.type === 'boss';
        const sz = isBoss ? T * 1.05 : T * 0.75;
        sp.add(this.add.text(0, 0, enemy.emoji, { fontSize: `${sz}px` }).setOrigin(0.5));

        if (isBoss) {
          const glow = this.add.graphics().setName('bossGlow');
          glow.fillStyle(0xffd700, 0.15);
          glow.fillCircle(0, 0, T * 0.55);
          sp.addAt(glow, 1);
          this.tweens.add({
            targets: glow, scaleX: 1.3, scaleY: 1.3, alpha: 0.05,
            duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }

        if (enemy.type === 'mamie') {
          const healAura = this.add.graphics().setName('healAura');
          healAura.lineStyle(1.5, 0x4caf50, 0.3);
          healAura.strokeCircle(0, 0, 60 * ratio);
          healAura.fillStyle(0x4caf50, 0.05);
          healAura.fillCircle(0, 0, 60 * ratio);
          sp.addAt(healAura, 1);
          this.tweens.add({
            targets: healAura, scaleX: 1.15, scaleY: 1.15, alpha: 0.3,
            duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }

        this.enemySprites.set(enemy.id, sp);
      }

      const bob = Math.sin(this.time.now / 350 + ep.x * 0.1) * T * 0.03;
      sp.setPosition(ep.x, ep.y + bob);

      const hpBar = sp.getByName('hpBar') as Phaser.GameObjects.Graphics;
      if (hpBar) {
        hpBar.clear();
        const pct = Math.max(0, enemy.hp / enemy.maxHp);
        const barW = T * 0.72;
        const barH = T * 0.1;
        let c: number;
        if (pct > 0.6) c = 0x4caf50;
        else if (pct > 0.35) c = 0xffc107;
        else if (pct > 0.15) c = 0xff9800;
        else c = 0xf44336;
        hpBar.fillStyle(c, 1);
        hpBar.fillRoundedRect(-barW / 2 + 1, -T * 0.52, (barW - 2) * pct, barH - 2, 1);
        hpBar.fillStyle(0xffffff, 0.15);
        hpBar.fillRoundedRect(-barW / 2 + 1, -T * 0.52, (barW - 2) * pct, (barH - 2) * 0.4, 1);
      }

      const status = sp.getByName('status') as Phaser.GameObjects.Graphics;
      if (status) {
        status.clear();
        if (enemy.frozen) {
          status.fillStyle(0x4fc3f7, 0.35);
          status.fillCircle(0, 0, T * 0.42);
          status.lineStyle(2, 0x81d4fa, 0.7);
          status.strokeCircle(0, 0, T * 0.42);
          status.lineStyle(1.5, 0xb3e5fc, 0.6);
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const len = T * 0.35;
            status.lineBetween(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
          }
        } else if (enemy.slow < 1) {
          status.fillStyle(0x0096c8, 0.2);
          status.fillCircle(0, 0, T * 0.37);
          status.lineStyle(1, 0x4fc3f7, 0.35);
          status.strokeCircle(0, 0, T * 0.37);
        }
      }
    }

    for (const [id, s] of this.enemySprites) {
      if (!activeIds.has(id)) { s.destroy(); this.enemySprites.delete(id); }
    }
  }

  private cleanupEnemySprites() {
    for (const [, s] of this.enemySprites) s.destroy();
    this.enemySprites.clear();
  }

  private cleanupProjSprites() {
    for (const [, s] of this.projSprites) s.destroy();
    this.projSprites.clear();
  }

  // ─── Projectiles ──────────────────────────────────────────────────────────
  private renderProjectiles() {
    const activeIds = new Set<string>();

    for (const proj of this.state.projectiles) {
      if (proj.dead) continue;
      activeIds.add(proj.id);

      const pp = this.scalePos(proj.pos);

      let sp = this.projSprites.get(proj.id);

      if (!sp) {
        sp = this.add.container(pp.x, pp.y).setDepth(12);
        const c = Phaser.Display.Color.HexStringToColor(proj.color).color;

        const glow = this.add.graphics();
        glow.fillStyle(c, 0.2);
        glow.fillCircle(0, 0, this.T * 0.25);
        sp.add(glow);

        const trail = this.add.graphics();
        trail.fillStyle(c, 0.35);
        trail.fillCircle(0, 0, this.T * 0.15);
        sp.add(trail);

        const emoji = PROJECTILE_EMOJIS[proj.towerType] || '•';
        sp.add(this.add.text(0, 0, emoji, { fontSize: `${this.T * 0.35}px` }).setOrigin(0.5));

        this.projSprites.set(proj.id, sp);
      }

      sp.setPosition(pp.x, pp.y);
      sp.setRotation(sp.rotation + 0.15);
    }

    for (const [id, s] of this.projSprites) {
      if (!activeIds.has(id)) { s.destroy(); this.projSprites.delete(id); }
    }
  }
}
