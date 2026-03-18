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
  private T = 40;

  state!: GameState;
  private waveElapsed = 0;
  private gameStartTime = 0;
  private gameOverFired = false;
  private victoryFired = false;

  private gridLayer!: Phaser.GameObjects.Graphics;
  private rangeCircle!: Phaser.GameObjects.Graphics;
  private projectileLayer!: Phaser.GameObjects.Container;
  private targetLineLayer!: Phaser.GameObjects.Graphics;
  private effectsLayer!: Phaser.GameObjects.Container;
  private towerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private enemySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private projSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private coreSprite: Phaser.GameObjects.Text | null = null;

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

  private tc(col: number, row: number) {
    return { x: col * this.T + this.T / 2, y: row * this.T + this.T / 2 };
  }

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
    this.targetLineLayer = this.add.graphics().setDepth(2);
    this.rangeCircle = this.add.graphics().setDepth(3);
    this.projectileLayer = this.add.container(0, 0).setDepth(12);
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

        // Base fill
        g.fillStyle(TILE_COLORS[tt] ?? TILE_COLORS.BUILD, 1);
        g.fillRect(x, y, T, T);

        // Subtle noise variation for terrain richness
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

        // Path details - richer pebbles and dirt texture
        if (tt === 'PATH') {
          // Worn path edges (darker border)
          g.fillStyle(0x5a4a0a, 0.25);
          g.fillRect(x, y, T, 3);
          g.fillRect(x, y + T - 3, T, 3);
          g.fillRect(x, y, 3, T);
          g.fillRect(x + T - 3, y, 3, T);

          // Scattered pebbles
          const s = seed;
          g.fillStyle(0x6b5510, 0.35);
          g.fillCircle(x + T * 0.25 + (s % 7), y + T * 0.3 + (s % 5) * 0.5, T * 0.04);
          g.fillCircle(x + T * 0.7 - (s % 6) * 0.5, y + T * 0.75 - (s % 4) * 0.3, T * 0.035);
          g.fillStyle(0x9a7a20, 0.2);
          g.fillCircle(x + T * 0.5 + (s % 3), y + T * 0.5, T * 0.03);

          // Light center streak
          g.fillStyle(0xb89830, 0.08);
          g.fillRect(x + T * 0.3, y + T * 0.35, T * 0.4, T * 0.3);
        }

        // Build grass - multiple tufts
        if (tt === 'BUILD') {
          const s = seed;
          // Grass tufts
          g.fillStyle(0x4a8a30, 0.25);
          g.fillRect(x + T * 0.15 + (s % 4) * 2, y + T * 0.3, 1.5, T * 0.12);
          g.fillRect(x + T * 0.18 + (s % 4) * 2, y + T * 0.3, 1.5, T * 0.09);
          g.fillRect(x + T * 0.55 - (s % 3), y + T * 0.65, 1.5, T * 0.1);
          g.fillRect(x + T * 0.58 - (s % 3), y + T * 0.65, 1.5, T * 0.08);
          // Tiny flowers
          if (s % 8 === 0) {
            g.fillStyle(0xffeb3b, 0.3);
            g.fillCircle(x + T * 0.4, y + T * 0.55, T * 0.025);
          }
          if (s % 11 === 0) {
            g.fillStyle(0xff8a80, 0.25);
            g.fillCircle(x + T * 0.7, y + T * 0.35, T * 0.025);
          }
          // Dark dirt spots
          g.fillStyle(0x1a3a0a, 0.1);
          g.fillCircle(x + T * 0.35 + (s % 5), y + T * 0.8, T * 0.03);
        }

        // BLOCKED - moss and rocks
        if (tt === 'BLOCKED') {
          const s = seed;
          g.fillStyle(0x2a4a1a, 0.3);
          g.fillCircle(x + T * 0.3 + (s % 5), y + T * 0.4, T * 0.06);
          g.fillCircle(x + T * 0.65 - (s % 4), y + T * 0.6, T * 0.05);
          // Moss
          g.fillStyle(0x3a6a2a, 0.15);
          g.fillRect(x + T * 0.1 + (s % 3), y + T * 0.5, T * 0.15, T * 0.04);
        }

        // CORE - pulsing glow ring
        if (tt === 'CORE') {
          // Multiple glow layers
          g.fillStyle(0xff2222, 0.06);
          g.fillCircle(x + T / 2, y + T / 2, T * 0.9);
          g.fillStyle(0xff4444, 0.1);
          g.fillCircle(x + T / 2, y + T / 2, T * 0.65);
          g.fillStyle(0xff6666, 0.08);
          g.fillCircle(x + T / 2, y + T / 2, T * 0.45);

          this.coreSprite = this.add.text(x + T / 2, y + T / 2, '🏛️', {
            fontSize: `${T * 0.8}px`,
          }).setOrigin(0.5).setDepth(1);

          // Core pulse animation
          this.tweens.add({
            targets: this.coreSprite,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      }
    }

    // Draw path direction arrows
    this.drawPathArrows();
  }

  // ─── Path direction arrows ────────────────────────────────────────────────
  private drawPathArrows() {
    const g = this.gridLayer;
    const T = this.T;

    for (const path of this.levelConfig.paths) {
      for (let i = 0; i < path.length - 1; i += 2) {
        const cur = path[i];
        const next = path[Math.min(i + 1, path.length - 1)];
        const dx = next.col - cur.col;
        const dy = next.row - cur.row;

        const cx = cur.col * T + T / 2;
        const cy = cur.row * T + T / 2;

        // Draw small directional chevron
        g.lineStyle(1.5, 0xb89830, 0.2);
        const arrowSize = T * 0.15;
        if (dx > 0) { // right
          g.lineBetween(cx + arrowSize * 0.5, cy - arrowSize, cx + arrowSize * 1.5, cy);
          g.lineBetween(cx + arrowSize * 0.5, cy + arrowSize, cx + arrowSize * 1.5, cy);
        } else if (dx < 0) { // left
          g.lineBetween(cx - arrowSize * 0.5, cy - arrowSize, cx - arrowSize * 1.5, cy);
          g.lineBetween(cx - arrowSize * 0.5, cy + arrowSize, cx - arrowSize * 1.5, cy);
        } else if (dy > 0) { // down
          g.lineBetween(cx - arrowSize, cy + arrowSize * 0.5, cx, cy + arrowSize * 1.5);
          g.lineBetween(cx + arrowSize, cy + arrowSize * 0.5, cx, cy + arrowSize * 1.5);
        } else if (dy < 0) { // up
          g.lineBetween(cx - arrowSize, cy - arrowSize * 0.5, cx, cy - arrowSize * 1.5);
          g.lineBetween(cx + arrowSize, cy - arrowSize * 0.5, cx, cy - arrowSize * 1.5);
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

    // Placement effect: ring + sparkle
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
    // Upgrade sparkle ring
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
    // Double ring expand
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
    // Sparkle particles
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
      // Multi-ring AOE explosion
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

      // Central flash
      const flash = this.add.graphics().setDepth(14);
      flash.fillStyle(0xff4400, 0.5);
      flash.fillCircle(p.x, p.y, this.T * 0.5);
      this.effectsLayer.add(flash);
      this.tweens.add({
        targets: flash, alpha: 0, scaleX: 1.8, scaleY: 1.8,
        duration: 250, onComplete: () => flash.destroy(),
      });

      // Explosion emoji
      const boom = this.add.text(p.x, p.y, '💥', {
        fontSize: `${this.T * 0.5}px`,
      }).setOrigin(0.5).setDepth(25);
      this.effectsLayer.add(boom);
      this.tweens.add({
        targets: boom, alpha: 0, scale: 1.8, duration: 400,
        ease: 'Quad.easeOut', onComplete: () => boom.destroy(),
      });
    } else {
      // Single hit spark
      const spark = this.add.graphics().setDepth(15);
      spark.fillStyle(0xffffff, 0.9);
      spark.fillCircle(p.x, p.y, this.T * 0.07);
      this.effectsLayer.add(spark);
      this.tweens.add({
        targets: spark, alpha: 0, scaleX: 3, scaleY: 3,
        duration: 150, onComplete: () => spark.destroy(),
      });
    }

    // Floating damage number
    if (damage > 0) {
      const dmgColor = aoe ? '#FF6600' : '#FFFFFF';
      const dmgTxt = this.add.text(
        p.x + (Math.random() - 0.5) * this.T * 0.3,
        p.y - this.T * 0.2,
        `-${damage}`,
        {
          fontSize: `${this.T * (aoe ? 0.3 : 0.22)}px`,
          color: dmgColor,
          fontFamily: 'sans-serif',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2,
        }
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

    // Enemy emoji explodes out with more drama
    const e = this.add.text(p.x, p.y, emoji, { fontSize: `${this.T * 0.8}px` }).setOrigin(0.5).setDepth(25);
    this.effectsLayer.add(e);
    this.tweens.add({
      targets: e, y: p.y - this.T * 1.0, alpha: 0, scaleX: 1.6, scaleY: 1.6, rotation: 0.6,
      duration: 650, ease: 'Quad.easeOut', onComplete: () => e.destroy(),
    });

    // Death flash
    const flash = this.add.graphics().setDepth(14);
    flash.fillStyle(0xffffff, 0.4);
    flash.fillCircle(p.x, p.y, this.T * 0.3);
    this.effectsLayer.add(flash);
    this.tweens.add({
      targets: flash, alpha: 0, scaleX: 2.5, scaleY: 2.5,
      duration: 200, onComplete: () => flash.destroy(),
    });

    // Gold reward text
    const g = this.add.text(p.x + this.T * 0.3, p.y, `+${reward}g`, {
      fontSize: `${this.T * 0.3}px`, color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25);
    this.effectsLayer.add(g);
    this.tweens.add({
      targets: g, y: p.y - this.T * 1.1, alpha: 0,
      duration: 900, ease: 'Quad.easeOut', onComplete: () => g.destroy(),
    });

    // Gold coin particles
    for (let i = 0; i < 3; i++) {
      const coin = this.add.text(
        p.x + (Math.random() - 0.5) * this.T * 0.5,
        p.y,
        '💰',
        { fontSize: `${this.T * 0.18}px` }
      ).setOrigin(0.5).setDepth(25);
      this.effectsLayer.add(coin);
      this.tweens.add({
        targets: coin,
        x: p.x + (Math.random() - 0.5) * this.T * 1.2,
        y: p.y - this.T * 0.4 - Math.random() * this.T * 0.6,
        alpha: 0, scale: 0.4,
        duration: 500 + Math.random() * 300,
        ease: 'Quad.easeOut',
        onComplete: () => coin.destroy(),
      });
    }
  }

  private spawnShootPulse(towerId: string) {
    const sp = this.towerSprites.get(towerId);
    if (!sp) return;
    // Quick scale pulse on the tower
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
      if (result.livesLost === 1) this.cameras.main.shake(80, 0.001);

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

    const ratio = this.T / 40;

    for (const tower of this.state.towers) {
      const target = findTarget(tower, this.state.enemies);
      if (!target) continue;

      const cx = tower.col * this.T + this.T / 2;
      const cy = tower.row * this.T + this.T / 2;
      const ex = target.pos.x * ratio;
      const ey = target.pos.y * ratio;

      const c = Phaser.Display.Color.HexStringToColor(tower.color).color;
      tl.lineStyle(1, c, 0.12);
      tl.lineBetween(cx, cy, ex, ey);

      // Small crosshair on target
      tl.lineStyle(1, c, 0.2);
      const s = this.T * 0.1;
      tl.lineBetween(ex - s, ey, ex + s, ey);
      tl.lineBetween(ex, ey - s, ex, ey + s);
    }
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

      // Filled range with dashed outer ring
      rc.fillStyle(c, 0.1);
      rc.fillCircle(cx, cy, r);
      rc.lineStyle(2, c, 0.5);
      rc.strokeCircle(cx, cy, r);
      // Inner bright ring
      rc.lineStyle(1, c, 0.15);
      rc.strokeCircle(cx, cy, r * 0.6);
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

        // Ghost tower preview
        rc.fillStyle(0xffffff, 0.08);
        rc.fillRect(this.hoverCol * this.T, this.hoverRow * this.T, this.T, this.T);
        const c = Phaser.Display.Color.HexStringToColor(def.color).color;
        rc.lineStyle(1.5, c, 0.25);
        rc.strokeCircle(cx, cy, def.range * ratio);
        rc.fillStyle(c, 0.06);
        rc.fillCircle(cx, cy, def.range * ratio);
        // Ghost tower base
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
      const cx = tower.col * T + T / 2;
      const cy = tower.row * T + T / 2;
      let sp = this.towerSprites.get(tower.id);

      if (!sp) {
        sp = this.add.container(cx, cy).setDepth(5);

        const c = Phaser.Display.Color.HexStringToColor(tower.color).color;

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillEllipse(T * 0.04, T * 0.12, T * 0.72, T * 0.32);
        sp.add(shadow);

        // Base platform (darker outer ring)
        const platform = this.add.graphics();
        platform.fillStyle(c, 0.3);
        platform.fillCircle(0, 0, T * 0.47);
        sp.add(platform);

        // Main base
        const base = this.add.graphics();
        base.fillStyle(c, 1);
        base.fillCircle(0, 0, T * 0.42);
        // Highlight shine (top-left)
        base.fillStyle(0xffffff, 0.2);
        base.fillCircle(-T * 0.1, -T * 0.12, T * 0.2);
        // Outer ring
        base.lineStyle(2.5, 0xffffff, 0.3);
        base.strokeCircle(0, 0, T * 0.42);
        // Inner ring
        base.lineStyle(1, 0xffffff, 0.1);
        base.strokeCircle(0, 0, T * 0.3);
        sp.add(base);

        // Emoji
        const emoji = this.add.text(0, -T * 0.02, tower.emoji, {
          fontSize: `${T * 0.6}px`,
        }).setOrigin(0.5);
        sp.add(emoji);

        // Level stars with glow
        if (tower.level > 1) {
          const stars = '★'.repeat(tower.level - 1);
          const starTxt = this.add.text(0, -T * 0.5, stars, {
            fontSize: `${T * 0.22}px`, color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 1,
          }).setOrigin(0.5);
          sp.add(starTxt);
        }

        // Level 3 special aura
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
      const isSelected = this.selectedTower?.id === tower.id;
      sp.setScale(isSelected ? 1.12 : 1);
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
        shadow.fillStyle(0x000000, 0.25);
        shadow.fillEllipse(1, T * 0.17, T * 0.5, T * 0.18);
        sp.add(shadow);

        // Status overlay
        const status = this.add.graphics().setName('status');
        sp.add(status);

        // HP bar background with border
        const hpBg = this.add.graphics();
        const barW = T * 0.72;
        hpBg.fillStyle(0x000000, 0.6);
        hpBg.fillRoundedRect(-barW / 2 - 1, -T * 0.54, barW + 2, T * 0.14, 2);
        hpBg.fillStyle(0x333333, 0.4);
        hpBg.fillRoundedRect(-barW / 2, -T * 0.53, barW, T * 0.12, 2);
        sp.add(hpBg);

        // HP bar
        const hpBar = this.add.graphics().setName('hpBar');
        sp.add(hpBar);

        // Emoji
        const isBoss = enemy.type === 'boss';
        const sz = isBoss ? T * 1.05 : T * 0.75;
        const emojiTxt = this.add.text(0, 0, enemy.emoji, {
          fontSize: `${sz}px`,
        }).setOrigin(0.5).setName('emoji');
        sp.add(emojiTxt);

        // Boss crown glow
        if (isBoss) {
          const glow = this.add.graphics().setName('bossGlow');
          glow.fillStyle(0xffd700, 0.15);
          glow.fillCircle(0, 0, T * 0.55);
          sp.addAt(glow, 1); // behind emoji but above shadow
          this.tweens.add({
            targets: glow, scaleX: 1.3, scaleY: 1.3, alpha: 0.05,
            duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }

        // Mamie healing aura
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

      // Position with subtle bob
      const bob = Math.sin(this.time.now / 350 + ex * 0.1) * T * 0.03;
      sp.setPosition(ex, ey + bob);

      // HP bar update
      const hpBar = sp.getByName('hpBar') as Phaser.GameObjects.Graphics;
      if (hpBar) {
        hpBar.clear();
        const pct = Math.max(0, enemy.hp / enemy.maxHp);
        const barW = T * 0.72;
        const barH = T * 0.1;
        // Gradient HP color
        let c: number;
        if (pct > 0.6) c = 0x4caf50;
        else if (pct > 0.35) c = 0xffc107;
        else if (pct > 0.15) c = 0xff9800;
        else c = 0xf44336;

        hpBar.fillStyle(c, 1);
        hpBar.fillRoundedRect(-barW / 2 + 1, -T * 0.52, (barW - 2) * pct, barH - 2, 1);
        // HP bar shine
        hpBar.fillStyle(0xffffff, 0.15);
        hpBar.fillRoundedRect(-barW / 2 + 1, -T * 0.52, (barW - 2) * pct, (barH - 2) * 0.4, 1);
      }

      // Status overlay (frozen/slowed)
      const status = sp.getByName('status') as Phaser.GameObjects.Graphics;
      if (status) {
        status.clear();
        if (enemy.frozen) {
          // Ice crystal effect
          status.fillStyle(0x4fc3f7, 0.35);
          status.fillCircle(0, 0, T * 0.42);
          status.lineStyle(2, 0x81d4fa, 0.7);
          status.strokeCircle(0, 0, T * 0.42);
          // Ice crystal shapes
          status.lineStyle(1.5, 0xb3e5fc, 0.6);
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const len = T * 0.35;
            status.lineBetween(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
          }
          // Outer frost ring
          status.lineStyle(1, 0xe1f5fe, 0.3);
          status.strokeCircle(0, 0, T * 0.5);
        } else if (enemy.slow < 1) {
          // Slow swirl effect
          status.fillStyle(0x0096c8, 0.2);
          status.fillCircle(0, 0, T * 0.37);
          status.lineStyle(1, 0x4fc3f7, 0.35);
          status.strokeCircle(0, 0, T * 0.37);
          // Slow arrows
          status.lineStyle(1, 0x80deea, 0.4);
          for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i + this.time.now / 500;
            const r = T * 0.3;
            status.lineBetween(
              Math.cos(angle) * r * 0.5, Math.sin(angle) * r * 0.5,
              Math.cos(angle) * r, Math.sin(angle) * r
            );
          }
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

  // ─── Projectiles (emoji-based) ────────────────────────────────────────────
  private renderProjectiles() {
    const ratio = this.T / 40;
    const activeIds = new Set<string>();

    for (const proj of this.state.projectiles) {
      if (proj.dead) continue;
      activeIds.add(proj.id);

      const px = proj.pos.x * ratio;
      const py = proj.pos.y * ratio;

      let sp = this.projSprites.get(proj.id);

      if (!sp) {
        sp = this.add.container(px, py).setDepth(12);

        const c = Phaser.Display.Color.HexStringToColor(proj.color).color;

        // Glow background
        const glow = this.add.graphics();
        glow.fillStyle(c, 0.2);
        glow.fillCircle(0, 0, this.T * 0.25);
        sp.add(glow);

        // Trail glow
        const trail = this.add.graphics().setName('trail');
        trail.fillStyle(c, 0.35);
        trail.fillCircle(0, 0, this.T * 0.15);
        sp.add(trail);

        // Projectile emoji
        const emoji = PROJECTILE_EMOJIS[proj.towerType] || '•';
        const projTxt = this.add.text(0, 0, emoji, {
          fontSize: `${this.T * 0.35}px`,
        }).setOrigin(0.5);
        sp.add(projTxt);

        this.projSprites.set(proj.id, sp);
      }

      sp.setPosition(px, py);

      // Slight rotation for visual flair
      sp.setRotation(sp.rotation + 0.15);
    }

    // Cleanup dead projectiles
    for (const [id, s] of this.projSprites) {
      if (!activeIds.has(id)) { s.destroy(); this.projSprites.delete(id); }
    }
  }
}
