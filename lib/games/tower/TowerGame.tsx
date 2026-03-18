'use client';

import { useEffect, useRef } from 'react';
import type { GameProps } from '@/lib/types';

export default function TowerGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const initPhaser = async () => {
      const Phaser = await import('phaser');
      const { default: TowerScene } = await import('./scenes/TowerScene');

      const lvlIdx = (level as number) - 1;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 640,
        height: 552, // 440 grid + 32 HUD + 80 bottom UI
        parent: containerRef.current!,
        backgroundColor: '#0a1a0a',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [TowerScene],
      });

      game.scene.start('TowerScene', {
        levelIndex: lvlIdx,
        onLevelComplete,
        onGameOver,
      });

      gameRef.current = game;
    };

    initPhaser();

    return () => {
      if (gameRef.current) {
        (gameRef.current as { destroy: (b: boolean) => void }).destroy(true);
        gameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a1a0a',
        overflow: 'hidden',
      }}
    />
  );
}
