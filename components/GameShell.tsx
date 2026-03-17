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
    // Submit to leaderboard API
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
            fontSize: '22px',
            cursor: 'pointer',
            padding: '4px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ✕
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {gameEmoji} {gameTitle}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--rasta-green-light)' }}>
            {LEVEL_LABELS[level]}
          </div>
        </div>
        <div style={{ fontFamily: 'monospace', color: 'var(--rasta-gold)', fontSize: '16px', fontWeight: 700 }}>
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
            background: 'rgba(13,26,13,0.92)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '20px', padding: '32px',
          }} className="animate-bounce-in">
            <div style={{ fontSize: '72px' }}>🏆</div>
            <div style={{ color: 'var(--rasta-gold)', fontSize: '28px', fontWeight: 900, textAlign: 'center' }}>
              Niveau {level} réussi !
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
              ⏱️ {formatTime(elapsedMs)}
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
            background: 'rgba(26,0,0,0.92)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '20px', padding: '32px',
          }} className="animate-bounce-in">
            <div style={{ fontSize: '72px' }}>💀</div>
            <div style={{ color: 'var(--rasta-red)', fontSize: '28px', fontWeight: 900, textAlign: 'center' }}>
              Game Over
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
