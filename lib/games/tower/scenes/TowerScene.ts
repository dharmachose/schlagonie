import * as Phaser from 'phaser';
import type { GameState, Tower, TowerType, TargetingMode, LevelConfig, EnemyType } from '../types';
import { LEVELS } from '../levels';
import {
  TILE_SIZE, TOWER_DEFS, TOWER_COSTS, TOWER_LABELS,
  PLACEMENT_DURATION, UPGRADE_MULTIPLIERS, UPGRADE_COSTS,
  UPGRADE_EMOJIS, SELL_REFUND_RATIO, ENEMY_DEFS, ENEMY_LABELS,
} from '../config';
import { tileCenter, buildSpawnQueue, updateBattle, dist } from '../engine';

const CANVAS_W = 16 * TILE_SIZE;
const CANVAS_H = 11 * TILE_SIZE;

const TILE_COLORS: Record<string, number> = {
  BUILD:   0x2d5a1b,
  PATH:    0x8B6914,
  BLOCKED: 0x1a3a0a,
  CORE:    0x8B0000,
};

const TOWER_TYPES: TowerType[] = ['canon', 'baffe', 'piege', 'mortier', 'glace'];
const TARGETING_MODES: TargetingMode[] = ['farthest', 'closest', 'strongest', 'weakest'];
const TARGETING_LABELS: Record<TargetingMode, string> = {
  farthest: '→ Dernier',
  closest: '← Premier',
  strongest: '💪 Fort',
  weakest: '🩸 Faible',
};

let _idCounter = 0;
const uid = () => `t${++_idCounter}`;

interface TowerSceneData {
  levelIndex: number;
  onLevelComplete: (elapsedMs: number) => void;
  onGameOver: () => void;
}

export default class TowerScene extends Phaser.Scene {
  // Config
  private levelIndex = 0;
  private levelConfig!: LevelConfig;
  private onLevelComplete!: (elapsedMs: number) => void;
  private onGameOver!: () => void;

  // Game state
  private state!: GameState;
  private waveElapsed = 0;
  private gameStartTime = 0;
  private gameOverFired = false;
  private victoryFired = false;

  // Selection
  private selectedTowerType: TowerType = 'canon';
  private selectedTower: Tower | null = null;

  // Graphics layers
  private gridLayer!: Phaser.GameObjects.Graphics;
  private towerLayer!: Phaser.GameObjects.Container;
  private enemyLayer!: Phaser.GameObjects.Container;
  private projectileLayer!: Phaser.GameObjects.Graphics;
  private effectsLayer!: Phaser.GameObjects.Container;
  private rangeCircle!: Phaser.GameObjects.Graphics;
  private hudContainer!: Phaser.GameObjects.Container;

  // HUD elements
  private livesText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;

  // Bottom UI
  private uiContainer!: Phaser.GameObjects.Container;
  private towerButtons: Phaser.GameObjects.Container[] = [];
  private selectedHighlight!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private launchButton!: Phaser.GameObjects.Container;
  private speedButtons: Phaser.GameObjects.Container[] = [];

  // Tower info panel (when tower selected)
  private towerInfoPanel!: Phaser.GameObjects.Container;

  // Wave preview
  private wavePreviewContainer!: Phaser.GameObjects.Container;

  // Hover state
  private hoverCol = -1;
  private hoverRow = -1;

