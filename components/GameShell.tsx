'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { LEVEL_LABELS } from '@/lib/games/config';
import type { GameId, DifficultyLevel } from '@/lib/types';

interface Props {
  gameId: GameId;
  gameTitle: string;
  gameEmoji: string;
  level: DifficultyLevel;
  children: (props: {
    onLevelComplete: (elapsedMs: number) => void;
    onGameOver: () => void;
    elapsedMs: number;
  }) => React.ReactNode;
}

type GameState = 'playing' | 'win' | 'gameover';

export default function GameShell({ gameId, gameTitle, gameEmoji, level, children }: Props) {
  const router = useRouter();
  const { player, recordCompletion } = useStore();

  const [state, setState] = useState<GameState>('playing');
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Live timer
  useEffect(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleLevelComplete = useCallback((ms: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('win');
    recordCompletion(gameId, level, ms);
    if (player) {
      fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          playerName: player.name,
          gameId,
          level,
          elapsedMs: ms,
          completedAt: Date.now(),
        }),
      }).catch(() => {});
    }
  }, [gameId, level, player, recordCompletion]);

  const handleGameOver = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('gameover');
  }, []);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className="game-container">
      {/* HUD */}
      <div className="hud">
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--rasta-red)',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '6px',
            WebkitTapHighlightColor: 'transparent',
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 700 }}>
            {gameEmoji} {gameTitle}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--rasta-green-light)',
            marginTop: '2px',
            background: 'rgba(50,205,50,0.12)',
            borderRadius: '10px',
            padding: '1px 8px',
            display: 'inline-block',
          }}>
            {LEVEL_LABELS[level]}
          </div>
        </div>

        <div style={{
          fontFamily: 'monospace',
          color: 'var(--rasta-gold)',
          fontSize: '20px',
          fontWeight: 900,
          letterSpacing: '1px',
          textShadow: '0 0 12px rgba(255,215,0,0.5)',
        }}>
          {formatTime(elapsedMs)}
        </div>
      </div>

      {/* Game area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {state === 'playing' && children({ onLevelComplete: handleLevelComplete, onGameOver: handleGameOver, elapsedMs })}

        {/* Win overlay */}
        {state === 'win' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(10, 20, 10, 0.94)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '20px', padding: '32px',
          }} className="animate-bounce-in">
            <div style={{ fontSize: '80px', lineHeight: 1 }}>🏆</div>
            <div>
              <div style={{
                color: 'var(--rasta-gold)',
                fontSize: '30px',
                fontWeight: 900,
                textAlign: 'center',
                textShadow: '0 0 20px rgba(255,215,0,0.5)',
              }}>
                Niveau {level} réussi !
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '15px', textAlign: 'center', marginTop: '6px' }}>
                🌲 La forêt est fière de toi
              </div>
            </div>
            <div style={{
              background: 'rgba(255,215,0,0.1)',
              border: '1px solid var(--rasta-gold)',
              borderRadius: '14px',
              padding: '12px 28px',
              color: 'var(--rasta-gold)',
              fontSize: '22px',
              fontFamily: 'monospace',
              fontWeight: 700,
            }}>
              ⏱ {formatTime(elapsedMs)}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', width: '100%' }}>
              {level < 5 && (
                <button
                  className="btn-rasta"
                  onClick={() => router.push(`/games/${gameId}/${(level + 1) as DifficultyLevel}`)}
                >
                  Niveau suivant →
                </button>
              )}
              <button
                className="btn-rasta btn-red"
                onClick={() => router.push('/games')}
              >
                Retour aux jeux
              </button>
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {state === 'gameover' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(20, 5, 5, 0.95)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '20px', padding: '32px',
          }} className="animate-bounce-in">
            <div style={{ fontSize: '80px', lineHeight: 1 }}>💀</div>
            <div>
              <div style={{
                color: 'var(--rasta-red)',
                fontSize: '30px',
                fontWeight: 900,
                textAlign: 'center',
                textShadow: '0 0 20px rgba(220,20,60,0.5)',
              }}>
                Game Over
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '15px', textAlign: 'center', marginTop: '6px' }}>
                Le brouillard des Vosges t&apos;a eu 🌫️
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', width: '100%' }}>
              <button
                className="btn-rasta"
                onClick={() => { setState('playing'); setElapsedMs(0); startRef.current = Date.now(); }}
              >
                Réessayer 🔄
              </button>
              <button
                className="btn-rasta btn-red"
                onClick={() => router.push('/games')}
              >
                Retour aux jeux
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
