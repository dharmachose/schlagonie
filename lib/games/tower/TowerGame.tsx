'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import type { UIState, TowerType, TargetPriority, GameBridge } from './types';
import { LEVELS } from './levels';
import { TOWER_DEFS, CELL_SIZE } from './config';

const TOWER_ORDER: TowerType[] = ['brasseur', 'claque', 'forestier', 'mortier', 'glace'];
const PRIORITY_LABELS: Record<TargetPriority, string> = {
  first:    '1er',
  last:     'Dernier',
  strongest: '+Fort',
};

// Level upgrade star indicator
function LevelStars({ level }: { level: number }) {
  return (
    <span style={{ marginLeft: 4, fontSize: 9, letterSpacing: 1 }}>
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} style={{ color: i < level ? '#FFD700' : '#444' }}>★</span>
      ))}
    </span>
  );
}

export default function TowerGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const lvlIdx = (level as number) - 1;
  const levelConfig = LEVELS[lvlIdx];

  const containerRef = useRef<HTMLDivElement>(null);

  // Bridge: mutable object shared with GameScene
  const bridgeRef = useRef<GameBridge>({
    setPlacingType: () => {},
    startWave:      () => {},
    setSpeed:       () => {},
    setPaused:      () => {},
    upgradeTower:   () => {},
    sellTower:      () => {},
    deselectTower:  () => {},
    setTargetPriority: () => {},
    onStateChange:  () => {},
    onLevelComplete: () => {},
    onGameOver:     () => {},
  });

  const [ui, setUi] = useState<UIState>({
    phase: 'placement',
    wave: 0,
    totalWaves: levelConfig.waves.length,
    lives: levelConfig.startLives,
    gold: levelConfig.startGold,
    placementTimeLeft: 15,
    gameSpeed: 1,
    paused: false,
    selectedTower: null,
  });

  const [placingType, setPlacingTypeState] = useState<TowerType>('brasseur');

  // Keep bridge callbacks up-to-date every render (setUi is stable)
  bridgeRef.current.onStateChange  = setUi;
  bridgeRef.current.onLevelComplete = onLevelComplete;
  bridgeRef.current.onGameOver      = onGameOver;

  useEffect(() => {
    if (!containerRef.current) return;
    const bridge = bridgeRef.current;
    let destroyed = false;
    let gameInst: import('phaser').Game | null = null;

    Promise.all([
      import('phaser'),
      import('./GameScene'),
    ]).then(([Phaser, { GameScene }]) => {
      if (destroyed || !containerRef.current) return;

      const { cols, rows } = levelConfig;

      gameInst = new Phaser.Game({
        type: Phaser.AUTO,
        backgroundColor: '#0a1a0a',
        parent: containerRef.current,
        scene: [new GameScene(levelConfig, bridge)],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: cols * CELL_SIZE,
          height: rows * CELL_SIZE,
        },
        render: { antialias: false, pixelArt: false },
        // Disable Phaser banner in console
        banner: false,
      });
    });

    return () => {
      destroyed = true;
      gameInst?.destroy(true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const selectPlacing = (t: TowerType) => {
    setPlacingTypeState(t);
    bridgeRef.current.setPlacingType(t);
  };

  const isPlacing = ui.phase === 'placement' || ui.phase === 'wave_end';
  const st = ui.selectedTower;

  // ── Styles ────────────────────────────────────────────────────────────────
  const hudStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '5px 10px',
    background: '#111', borderBottom: '1px solid #2a2a2a',
    fontSize: 13, flexShrink: 0, flexWrap: 'wrap',
  };
  const btnBase: React.CSSProperties = {
    padding: '2px 8px', borderRadius: 6,
    border: '1px solid #444', background: '#1e1e1e',
    color: '#ddd', cursor: 'pointer', fontSize: 11,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a1a0a', overflow: 'hidden', userSelect: 'none' }}>

      {/* ── Top HUD ── */}
      <div style={hudStyle}>
        <span title="Vies restantes">❤️ <strong style={{ color: '#f44336' }}>{ui.lives}</strong></span>
        <span title="Or">💰 <strong style={{ color: '#FFD700' }}>{ui.gold}g</strong></span>
        <span style={{ color: '#999', fontSize: 11 }}>
          Vague <strong style={{ color: '#fff' }}>{ui.wave + 1}</strong>/{ui.totalWaves}
        </span>

        {/* Phase indicator */}
        {ui.phase === 'battle' && (
          <span style={{ color: '#ff9800', fontWeight: 'bold', fontSize: 11 }}>⚔️ Bataille !</span>
        )}
        {isPlacing && (
          <span style={{ color: '#4caf50', fontWeight: 'bold', fontSize: 11 }}>
            🏗️ {ui.placementTimeLeft}s
          </span>
        )}

        <span style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {/* Speed toggle */}
          <button
            onClick={() => bridgeRef.current.setSpeed(ui.gameSpeed === 1 ? 2 : 1)}
            style={{ ...btnBase, background: ui.gameSpeed === 2 ? '#1b3a1b' : '#1e1e1e', color: ui.gameSpeed === 2 ? '#4caf50' : '#ddd' }}
            title="Changer la vitesse"
          >
            {ui.gameSpeed === 1 ? '▶ 1×' : '⏩ 2×'}
          </button>
          {/* Pause toggle */}
          <button
            onClick={() => bridgeRef.current.setPaused(!ui.paused)}
            style={{ ...btnBase, background: ui.paused ? '#1b2a3a' : '#1e1e1e', color: ui.paused ? '#64b5f6' : '#ddd' }}
            title={ui.paused ? 'Reprendre' : 'Pause'}
          >
            {ui.paused ? '▶' : '⏸'}
          </button>
        </span>
      </div>

      {/* ── Game canvas ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      />

      {/* ── Bottom panel ── */}
      <div style={{ background: '#111', borderTop: '1px solid #2a2a2a', padding: '8px 10px', flexShrink: 0 }}>

        {st ? (
          /* ── Selected tower info ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Tower identity */}
              <span style={{ fontSize: 22 }}>{TOWER_DEFS[st.towerType].emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  {TOWER_DEFS[st.towerType].label}
                  <LevelStars level={st.level} />
                </div>
                <div style={{ fontSize: 10, color: '#888' }}>
                  Investi : {st.totalInvested}g — Vente : {st.sellValue}g
                </div>
              </div>
              {/* Deselect */}
              <button onClick={() => bridgeRef.current.deselectTower()} style={{ ...btnBase, padding: '2px 6px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Targeting priority */}
              <div style={{ display: 'flex', gap: 3, marginRight: 4 }}>
                {(['first', 'last', 'strongest'] as TargetPriority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => bridgeRef.current.setTargetPriority(p)}
                    style={{
                      ...btnBase, padding: '2px 6px', fontSize: 10,
                      background: st.priority === p ? '#1b3a1b' : '#1a1a1a',
                      border: `1px solid ${st.priority === p ? '#4caf50' : '#444'}`,
                      color: st.priority === p ? '#4caf50' : '#aaa',
                    }}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>

              {/* Upgrade */}
              {st.upgradeable && (
                <button
                  onClick={() => bridgeRef.current.upgradeTower()}
                  disabled={ui.gold < st.upgradeCost}
                  title={st.upgradeLabel}
                  style={{
                    flex: 1, padding: '4px 8px', borderRadius: 6, fontSize: 11,
                    border: `1px solid ${ui.gold >= st.upgradeCost ? '#4caf50' : '#333'}`,
                    background: ui.gold >= st.upgradeCost ? '#1b3a1b' : '#161616',
                    color: ui.gold >= st.upgradeCost ? '#a5d6a7' : '#444',
                    cursor: ui.gold >= st.upgradeCost ? 'pointer' : 'not-allowed',
                  }}
                >
                  ⬆ Améliorer — {st.upgradeCost}g
                </button>
              )}

              {/* Sell */}
              <button
                onClick={() => bridgeRef.current.sellTower()}
                style={{ ...btnBase, border: '1px solid #b71c1c', color: '#ef5350', padding: '4px 10px', fontSize: 11 }}
              >
                💰 {st.sellValue}g
              </button>
            </div>
          </div>
        ) : (
          /* ── Tower selection ── */
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {TOWER_ORDER.map(type => {
              const def = TOWER_DEFS[type];
              const canAfford = ui.gold >= def.cost;
              const selected  = placingType === type;
              return (
                <button
                  key={type}
                  onClick={() => selectPlacing(type)}
                  title={`${def.label} — ${def.cost}g\n${def.description}`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '4px 7px', borderRadius: 8, minWidth: 52,
                    border: selected ? `2px solid ${def.color}` : '2px solid #2a2a2a',
                    background: selected ? '#1e1e1e' : '#161616',
                    color: canAfford ? '#fff' : '#444',
                    cursor: 'pointer', opacity: canAfford ? 1 : 0.5,
                    transition: 'border-color 0.12s',
                  }}
                >
                  <span style={{ fontSize: 21 }}>{def.emoji}</span>
                  <span style={{ fontSize: 10, color: '#FFD700' }}>{def.cost}g</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Launch wave button */}
        {isPlacing && !st && (
          <div style={{ textAlign: 'center', marginTop: 7 }}>
            <button
              onClick={() => bridgeRef.current.startWave()}
              style={{
                padding: '5px 22px', borderRadius: 8,
                background: '#2e7d32', color: '#fff',
                border: 'none', fontWeight: 'bold', fontSize: 13, cursor: 'pointer',
                boxShadow: '0 0 8px rgba(46,125,50,0.5)',
              }}
            >
              ⚔️ Lancer vague {ui.wave + 1}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
