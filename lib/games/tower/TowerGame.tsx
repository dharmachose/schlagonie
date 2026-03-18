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

      // Calculate tile size to fill width
      const tileSize = Math.floor(containerW / 16);
      const gameW = tileSize * 16;
      const gameH = tileSize * 11;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: gameW,
        height: gameH,
        parent: container,
        backgroundColor: '#0a1a0a',
        scale: {
          mode: Phaser.Scale.NONE,
        },
        scene: [TowerScene],
      });

      game.scene.start('TowerScene', {
        levelIndex: lvlIdx,
        tileSize,
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0f0a', overflow: 'hidden' }}>

      {/* HUD bar - compact */}
      {state && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', background: '#111', borderBottom: '1px solid #2a2a2a', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 14 }}>❤️ <b style={{ color: '#f44336' }}>{state.lives}</b></span>
            <span style={{ fontSize: 14 }}>💰 <b style={{ color: '#FFD700' }}>{state.gold}g</b></span>
            <span style={{ color: '#aaa', fontSize: 12 }}>
              V<b style={{ color: '#fff' }}>{state.wave + 1}</b>/{levelConfig.waves.length}
            </span>
            {state.phase === 'battle' && <span style={{ color: '#ff9800', fontSize: 12, fontWeight: 'bold' }}>⚔️</span>}
            {isPlacing && (
              <span style={{ color: '#4caf50', fontSize: 12, fontWeight: 'bold', background: 'rgba(76,175,80,0.15)', borderRadius: 6, padding: '1px 6px' }}>
                {Math.ceil(state.placementTimer / 1000)}s
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {[0, 1, 2, 3].map(spd => (
              <button key={spd} onClick={() => scene?.setSpeed(spd)} style={{
                width: 28, height: 26, borderRadius: 5,
                border: state.speedMultiplier === spd ? '2px solid #4caf50' : '1px solid #333',
                background: state.speedMultiplier === spd ? '#2a4a2a' : '#1a1a1a',
                color: state.speedMultiplier === spd ? '#4caf50' : '#666',
                fontSize: 9, cursor: 'pointer', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {SPEED_LABELS[spd]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wave preview */}
      {isPlacing && currentWave && (
        <div style={{
          display: 'flex', gap: 6, padding: '3px 10px', background: 'rgba(255,152,0,0.06)',
          borderBottom: '1px solid #222', alignItems: 'center', flexShrink: 0, overflowX: 'auto',
        }}>
          <span style={{ fontSize: 10, color: '#ff9800', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            Vague {(state?.wave ?? 0) + 1}:
          </span>
          {currentWave.spawns.map((spawn, i) => (
            <span key={i} style={{ fontSize: 11, color: '#ddd', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '1px 6px' }}>
              {ENEMY_DEFS[spawn.type].emoji} {spawn.count}x
            </span>
          ))}
        </div>
      )}

      {/* Phaser canvas - takes ALL available space */}
      <div
        ref={containerRef}
        style={{
          flex: 1, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a1a0a', minHeight: 0, position: 'relative',
        }}
      />

      {/* Selected tower panel */}
      {selectedTower && (
        <div style={{ padding: '6px 10px', background: '#151515', borderTop: '1px solid #333', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 22 }}>{UPGRADE_EMOJIS[selectedTower.type][selectedTower.level]}</span>
              <div>
                <div style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                  {TOWER_LABELS[selectedTower.type]} <span style={{ color: '#FFD700' }}>Nv.{selectedTower.level}</span>
                </div>
                <div style={{ color: '#888', fontSize: 10 }}>
                  DMG:{selectedTower.damage} · RNG:{selectedTower.range} · {selectedTower.fireRate.toFixed(1)}/s
                </div>
              </div>
            </div>
            <button onClick={() => { if (scene) scene.selectedTower = null; }} style={{ background: 'none', border: 'none', color: '#666', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {selectedTower.level < 3 && (() => {
              const cost = UPGRADE_COSTS[selectedTower.type][selectedTower.level + 1];
              const ok = (state?.gold ?? 0) >= cost;
              return (
                <button onClick={() => scene?.upgradeTower(selectedTower)} disabled={!ok} style={{
                  padding: '5px 12px', borderRadius: 7, background: ok ? '#1565c0' : '#333',
                  color: ok ? '#fff' : '#666', border: 'none', fontSize: 12, cursor: ok ? 'pointer' : 'default',
                  fontWeight: 'bold', opacity: ok ? 1 : 0.5,
                }}>⬆ {cost}g</button>
              );
            })()}
            <button onClick={() => scene?.sellTower(selectedTower)} style={{
              padding: '5px 12px', borderRadius: 7, background: '#b71c1c', color: '#fff',
              border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 'bold',
            }}>
              💰 {Math.floor((() => { let t = TOWER_COSTS[selectedTower.type]; for (let l = 2; l <= selectedTower.level; l++) t += UPGRADE_COSTS[selectedTower.type][l]; return t * SELL_REFUND_RATIO; })())}g
            </button>
            <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
              {TARGETING_MODES.map(mode => (
                <button key={mode} onClick={() => scene?.setTargeting(selectedTower, mode)} style={{
                  padding: '3px 6px', borderRadius: 5,
                  background: selectedTower.targeting === mode ? '#2e7d32' : '#222',
                  border: selectedTower.targeting === mode ? '1px solid #4caf50' : '1px solid #333',
                  color: '#fff', fontSize: 12, cursor: 'pointer',
                }}>{TARGETING_ICONS[mode]}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tower bar - compact */}
      <div style={{
        background: '#111', borderTop: '1px solid #2a2a2a',
        padding: '6px 6px 8px', flexShrink: 0,
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
                padding: sel ? '5px 6px 6px' : '3px 4px 4px', borderRadius: 8,
                border: sel ? `2px solid ${def.color}` : '2px solid transparent',
                background: sel ? 'rgba(255,255,255,0.08)' : 'transparent',
                cursor: 'pointer', minWidth: 48, opacity: canAfford ? 1 : 0.35,
                transform: sel ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.15s',
                boxShadow: sel ? `0 0 10px ${def.color}40` : 'none',
              }}>
                <span style={{ fontSize: sel ? 24 : 20 }}>{def.emoji}</span>
                <span style={{ fontSize: 9, color: '#FFD700', fontWeight: 'bold' }}>{cost}g</span>
              </button>
            );
          })}
          {isPlacing && (
            <button onClick={() => scene?.startWave()} style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'linear-gradient(180deg, #43a047, #2e7d32)', color: '#fff',
              border: '2px solid #66bb6a', fontWeight: 'bold', fontSize: 13, cursor: 'pointer',
              marginLeft: 6, boxShadow: '0 0 14px rgba(76,175,80,0.3)',
            }}>⚔️ Go</button>
          )}
        </div>
      </div>
    </div>
  );
}