  // Tower sprites map
  private towerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private enemySprites: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super({ key: 'TowerScene' });
  }

  init(data: TowerSceneData) {
    this.levelIndex = data.levelIndex;
    this.levelConfig = LEVELS[this.levelIndex];
    this.onLevelComplete = data.onLevelComplete;
    this.onGameOver = data.onGameOver;
  }

  create() {
    this.gameStartTime = Date.now();
    this.gameOverFired = false;
    this.victoryFired = false;

    // Initialize game state
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

    // Create layers
    this.gridLayer = this.add.graphics();
    this.rangeCircle = this.add.graphics();
    this.towerLayer = this.add.container(0, 0);
    this.enemyLayer = this.add.container(0, 0);
    this.projectileLayer = this.add.graphics();
    this.effectsLayer = this.add.container(0, 0);

    // Draw static grid
    this.drawGrid();

    // Create HUD (top bar)
    this.createHUD();

    // Create bottom UI
    this.createBottomUI();

    // Create tower info panel (hidden by default)
    this.createTowerInfoPanel();

    // Create wave preview
    this.createWavePreview();

    // Input: canvas click
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer);
    });

    // Input: pointer move for hover
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleHover(pointer);
    });

    // Show initial wave preview
    this.updateWavePreview();
  }

  // ─── Draw the static grid ────────────────────────────────────────────────
  private drawGrid() {
    const g = this.gridLayer;
    g.clear();

    for (let row = 0; row < this.levelConfig.rows; row++) {
      for (let col = 0; col < this.levelConfig.cols; col++) {
        const tileType = this.levelConfig.grid[row]?.[col] ?? 'BUILD';
        const color = TILE_COLORS[tileType] ?? TILE_COLORS.BUILD;

        g.fillStyle(color, 1);
        g.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Grid lines
        g.lineStyle(0.5, 0x000000, 0.15);
        g.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // CORE emoji
        if (tileType === 'CORE') {
          this.add.text(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, '🏛️', {
            fontSize: `${TILE_SIZE * 0.8}px`,
          }).setOrigin(0.5);
        }
      }
    }
  }

  // ─── HUD (top bar) ───────────────────────────────────────────────────────
  private createHUD() {
    const hudY = CANVAS_H;
    const hudH = 32;
    this.hudContainer = this.add.container(0, hudY);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x111111, 1);
    bg.fillRect(0, 0, CANVAS_W, hudH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, CANVAS_W, 1);
    this.hudContainer.add(bg);

    this.livesText = this.add.text(12, 8, '', { fontSize: '13px', color: '#f44336', fontFamily: 'sans-serif' });
    this.goldText = this.add.text(80, 8, '', { fontSize: '13px', color: '#FFD700', fontFamily: 'sans-serif' });
    this.waveText = this.add.text(170, 8, '', { fontSize: '12px', color: '#aaaaaa', fontFamily: 'sans-serif' });
    this.phaseText = this.add.text(310, 8, '', { fontSize: '12px', color: '#ff9800', fontFamily: 'sans-serif', fontStyle: 'bold' });
    this.timerText = this.add.text(430, 8, '', { fontSize: '12px', color: '#4caf50', fontFamily: 'sans-serif', fontStyle: 'bold' });

    // Speed controls
    this.speedText = this.add.text(530, 8, '', { fontSize: '12px', color: '#90caf9', fontFamily: 'sans-serif' });

    const speeds = [0, 1, 2, 3];
    const speedLabels = ['⏸', '▶', '▶▶', '▶▶▶'];
    speeds.forEach((spd, i) => {
      const bx = 560 + i * 22;
      const btn = this.add.container(bx, 4);
      const btnBg = this.add.graphics();
      btnBg.fillStyle(spd === 1 ? 0x4caf50 : 0x333333, 1);
      btnBg.fillRoundedRect(0, 0, 20, 22, 4);
      const btnText = this.add.text(10, 11, speedLabels[i], {
        fontSize: '8px', color: '#fff', fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      btn.add([btnBg, btnText]);
      btn.setSize(20, 22);
      btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 20, 22), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerdown', () => {
        this.state.speedMultiplier = spd;
        this.updateSpeedButtons();
      });
      this.speedButtons.push(btn);
      this.hudContainer.add(btn);
    });

    this.hudContainer.add([this.livesText, this.goldText, this.waveText, this.phaseText, this.timerText, this.speedText]);
  }

  private updateSpeedButtons() {
    const speeds = [0, 1, 2, 3];
    this.speedButtons.forEach((btn, i) => {
      const bg = btn.getAt(0) as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(this.state.speedMultiplier === speeds[i] ? 0x4caf50 : 0x333333, 1);
      bg.fillRoundedRect(0, 0, 20, 22, 4);
    });
  }

  // ─── Bottom UI (tower selection) ──────────────────────────────────────────
  private createBottomUI() {
    const uiY = CANVAS_H + 32;
    this.uiContainer = this.add.container(0, uiY);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x111111, 1);
    bg.fillRect(0, 0, CANVAS_W, 80);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, CANVAS_W, 1);
    this.uiContainer.add(bg);

    // Tower buttons
    this.selectedHighlight = this.add.graphics();
    this.uiContainer.add(this.selectedHighlight);

    const startX = CANVAS_W / 2 - (TOWER_TYPES.length * 56) / 2;
    TOWER_TYPES.forEach((type, i) => {
      const def = TOWER_DEFS[type];
      const cost = TOWER_COSTS[type];
      const bx = startX + i * 56;

      const btn = this.add.container(bx, 8);

      const btnBg = this.add.graphics();
      btnBg.fillStyle(0x1a1a1a, 1);
      btnBg.fillRoundedRect(0, 0, 50, 48, 8);
      btnBg.lineStyle(2, 0x333333, 1);
      btnBg.strokeRoundedRect(0, 0, 50, 48, 8);

      const emoji = this.add.text(25, 16, def.emoji, {
        fontSize: '22px',
      }).setOrigin(0.5);

      const costText = this.add.text(25, 38, `${cost}g`, {
        fontSize: '10px', color: '#FFD700', fontFamily: 'sans-serif',
      }).setOrigin(0.5);

      btn.add([btnBg, emoji, costText]);
      btn.setSize(50, 48);
      btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 50, 48), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerdown', () => {
        this.selectedTowerType = type;
        this.selectedTower = null;
        this.hideTowerInfoPanel();
        this.updateTowerButtons();
      });

      this.towerButtons.push(btn);
      this.uiContainer.add(btn);
    });

    // Info text
    this.infoText = this.add.text(CANVAS_W / 2, 62, '', {
      fontSize: '11px', color: '#888888', fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    this.uiContainer.add(this.infoText);

    // Launch button
    this.launchButton = this.add.container(CANVAS_W - 90, 20);
    const lbBg = this.add.graphics();
    lbBg.fillStyle(0x4caf50, 1);
    lbBg.fillRoundedRect(0, 0, 80, 36, 8);
    const lbText = this.add.text(40, 18, '⚔️ Lancer', {
      fontSize: '12px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.launchButton.add([lbBg, lbText]);
    this.launchButton.setSize(80, 36);
    this.launchButton.setInteractive(new Phaser.Geom.Rectangle(0, 0, 80, 36), Phaser.Geom.Rectangle.Contains);
    this.launchButton.on('pointerdown', () => {
      if (this.state.phase === 'placement' || this.state.phase === 'wave_end') {
        this.startWave();
      }
    });
    this.uiContainer.add(this.launchButton);

    this.updateTowerButtons();
  }

  private updateTowerButtons() {
    const highlight = this.selectedHighlight;
    highlight.clear();

    const startX = CANVAS_W / 2 - (TOWER_TYPES.length * 56) / 2;
    TOWER_TYPES.forEach((type, i) => {
      const def = TOWER_DEFS[type];
      const cost = TOWER_COSTS[type];
      const canAfford = this.state.gold >= cost;
      const selected = this.selectedTowerType === type;
      const bx = startX + i * 56;

      const btn = this.towerButtons[i];
      btn.setAlpha(canAfford ? 1 : 0.5);

      if (selected) {
        const color = Phaser.Display.Color.HexStringToColor(def.color).color;
        highlight.lineStyle(2, color, 1);
        highlight.strokeRoundedRect(bx - 1, 7, 52, 50, 8);
      }
    });

    const def = TOWER_DEFS[this.selectedTowerType];
    const cost = TOWER_COSTS[this.selectedTowerType];
    this.infoText.setText(`${TOWER_LABELS[this.selectedTowerType]} · ${cost}g · DMG:${def.damage} · RNG:${def.range}`);

    // Show/hide launch button
    const isPlacing = this.state.phase === 'placement' || this.state.phase === 'wave_end';
    this.launchButton.setVisible(isPlacing);
  }

  // ─── Tower Info Panel (upgrade/sell/targeting) ────────────────────────────
  private createTowerInfoPanel() {
    this.towerInfoPanel = this.add.container(0, 0);
    this.towerInfoPanel.setVisible(false);
    this.towerInfoPanel.setDepth(100);
  }

  private showTowerInfoPanel(tower: Tower) {
    this.selectedTower = tower;
    this.towerInfoPanel.removeAll(true);

    const px = tower.col * TILE_SIZE + TILE_SIZE / 2;
    const py = tower.row * TILE_SIZE;

    // Position panel above or below tower
    const panelY = py > 120 ? py - 100 : py + TILE_SIZE + 8;
    const panelX = Math.max(10, Math.min(px - 100, CANVAS_W - 210));

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.95);
    bg.fillRoundedRect(panelX, panelY, 200, 90, 8);
    bg.lineStyle(1, 0x555555, 1);
    bg.strokeRoundedRect(panelX, panelY, 200, 90, 8);
    this.towerInfoPanel.add(bg);

    // Tower name + level
    const emoji = UPGRADE_EMOJIS[tower.type][tower.level];
    const nameText = this.add.text(panelX + 8, panelY + 6, `${emoji} ${TOWER_LABELS[tower.type]} Nv.${tower.level}`, {
      fontSize: '11px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    this.towerInfoPanel.add(nameText);

    // Stats
    const statsText = this.add.text(panelX + 8, panelY + 22, `DMG:${tower.damage} RNG:${tower.range} FR:${tower.fireRate.toFixed(1)}/s`, {
      fontSize: '9px', color: '#aaaaaa', fontFamily: 'sans-serif',
    });
    this.towerInfoPanel.add(statsText);

    // Buttons row
    let btnX = panelX + 8;
    const btnY = panelY + 40;

    // Upgrade button
    if (tower.level < 3) {
      const upgCost = UPGRADE_COSTS[tower.type][tower.level + 1];
      const canUpgrade = this.state.gold >= upgCost;
      const upgBtn = this.add.container(btnX, btnY);
      const upgBg = this.add.graphics();
      upgBg.fillStyle(canUpgrade ? 0x2196f3 : 0x444444, 1);
      upgBg.fillRoundedRect(0, 0, 70, 22, 4);
      const upgText = this.add.text(35, 11, `⬆ ${upgCost}g`, {
        fontSize: '10px', color: canUpgrade ? '#fff' : '#888', fontFamily: 'sans-serif', fontStyle: 'bold',
      }).setOrigin(0.5);
      upgBtn.add([upgBg, upgText]);
      upgBtn.setSize(70, 22);
      upgBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 70, 22), Phaser.Geom.Rectangle.Contains);
      upgBtn.on('pointerdown', () => {
        if (canUpgrade) {
          this.upgradeTower(tower);
        }
      });
      this.towerInfoPanel.add(upgBtn);
      btnX += 76;
    }

    // Sell button
    const totalInvested = this.getTowerTotalCost(tower);
    const sellValue = Math.floor(totalInvested * SELL_REFUND_RATIO);
    const sellBtn = this.add.container(btnX, btnY);
    const sellBg = this.add.graphics();
    sellBg.fillStyle(0xf44336, 1);
    sellBg.fillRoundedRect(0, 0, 60, 22, 4);
    const sellText = this.add.text(30, 11, `💰 ${sellValue}g`, {
      fontSize: '10px', color: '#fff', fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5);
    sellBtn.add([sellBg, sellText]);
    sellBtn.setSize(60, 22);
    sellBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 60, 22), Phaser.Geom.Rectangle.Contains);
    sellBtn.on('pointerdown', () => {
      this.sellTower(tower);
    });
    this.towerInfoPanel.add(sellBtn);

    // Targeting mode buttons
    const targetY = panelY + 66;
    TARGETING_MODES.forEach((mode, i) => {
      const tx = panelX + 8 + i * 48;
      const active = tower.targeting === mode;
      const tBtn = this.add.container(tx, targetY);
      const tBg = this.add.graphics();
      tBg.fillStyle(active ? 0x4caf50 : 0x333333, 1);
      tBg.fillRoundedRect(0, 0, 44, 18, 3);
      const tText = this.add.text(22, 9, TARGETING_LABELS[mode], {
        fontSize: '7px', color: '#fff', fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      tBtn.add([tBg, tText]);
      tBtn.setSize(44, 18);
      tBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 44, 18), Phaser.Geom.Rectangle.Contains);
      tBtn.on('pointerdown', () => {
        tower.targeting = mode;
        this.showTowerInfoPanel(tower);
      });
      this.towerInfoPanel.add(tBtn);
    });

    this.towerInfoPanel.setVisible(true);
  }

  private hideTowerInfoPanel() {
    this.towerInfoPanel.setVisible(false);
    this.selectedTower = null;
  }

  private getTowerTotalCost(tower: Tower): number {
    let total = TOWER_COSTS[tower.type];
    for (let lvl = 2; lvl <= tower.level; lvl++) {
      total += UPGRADE_COSTS[tower.type][lvl];
    }
    return total;
  }

  private upgradeTower(tower: Tower) {
    const nextLevel = tower.level + 1;
    if (nextLevel > 3) return;
    const cost = UPGRADE_COSTS[tower.type][nextLevel];
    if (this.state.gold < cost) return;

    this.state.gold -= cost;
    tower.level = nextLevel;

    // Apply upgrade multipliers
    const baseDef = TOWER_DEFS[tower.type];
    const mult = UPGRADE_MULTIPLIERS[nextLevel];
    tower.damage = Math.round(baseDef.damage * mult.damage);
    tower.range = Math.round(baseDef.range * mult.range);
    tower.fireRate = +(baseDef.fireRate * mult.fireRate).toFixed(2);
    tower.emoji = UPGRADE_EMOJIS[tower.type][nextLevel];

    // Visual feedback
    const pos = tileCenter(tower.col, tower.row);
    this.spawnUpgradeEffect(pos);

    // Refresh panel
    this.showTowerInfoPanel(tower);
    this.updateTowerButtons();
  }

  private sellTower(tower: Tower) {
    const totalInvested = this.getTowerTotalCost(tower);
    const sellValue = Math.floor(totalInvested * SELL_REFUND_RATIO);
    this.state.gold += sellValue;

    // Remove tower
    this.state.towers = this.state.towers.filter(t => t.id !== tower.id);

    // Remove sprite
    const sprite = this.towerSprites.get(tower.id);
    if (sprite) {
      sprite.destroy();
      this.towerSprites.delete(tower.id);
    }

    // Visual feedback
    const pos = tileCenter(tower.col, tower.row);
    this.spawnSellEffect(pos);

    this.hideTowerInfoPanel();
    this.updateTowerButtons();
  }

  // ─── Wave Preview ─────────────────────────────────────────────────────────
  private createWavePreview() {
    this.wavePreviewContainer = this.add.container(0, 0);
    this.wavePreviewContainer.setDepth(50);
  }

  private updateWavePreview() {
    this.wavePreviewContainer.removeAll(true);

    const waveIdx = this.state.wave;
    if (waveIdx >= this.levelConfig.waves.length) return;

    const wave = this.levelConfig.waves[waveIdx];
    const isPlacing = this.state.phase === 'placement' || this.state.phase === 'wave_end';
    if (!isPlacing) return;

    // Show preview in top-right
    const px = CANVAS_W - 10;
    const py = 8;

    const title = this.add.text(px, py, `Vague ${waveIdx + 1}`, {
      fontSize: '10px', color: '#ff9800', fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.wavePreviewContainer.add(title);

    let yOff = 20;
    for (const spawn of wave.spawns) {
      const def = ENEMY_DEFS[spawn.type];
      const label = ENEMY_LABELS[spawn.type];
      const txt = this.add.text(px, py + yOff, `${def.emoji} ${spawn.count}x ${label}`, {
        fontSize: '9px', color: '#cccccc', fontFamily: 'sans-serif',
      }).setOrigin(1, 0);
      this.wavePreviewContainer.add(txt);
      yOff += 14;
    }
  }

  // ─── Click handling ───────────────────────────────────────────────────────
  private handleClick(pointer: Phaser.Input.Pointer) {
    const x = pointer.x;
    const y = pointer.y;

    // Only handle clicks on the game grid
    if (y >= CANVAS_H) return;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    // Check if clicking an existing tower
    const existingTower = this.state.towers.find(t => t.col === col && t.row === row);
    if (existingTower) {
      if (this.selectedTower?.id === existingTower.id) {
        this.hideTowerInfoPanel();
      } else {
        this.showTowerInfoPanel(existingTower);
      }
      return;
    }

    // Close tower info panel when clicking elsewhere
    this.hideTowerInfoPanel();

    // Only place towers during placement phases
    if (this.state.phase !== 'placement' && this.state.phase !== 'wave_end') return;

    const tileType = this.levelConfig.grid[row]?.[col];
    if (tileType !== 'BUILD') return;

    const cost = TOWER_COSTS[this.selectedTowerType];
    if (this.state.gold < cost) return;

    const occupied = this.state.towers.some(t => t.col === col && t.row === row);
    if (occupied) return;

    // Place tower
    const def = TOWER_DEFS[this.selectedTowerType];
    const tower: Tower = {
      ...def,
      id: uid(),
      col,
      row,
      lastShot: 0,
      level: 1,
      targeting: 'farthest',
    };
    this.state.towers.push(tower);
    this.state.gold -= cost;

    // Place effect
    this.spawnPlaceEffect(tileCenter(col, row));

    this.updateTowerButtons();
  }

  private handleHover(pointer: Phaser.Input.Pointer) {
    const x = pointer.x;
    const y = pointer.y;

    if (y >= CANVAS_H) {
      this.hoverCol = -1;
      this.hoverRow = -1;
      return;
    }

    this.hoverCol = Math.floor(x / TILE_SIZE);
    this.hoverRow = Math.floor(y / TILE_SIZE);
  }

  // ─── Start wave ───────────────────────────────────────────────────────────
  private startWave() {
    this.state.phase = 'battle';
    this.waveElapsed = 0;
    this.wavePreviewContainer.removeAll(true);
  }

  // ─── Visual effects ───────────────────────────────────────────────────────
  private spawnPlaceEffect(pos: { x: number; y: number }) {
    const circle = this.add.graphics();
    circle.lineStyle(2, 0x4caf50, 0.8);
    circle.strokeCircle(pos.x, pos.y, 5);
    this.effectsLayer.add(circle);

    this.tweens.add({
      targets: circle,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => circle.destroy(),
    });
  }

  private spawnUpgradeEffect(pos: { x: number; y: number }) {
    const star = this.add.text(pos.x, pos.y, '⭐', { fontSize: '24px' }).setOrigin(0.5);
    this.effectsLayer.add(star);

    this.tweens.add({
      targets: star,
      y: pos.y - 30,
      alpha: 0,
      scale: 1.5,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => star.destroy(),
    });
  }

  private spawnSellEffect(pos: { x: number; y: number }) {
    const coin = this.add.text(pos.x, pos.y, '💰', { fontSize: '20px' }).setOrigin(0.5);
    this.effectsLayer.add(coin);

    this.tweens.add({
      targets: coin,
      y: pos.y - 40,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => coin.destroy(),
    });
  }

  private spawnHitEffect(pos: { x: number; y: number }, aoe: boolean) {
    if (aoe) {
      // Shockwave ring
      const ring = this.add.graphics();
      ring.lineStyle(3, 0xff6600, 1);
      ring.strokeCircle(pos.x, pos.y, 5);
      this.effectsLayer.add(ring);

      this.tweens.add({
        targets: ring,
        scaleX: 4,
        scaleY: 4,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });

      // Explosion flash
      const flash = this.add.graphics();
      flash.fillStyle(0xff4400, 0.6);
      flash.fillCircle(pos.x, pos.y, 20);
      this.effectsLayer.add(flash);

      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 300,
        onComplete: () => flash.destroy(),
      });
    } else {
      // Small spark
      const spark = this.add.graphics();
      spark.fillStyle(0xffffff, 0.8);
      spark.fillCircle(pos.x, pos.y, 3);
      this.effectsLayer.add(spark);

      this.tweens.add({
        targets: spark,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 200,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private spawnKillEffect(pos: { x: number; y: number }, emoji: string) {
    // Floating emoji
    const deathEmoji = this.add.text(pos.x, pos.y, emoji, {
      fontSize: '24px',
    }).setOrigin(0.5);
    this.effectsLayer.add(deathEmoji);

    this.tweens.add({
      targets: deathEmoji,
      y: pos.y - 30,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      rotation: 0.5,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => deathEmoji.destroy(),
    });

    // Gold text
    const goldTxt = this.add.text(pos.x + 10, pos.y - 8, '+$', {
      fontSize: '10px',
      color: '#FFD700',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.effectsLayer.add(goldTxt);

    this.tweens.add({
      targets: goldTxt,
      y: pos.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => goldTxt.destroy(),
    });
  }

  // ─── Update loop ──────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    const state = this.state;
    const dtMs = Math.min(delta, 50) * state.speedMultiplier;

    if (state.phase === 'defeat' || state.phase === 'victory') return;

    if (state.phase === 'placement' || state.phase === 'wave_end') {
      state.placementTimer = Math.max(0, state.placementTimer - dtMs);
      if (state.placementTimer <= 0) {
        this.startWave();
      }
    } else if (state.phase === 'battle') {
      this.waveElapsed += dtMs;
      const now = performance.now();
      const result = updateBattle(state, this.levelConfig, dtMs, now, this.waveElapsed);

      state.lives = Math.max(0, state.lives - result.livesLost);
      state.gold += result.goldEarned;

      // Spawn visual effects for hits and kills
      for (const hit of result.hits) {
        this.spawnHitEffect(hit.pos, hit.aoe);
      }
      for (const kill of result.kills) {
        this.spawnKillEffect(kill.pos, kill.enemy.emoji);
      }

      // Screen shake on enemy reaching core
      if (result.livesLost > 0) {
        this.cameras.main.shake(200, 0.005 * result.livesLost);
      }

      if (state.lives <= 0 && !this.gameOverFired) {
        this.gameOverFired = true;
        state.phase = 'defeat';
        this.onGameOver();
        return;
      }

      if (result.waveComplete) {
        const nextWave = state.wave + 1;
        if (nextWave >= this.levelConfig.waves.length) {
          if (!this.victoryFired) {
            this.victoryFired = true;
            state.phase = 'victory';
            this.onLevelComplete(Date.now() - this.gameStartTime);
          }
          return;
        } else {
          state.wave = nextWave;
          state.phase = 'wave_end';
          state.placementTimer = PLACEMENT_DURATION;
          state.enemies = buildSpawnQueue(this.levelConfig.waves[nextWave], this.levelConfig.paths);
          state.projectiles = [];
          this.waveElapsed = 0;
          this.updateWavePreview();
          this.cleanupEnemySprites();
        }
      }
    }

    // Render everything
    this.renderGame();
    this.updateHUD();
    this.updateTowerButtons();
  }

  // ─── Render game objects ──────────────────────────────────────────────────
  private renderGame() {
    this.renderRangeCircle();
    this.renderTowers();
    this.renderEnemies();
    this.renderProjectiles();
    this.renderBuildableHighlight();
  }

  private renderBuildableHighlight() {
    const isPlacing = this.state.phase === 'placement' || this.state.phase === 'wave_end';
    if (!isPlacing) return;

    if (this.hoverCol >= 0 && this.hoverRow >= 0) {
      const tileType = this.levelConfig.grid[this.hoverRow]?.[this.hoverCol];
      if (tileType === 'BUILD') {
        const occupied = this.state.towers.some(t => t.col === this.hoverCol && t.row === this.hoverRow);
        if (!occupied) {
          // Show tower preview
          const def = TOWER_DEFS[this.selectedTowerType];
          const cx = this.hoverCol * TILE_SIZE + TILE_SIZE / 2;
          const cy = this.hoverRow * TILE_SIZE + TILE_SIZE / 2;

          this.rangeCircle.lineStyle(1, 0xffffff, 0.3);
          this.rangeCircle.strokeCircle(cx, cy, def.range);

          this.rangeCircle.fillStyle(0xffffff, 0.1);
          this.rangeCircle.fillRect(this.hoverCol * TILE_SIZE, this.hoverRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private renderRangeCircle() {
    this.rangeCircle.clear();

    // Show range for selected tower
    if (this.selectedTower) {
      const tower = this.selectedTower;
      const cx = tower.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = tower.row * TILE_SIZE + TILE_SIZE / 2;

      this.rangeCircle.lineStyle(2, Phaser.Display.Color.HexStringToColor(tower.color).color, 0.5);
      this.rangeCircle.strokeCircle(cx, cy, tower.range);

      this.rangeCircle.fillStyle(Phaser.Display.Color.HexStringToColor(tower.color).color, 0.08);
      this.rangeCircle.fillCircle(cx, cy, tower.range);
    }

    // Show range on hovered tower
    if (this.hoverCol >= 0 && this.hoverRow >= 0) {
      const hoveredTower = this.state.towers.find(t => t.col === this.hoverCol && t.row === this.hoverRow);
      if (hoveredTower && hoveredTower !== this.selectedTower) {
        const cx = hoveredTower.col * TILE_SIZE + TILE_SIZE / 2;
        const cy = hoveredTower.row * TILE_SIZE + TILE_SIZE / 2;

        this.rangeCircle.lineStyle(1, Phaser.Display.Color.HexStringToColor(hoveredTower.color).color, 0.3);
        this.rangeCircle.strokeCircle(cx, cy, hoveredTower.range);
      }
    }
  }

  private renderTowers() {
    // Sync tower sprites with state
    const activeTowerIds = new Set(this.state.towers.map(t => t.id));

    // Remove stale sprites
    for (const [id, sprite] of this.towerSprites) {
      if (!activeTowerIds.has(id)) {
        sprite.destroy();
        this.towerSprites.delete(id);
      }
    }

    // Create or update tower sprites
    for (const tower of this.state.towers) {
      let sprite = this.towerSprites.get(tower.id);
      const cx = tower.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = tower.row * TILE_SIZE + TILE_SIZE / 2;

      if (!sprite) {
        sprite = this.add.container(cx, cy);

        const circle = this.add.graphics();
        const color = Phaser.Display.Color.HexStringToColor(tower.color).color;
        circle.fillStyle(color, 1);
        circle.fillCircle(0, 0, TILE_SIZE * 0.44);
        circle.lineStyle(1.5, 0xffffff, 0.5);
        circle.strokeCircle(0, 0, TILE_SIZE * 0.44);

        const emojiText = this.add.text(0, 0, tower.emoji, {
          fontSize: `${TILE_SIZE * 0.55}px`,
        }).setOrigin(0.5);

        // Level indicator
        if (tower.level > 1) {
          const stars = '⭐'.repeat(tower.level - 1);
          const lvlText = this.add.text(0, -TILE_SIZE * 0.45, stars, {
            fontSize: '8px',
          }).setOrigin(0.5);
          sprite.add(lvlText);
        }

        sprite.add([circle, emojiText]);
        this.towerLayer.add(sprite);
        this.towerSprites.set(tower.id, sprite);
      } else {
        // Update position and emoji if needed
        sprite.setPosition(cx, cy);
      }
    }
  }

  private renderEnemies() {
    const activeEnemyIds = new Set<string>();

    for (const enemy of this.state.enemies) {
      if (!enemy.alive || !enemy.spawned || enemy.reached) continue;
      activeEnemyIds.add(enemy.id);

      let sprite = this.enemySprites.get(enemy.id);

      if (!sprite) {
        sprite = this.add.container(enemy.pos.x, enemy.pos.y);

        // HP bar background
        const hpBg = this.add.graphics();
        hpBg.fillStyle(0x333333, 1);
        hpBg.fillRect(-14, -18, 28, 4);
        hpBg.setName('hpBg');

        // HP bar fill
        const hpBar = this.add.graphics();
        hpBar.setName('hpBar');

        // Status overlay
        const statusOverlay = this.add.graphics();
        statusOverlay.setName('statusOverlay');

        // Enemy emoji
        const sz = enemy.type === 'boss' ? TILE_SIZE * 0.85 : TILE_SIZE * 0.6;
        const emojiText = this.add.text(0, 0, enemy.emoji, {
          fontSize: `${sz}px`,
        }).setOrigin(0.5);

        sprite.add([statusOverlay, hpBg, hpBar, emojiText]);
        this.enemyLayer.add(sprite);
        this.enemySprites.set(enemy.id, sprite);
      }

      // Update position
      sprite.setPosition(enemy.pos.x, enemy.pos.y);

      // Update HP bar
      const hpBar = sprite.getByName('hpBar') as Phaser.GameObjects.Graphics;
      if (hpBar) {
        hpBar.clear();
        const hpPct = enemy.hp / enemy.maxHp;
        const hpColor = hpPct > 0.5 ? 0x4caf50 : hpPct > 0.25 ? 0xff9800 : 0xf44336;
        hpBar.fillStyle(hpColor, 1);
        hpBar.fillRect(-14, -18, 28 * hpPct, 4);
      }

      // Update status overlay
      const statusOverlay = sprite.getByName('statusOverlay') as Phaser.GameObjects.Graphics;
      if (statusOverlay) {
        statusOverlay.clear();
        if (enemy.frozen) {
          statusOverlay.fillStyle(0x4fc3f7, 0.4);
          statusOverlay.fillCircle(0, 0, 14);
        } else if (enemy.slow < 1) {
          statusOverlay.fillStyle(0x0096c8, 0.3);
          statusOverlay.fillCircle(0, 0, 14);
        }
      }
    }

    // Remove stale enemy sprites
    for (const [id, sprite] of this.enemySprites) {
      if (!activeEnemyIds.has(id)) {
        sprite.destroy();
        this.enemySprites.delete(id);
      }
    }
  }

  private cleanupEnemySprites() {
    for (const [, sprite] of this.enemySprites) {
      sprite.destroy();
    }
    this.enemySprites.clear();
  }

  private renderProjectiles() {
    this.projectileLayer.clear();

    for (const proj of this.state.projectiles) {
      if (proj.dead) continue;

      const color = Phaser.Display.Color.HexStringToColor(proj.color).color;

      // Trail effect
      this.projectileLayer.fillStyle(color, 0.3);
      this.projectileLayer.fillCircle(proj.pos.x, proj.pos.y, 6);

      // Core
      this.projectileLayer.fillStyle(color, 1);
      this.projectileLayer.fillCircle(proj.pos.x, proj.pos.y, 4);

      // Bright center
      this.projectileLayer.fillStyle(0xffffff, 0.6);
      this.projectileLayer.fillCircle(proj.pos.x, proj.pos.y, 2);
    }
  }

  // ─── Update HUD text ─────────────────────────────────────────────────────
  private updateHUD() {
    const state = this.state;
    this.livesText.setText(`❤️ ${state.lives}`);
    this.goldText.setText(`💰 ${state.gold}g`);
    this.waveText.setText(`Vague ${state.wave + 1}/${this.levelConfig.waves.length}`);

    if (state.phase === 'battle') {
      this.phaseText.setText('⚔️ Bataille !');
      this.phaseText.setColor('#ff9800');
      this.timerText.setText('');
    } else if (state.phase === 'placement' || state.phase === 'wave_end') {
      this.phaseText.setText('🏗️ Placement');
      this.phaseText.setColor('#4caf50');
      const sec = Math.ceil(state.placementTimer / 1000);
      this.timerText.setText(`${sec}s`);
    } else {
      this.phaseText.setText('');
      this.timerText.setText('');
    }

    const speedLabels = ['⏸', '1x', '2x', '3x'];
    this.speedText.setText(speedLabels[state.speedMultiplier] || '1x');
  }
}
