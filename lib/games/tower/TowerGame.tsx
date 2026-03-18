'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameProps } from '@/lib/types';
import type { GameState, TowerType, Tower, TargetingMode } from './types';
import {
  TOWER_DEFS, TOWER_COSTS, TOWER_LABELS, UPGRADE_COSTS,
  UPGRADE_EMOJIS, SELL_REFUND_RATIO, ENEMY_DEFS,
} from './config';
import { LEVELS } from './levels';

const TOWER_TYPES: TowerType[] = ['canon', 'baffe', 'piege', 'mortier', 'glace'];
const TARGETING_MODES: TargetingMode[] = ['farthest', 'closest', 'strongest', 'weakest'];
const TARGETING_ICONS: Record<TargetingMode, string> = { farthest: '🏁', closest: '🎯', strongest: '💪', weakest: '🩸' };
const TARGETING_LABELS: Record<TargetingMode, string> = { farthest: 'Loin', closest: 'Proche', strongest: 'Fort', weakest: 'Faible' };
const SPEED_LABELS = ['⏸', '▶', '▶▶', '▶▶▶'];

export default function TowerGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const sceneRef = useRef<import('./scenes/TowerScene').default | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedType, setSelectedType] = useState<TowerType>('canon');

  const lvlIdx = (level as number) - 1;
  const levelConfig = LEVELS[lvlIdx];

  const handleStateChange = useCallback((state: GameState) => {
    setGameState({ ...state });
  }, []);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const initPhaser = async () => {
      const Phaser = await import('phaser');
      const { default: TowerScene } = await import('./scenes/TowerScene');

      const container = containerRef.current!;
      const containerW = container.clientWidth;
      const containerH = container.clientHeight;

      // Dynamic grid dimensions from level config
      const cols = levelConfig.cols;
      const rows = levelConfig.rows;

      // Tile size: fit grid to container (use the smaller of width/height ratios)
      const tileSize = Math.floor(Math.min(containerW / cols, containerH / rows));
      // Canvas fills the entire container, grid centered inside
      const gameW = containerW;
      const gameH = containerH;
      const gridOffsetX = Math.floor((gameW - tileSize * cols) / 2);
      const gridOffsetY = Math.floor((gameH - tileSize * rows) / 2);

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: gameW,
        height: gameH,
        parent: container,
        backgroundColor: '#0a150a',
        scale: { mode: Phaser.Scale.NONE },
        scene: [TowerScene],
      });

      game.scene.start('TowerScene', {
        levelIndex: lvlIdx,
        tileSize,
        gridOffsetX,
        gridOffsetY,
        events: {
          onStateChange: handleStateChange,
          onLevelComplete,
          onGameOver,
        },
      });

      setTimeout(() => {
        const scene = game.scene.getScene('TowerScene') as InstanceType<typeof TowerScene>;
        sceneRef.current = scene;
      }, 100);

      gameRef.current = game;
    };

    initPhaser();

    return () => {
      if (gameRef.current) {
        (gameRef.current as { destroy: (b: boolean) => void }).destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.setSelectedTowerType(selectedType);
  }, [selectedType]);

  const scene = sceneRef.current;
  const state = gameState;
  const isPlacing = state?.phase === 'placement' || state?.phase === 'wave_end';
  const selectedTower = scene?.selectedTower ?? null;
  const currentWave = state ? levelConfig.waves[state.wave] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#080e08', overflow: 'hidden', touchAction: 'none' }}>

      {/* HUD bar — always rendered to reserve space for canvas sizing */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 8px',
        background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)',
        borderBottom: '1px solid #2a3a2a',
        flexShrink: 0, minHeight: 34,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 12, display: 'flex', alignItems: 'center', gap: 2,
            background: 'rgba(244,67,54,0.1)', padding: '2px 6px', borderRadius: 6,
            border: '1px solid rgba(244,67,54,0.2)',
          }}>
            ❤️ <b style={{ color: '#f44336' }}>{state?.lives ?? levelConfig.startLives}</b>
          </span>
          <span style={{
            fontSize: 12, display: 'flex', alignItems: 'center', gap: 2,
            background: 'rgba(255,215,0,0.08)', padding: '2px 6px', borderRadius: 6,
            border: '1px solid rgba(255,215,0,0.15)',
          }}>
            💰 <b style={{ color: '#FFD700' }}>{state?.gold ?? levelConfig.startGold}g</b>
          </span>
          <span style={{
            color: '#aaa', fontSize: 11,
            background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 6,
          }}>
            V<b style={{ color: '#fff' }}>{(state?.wave ?? 0) + 1}</b>/{levelConfig.waves.length}
          </span>
          {state?.phase === 'battle' && (
            <span style={{ color: '#ff9800', fontSize: 12, fontWeight: 'bold' }}>⚔️</span>
          )}
          {isPlacing && state && (
            <span style={{
              color: '#4caf50', fontSize: 11, fontWeight: 'bold',
              background: 'rgba(76,175,80,0.15)', borderRadius: 6, padding: '2px 8px',
              border: '1px solid rgba(76,175,80,0.3)',
            }}>
              ⏱ {Math.ceil(state.placementTimer / 1000)}s
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {[0, 1, 2, 3].map(spd => {
            const active = (state?.speedMultiplier ?? 1) === spd;
            return (
              <button key={spd} onClick={() => scene?.setSpeed(spd)} style={{
                width: 26, height: 24, borderRadius: 5,
                border: active ? '2px solid #4caf50' : '1px solid #333',
                background: active ? 'linear-gradient(180deg, #2e5a2e, #1a3a1a)' : '#1a1a1a',
                color: active ? '#4caf50' : '#555',
                fontSize: 9, cursor: 'pointer', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: active ? '0 0 8px rgba(76,175,80,0.3)' : 'none',
              }}>
                {SPEED_LABELS[spd]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Wave preview — always reserve space */}
      <div style={{
        display: 'flex', gap: 4, padding: '2px 8px',
        background: isPlacing && currentWave
          ? 'linear-gradient(180deg, rgba(255,152,0,0.08), rgba(255,152,0,0.03))'
          : 'linear-gradient(180deg, #141414, #111)',
        borderBottom: '1px solid #2a2a1a', alignItems: 'center', flexShrink: 0, overflowX: 'auto',
        minHeight: 24,
      }}>
        {isPlacing && currentWave && (
          <>
            <span style={{
              fontSize: 9, color: '#ff9800', fontWeight: 'bold', whiteSpace: 'nowrap',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Vague {(state?.wave ?? 0) + 1}:
            </span>
            {currentWave.spawns.map((spawn, i) => (
              <span key={i} style={{
                fontSize: 11, color: '#eee', whiteSpace: 'nowrap',
                background: 'rgba(255,255,255,0.06)', borderRadius: 5, padding: '1px 6px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                <span style={{ fontSize: 12 }}>{ENEMY_DEFS[spawn.type].emoji}</span>
                <span style={{ fontWeight: 'bold' }}>{spawn.count}x</span>
              </span>
            ))}
          </>
        )}
      </div>

      {/* Phaser canvas */}
      <div
        ref={containerRef}
        style={{
          flex: 1, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a1a0a', minHeight: 0, position: 'relative',
          touchAction: 'none',
        }}
      />

      {/* Selected tower panel */}
      {selectedTower && (
        <div style={{
          padding: '4px 8px',
          background: 'linear-gradient(180deg, #1a1a1a, #111)',
          borderTop: '1px solid #2a3a2a',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 22,
                background: `${selectedTower.color}20`,
                borderRadius: 8,
                padding: '1px 4px',
                border: `1px solid ${selectedTower.color}40`,
              }}>
                {UPGRADE_EMOJIS[selectedTower.type][selectedTower.level]}
              </span>
              <div>
                <div style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                  {TOWER_LABELS[selectedTower.type]} <span style={{ color: '#FFD700', fontSize: 10 }}>Nv.{selectedTower.level}</span>
                </div>
                <div style={{ color: '#999', fontSize: 9, display: 'flex', gap: 6 }}>
                  <span>⚔️ {selectedTower.damage}</span>
                  <span>🎯 {selectedTower.range}</span>
                  <span>⚡ {selectedTower.fireRate.toFixed(1)}/s</span>
                </div>
              </div>
            </div>
            <button onClick={() => { if (scene) scene.selectedTower = null; }} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid #333',
              borderRadius: 5, color: '#666', fontSize: 12, cursor: 'pointer',
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {selectedTower.level < 3 && (() => {
              const cost = UPGRADE_COSTS[selectedTower.type][selectedTower.level + 1];
              const ok = (state?.gold ?? 0) >= cost;
              return (
                <button onClick={() => scene?.upgradeTower(selectedTower)} disabled={!ok} style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: ok ? 'linear-gradient(180deg, #1976d2, #1565c0)' : '#2a2a2a',
                  color: ok ? '#fff' : '#555', border: ok ? '1px solid #42a5f5' : '1px solid #333',
                  fontSize: 11, cursor: ok ? 'pointer' : 'default',
                  fontWeight: 'bold', opacity: ok ? 1 : 0.5,
                }}>⬆ {cost}g</button>
              );
            })()}
            <button onClick={() => scene?.sellTower(selectedTower)} style={{
              padding: '4px 10px', borderRadius: 6,
              background: 'linear-gradient(180deg, #c62828, #b71c1c)',
              color: '#fff', border: '1px solid #e53935',
              fontSize: 11, cursor: 'pointer', fontWeight: 'bold',
            }}>
              💰 {Math.floor((() => { let t = TOWER_COSTS[selectedTower.type]; for (let l = 2; l <= selectedTower.level; l++) t += UPGRADE_COSTS[selectedTower.type][l]; return t * SELL_REFUND_RATIO; })())}g
            </button>
            <div style={{ display: 'flex', gap: 2, marginLeft: 'auto', alignItems: 'center' }}>
              <span style={{ fontSize: 8, color: '#777', marginRight: 2 }}>Cible:</span>
              {TARGETING_MODES.map(mode => {
                const active = selectedTower.targeting === mode;
                return (
                  <button key={mode} onClick={() => scene?.setTargeting(selectedTower, mode)} style={{
                    padding: '2px 4px', borderRadius: 5,
                    background: active ? 'linear-gradient(180deg, #2e7d32, #1b5e20)' : '#1a1a1a',
                    border: active ? '1.5px solid #4caf50' : '1px solid #333',
                    color: '#fff', fontSize: 9, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                    minWidth: 32,
                  }}>
                    <span style={{ fontSize: 11 }}>{TARGETING_ICONS[mode]}</span>
                    <span style={{ fontSize: 7, color: active ? '#a5d6a7' : '#666' }}>{TARGETING_LABELS[mode]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tower bar */}
      <div style={{
        background: 'linear-gradient(180deg, #151515, #0e0e0e)',
        borderTop: '1px solid #2a3a2a',
        padding: '4px 6px 6px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'flex-end' }}>
          {TOWER_TYPES.map(type => {
            const def = TOWER_DEFS[type];
            const cost = TOWER_COSTS[type];
            const canAfford = (state?.gold ?? 0) >= cost;
            const sel = selectedType === type;
            return (
              <button key={type} onClick={() => { setSelectedType(type); if (scene) scene.selectedTower = null; }} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: sel ? '4px 6px 5px' : '3px 4px 4px', borderRadius: 8,
                border: sel ? `2px solid ${def.color}` : '2px solid transparent',
                background: sel ? `linear-gradient(180deg, ${def.color}20, ${def.color}08)` : 'transparent',
                cursor: canAfford ? 'pointer' : 'default', minWidth: 42,
                opacity: canAfford ? 1 : 0.3,
                transform: sel ? 'scale(1.08) translateY(-1px)' : 'scale(1)',
                transition: 'all 0.15s ease-out',
                boxShadow: sel ? `0 0 10px ${def.color}50` : 'none',
              }}>
                <span style={{ fontSize: sel ? 22 : 18, lineHeight: 1 }}>{def.emoji}</span>
                <span style={{
                  fontSize: 8, color: '#FFD700', fontWeight: 'bold', marginTop: 1,
                }}>{cost}g</span>
              </button>
            );
          })}
          {isPlacing && (
            <button onClick={() => scene?.startWave()} style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'linear-gradient(180deg, #43a047, #2e7d32)',
              color: '#fff', border: '2px solid #66bb6a',
              fontWeight: 'bold', fontSize: 12, cursor: 'pointer',
              marginLeft: 6, boxShadow: '0 0 12px rgba(76,175,80,0.4)',
            }}>⚔️ Go!</button>
          )}
        </div>
      </div>
    </div>
  );
}
