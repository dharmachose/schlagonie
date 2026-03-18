'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameProps } from '@/lib/types';
import type { GameState, TowerType, Tower, TargetingMode, EnemyType } from './types';
import {
  TOWER_DEFS, TOWER_COSTS, TOWER_LABELS, UPGRADE_COSTS,
  UPGRADE_EMOJIS, SELL_REFUND_RATIO, ENEMY_DEFS, ENEMY_LABELS,
} from './config';
import { LEVELS } from './levels';

const TOWER_TYPES: TowerType[] = ['canon', 'baffe', 'piege', 'mortier', 'glace'];
const TARGETING_MODES: TargetingMode[] = ['farthest', 'closest', 'strongest', 'weakest'];
const TARGETING_ICONS: Record<TargetingMode, string> = { farthest: '🏁', closest: '🎯', strongest: '💪', weakest: '🩸' };
const TARGETING_SHORT: Record<TargetingMode, string> = { farthest: 'Loin', closest: 'Près', strongest: 'Fort', weakest: 'Faible' };
const SPEED_LABELS = ['⏸', '▶', '▶▶', '▶▶▶'];

export default function TowerGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const sceneRef = useRef<import('./scenes/TowerScene').default | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedType, setSelectedType] = useState<TowerType>('canon');
  const [showTowerPanel, setShowTowerPanel] = useState(false);

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
      const w = container.clientWidth;
      // Grid aspect ratio: 16:11
      const gridH = Math.round(w * (11 / 16));

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 640,
        height: 440,
        parent: container,
        backgroundColor: '#0a1a0a',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        },
        scene: [TowerScene],
      });

      // Wait for scene to be ready
      game.events.once('ready', () => {
        const scene = game.scene.getScene('TowerScene') as InstanceType<typeof TowerScene>;
        sceneRef.current = scene;
      });

      game.scene.start('TowerScene', {
        levelIndex: lvlIdx,
        events: {
          onStateChange: handleStateChange,
          onLevelComplete,
          onGameOver,
        },
      });

      // Get scene reference after a tick
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

  // Sync selected tower type to scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setSelectedTowerType(selectedType);
    }
  }, [selectedType]);

  const scene = sceneRef.current;
  const state = gameState;
  const isPlacing = state?.phase === 'placement' || state?.phase === 'wave_end';
  const selectedTower = scene?.selectedTower ?? null;

  // Wave preview
  const currentWave = state ? levelConfig.waves[state.wave] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0f0a', overflow: 'hidden' }}>

      {/* HUD bar */}
      {state && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)',
          borderBottom: '1px solid #2a2a2a', flexShrink: 0, gap: 6,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 15 }}>❤️ <strong style={{ color: '#f44336' }}>{state.lives}</strong></span>
            <span style={{ fontSize: 15 }}>💰 <strong style={{ color: '#FFD700' }}>{state.gold}g</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#aaa', fontSize: 13 }}>
              Vague <strong style={{ color: '#fff' }}>{state.wave + 1}</strong>/{levelConfig.waves.length}
            </span>
            {state.phase === 'battle' && (
              <span style={{ color: '#ff9800', fontWeight: 'bold', fontSize: 13 }}>⚔️</span>
            )}
            {isPlacing && (
              <span style={{
                color: '#4caf50', fontWeight: 'bold', fontSize: 13,
                background: 'rgba(76,175,80,0.15)', borderRadius: 8, padding: '2px 8px',
              }}>
                🏗️ {Math.ceil(state.placementTimer / 1000)}s
              </span>
            )}
          </div>
          {/* Speed controls */}
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2, 3].map(spd => (
              <button
                key={spd}
                onClick={() => scene?.setSpeed(spd)}
                style={{
                  width: 30, height: 28, borderRadius: 6,
                  border: state.speedMultiplier === spd ? '2px solid #4caf50' : '1px solid #333',
                  background: state.speedMultiplier === spd ? '#2a4a2a' : '#1a1a1a',
                  color: state.speedMultiplier === spd ? '#4caf50' : '#666',
                  fontSize: 10, cursor: 'pointer', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {SPEED_LABELS[spd]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wave preview (during placement) */}
      {isPlacing && currentWave && (
        <div style={{
          display: 'flex', gap: 8, padding: '4px 12px',
          background: 'rgba(255,152,0,0.08)', borderBottom: '1px solid #2a2a2a',
          alignItems: 'center', flexShrink: 0, overflowX: 'auto',
        }}>
          <span style={{ fontSize: 11, color: '#ff9800', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            Vague {(state?.wave ?? 0) + 1} :
          </span>
          {currentWave.spawns.map((spawn, i) => {
            const def = ENEMY_DEFS[spawn.type];
            return (
              <span key={i} style={{
                fontSize: 12, color: '#ddd', whiteSpace: 'nowrap',
                background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '2px 8px',
              }}>
                {def.emoji} {spawn.count}x
              </span>
            );
          })}
        </div>
      )}

      {/* Game canvas container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#0a1a0a',
          minHeight: 0,
        }}
      />

      {/* Selected tower panel */}
      {selectedTower && (
        <div style={{
          padding: '8px 12px', background: '#151515',
          borderTop: '1px solid #333', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>{UPGRADE_EMOJIS[selectedTower.type][selectedTower.level]}</span>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                  {TOWER_LABELS[selectedTower.type]} <span style={{ color: '#FFD700' }}>Nv.{selectedTower.level}</span>
                </div>
                <div style={{ color: '#888', fontSize: 11 }}>
                  DMG:{selectedTower.damage} · RNG:{selectedTower.range} · {selectedTower.fireRate.toFixed(1)}/s
                </div>
              </div>
            </div>
            <button onClick={() => { if (scene) scene.selectedTower = null; setShowTowerPanel(false); }}
              style={{ background: 'none', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Upgrade */}
            {selectedTower.level < 3 && (() => {
              const cost = UPGRADE_COSTS[selectedTower.type][selectedTower.level + 1];
              const canAfford = (state?.gold ?? 0) >= cost;
              return (
                <button
                  onClick={() => scene?.upgradeTower(selectedTower)}
                  disabled={!canAfford}
                  style={{
                    padding: '6px 14px', borderRadius: 8,
                    background: canAfford ? '#1565c0' : '#333',
                    color: canAfford ? '#fff' : '#666',
                    border: 'none', fontSize: 13, cursor: canAfford ? 'pointer' : 'default',
                    fontWeight: 'bold', opacity: canAfford ? 1 : 0.5,
                  }}
                >
                  ⬆ Upgrade {cost}g
                </button>
              );
            })()}

            {/* Sell */}
            <button
              onClick={() => scene?.sellTower(selectedTower)}
              style={{
                padding: '6px 14px', borderRadius: 8,
                background: '#b71c1c', color: '#fff',
                border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 'bold',
              }}
            >
              💰 Vendre {Math.floor((() => {
                let total = TOWER_COSTS[selectedTower.type];
                for (let lvl = 2; lvl <= selectedTower.level; lvl++) total += UPGRADE_COSTS[selectedTower.type][lvl];
                return total * SELL_REFUND_RATIO;
              })())}g
            </button>

            {/* Targeting */}
            <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
              {TARGETING_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => scene?.setTargeting(selectedTower, mode)}
                  style={{
                    padding: '4px 8px', borderRadius: 6,
                    background: selectedTower.targeting === mode ? '#2e7d32' : '#222',
                    border: selectedTower.targeting === mode ? '1px solid #4caf50' : '1px solid #333',
                    color: selectedTower.targeting === mode ? '#fff' : '#888',
                    fontSize: 10, cursor: 'pointer',
                  }}
                >
                  {TARGETING_ICONS[mode]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tower selection bar */}
      <div style={{
        background: 'linear-gradient(180deg, #151515 0%, #0d0d0d 100%)',
        borderTop: '1px solid #2a2a2a',
        padding: '8px 8px 10px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'flex-end' }}>
          {TOWER_TYPES.map(type => {
            const def = TOWER_DEFS[type];
            const cost = TOWER_COSTS[type];
            const canAfford = (state?.gold ?? 0) >= cost;
            const selected = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => { setSelectedType(type); if (scene) scene.selectedTower = null; }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: selected ? '6px 8px 8px' : '4px 6px 6px',
                  borderRadius: 10,
                  border: selected ? `2px solid ${def.color}` : '2px solid transparent',
                  background: selected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', minWidth: 54, opacity: canAfford ? 1 : 0.4,
                  transition: 'all 0.15s ease',
                  transform: selected ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: selected ? `0 0 12px ${def.color}40` : 'none',
                }}
              >
                <span style={{ fontSize: selected ? 26 : 22, lineHeight: 1 }}>{def.emoji}</span>
                <span style={{
                  fontSize: 10, color: '#FFD700', fontWeight: 'bold', marginTop: 2,
                }}>{cost}g</span>
                {selected && (
                  <span style={{ fontSize: 8, color: '#aaa', marginTop: 1 }}>
                    {TOWER_LABELS[type].split(' ')[0]}
                  </span>
                )}
              </button>
            );
          })}

          {/* Launch button */}
          {isPlacing && (
            <button
              onClick={() => scene?.startWave()}
              style={{
                padding: '8px 16px', borderRadius: 10,
                background: 'linear-gradient(180deg, #43a047, #2e7d32)',
                color: '#fff', border: '2px solid #66bb6a',
                fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
                marginLeft: 8, whiteSpace: 'nowrap',
                boxShadow: '0 0 16px rgba(76,175,80,0.3)',
                animation: 'pulse 2s infinite',
              }}
            >
              ⚔️ Lancer
            </button>
          )}
        </div>

        {/* Selected tower info */}
        <div style={{
          textAlign: 'center', fontSize: 10, color: '#666', marginTop: 4,
        }}>
          {TOWER_LABELS[selectedType]} · DMG:{TOWER_DEFS[selectedType].damage} · RNG:{TOWER_DEFS[selectedType].range} · {TOWER_DEFS[selectedType].fireRate}/s
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; box-shadow: 0 0 24px rgba(76,175,80,0.5); }
        }
      `}</style>
    </div>
  );
}
