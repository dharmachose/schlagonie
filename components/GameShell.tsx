'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { LEVEL_LABELS } from '@/lib/games/config';
import { getTributeQuestion } from '@/lib/tribute-questions';
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
type WinPhase = 'question' | 'thanks' | 'buttons';

export default function GameShell({ gameId, gameTitle, gameEmoji, level, children }: Props) {
  const router = useRouter();
  const { player, recordCompletion, isQuestionAnswered, markQuestionAnswered } = useStore();

  const [state, setState] = useState<GameState>('playing');
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [winPhase, setWinPhase] = useState<WinPhase>('buttons');
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    recordCompletion(gameId, level, ms);

    // Fire-and-forget score sync
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
      }).catch(() => {/* silent — score already saved locally */});
    }

    // Determine whether to show the tribute question
    const question = getTributeQuestion(gameId, level);
    const alreadyAnswered = question ? isQuestionAnswered(question.id) : true;
    setWinPhase(question && !alreadyAnswered ? 'question' : 'buttons');
    setState('win');
  }, [gameId, level, player, recordCompletion, isQuestionAnswered]);

  const handleGameOver = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('gameover');
  }, []);

  const handleSubmitAnswer = useCallback(async () => {
    if (!answer.trim() || !player) return;
    const question = getTributeQuestion(gameId, level);
    if (!question) return;

    setSubmitting(true);
    markQuestionAnswered(question.id);

    // Fire-and-forget tribute submission
    fetch('/api/tributes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: player.id,
        playerName: player.name,
        questionId: question.id,
        question: question.text,
        answer: answer.trim(),
        answeredAt: Date.now(),
      }),
    }).catch(() => {/* silent failure */});

    setSubmitting(false);
    setWinPhase('thanks');
    setTimeout(() => setWinPhase('buttons'), 2000);
  }, [answer, player, gameId, level, markQuestionAnswered]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const tributeQuestion = getTributeQuestion(gameId, level);

  return (
    <div className="game-container">
      {/* HUD */}
      <div className="hud">
        {/* Bouton quitter */}
        <button
          onClick={() => router.back()}
          style={{
            background: 'rgba(220,20,60,0.12)',
            border: '1px solid rgba(220,20,60,0.3)',
            borderRadius: '10px',
            color: 'var(--rasta-red)',
            width: '36px', height: '36px',
            cursor: 'pointer',
            padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Quitter"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Centre : titre + niveau */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>
            {gameEmoji} {gameTitle}
          </div>
          {/* Dots de niveau */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '4px' }}>
            {[1, 2, 3, 4, 5].map(l => (
              <div key={l} style={{
                width:  l <= level ? '7px' : '5px',
                height: l <= level ? '7px' : '5px',
                borderRadius: '50%',
                background: l <= level ? 'var(--rasta-gold)' : 'rgba(255,255,255,0.15)',
                boxShadow: l <= level ? '0 0 5px rgba(255,215,0,0.5)' : 'none',
                transition: 'all 0.2s',
              }} />
            ))}
            <span style={{
              fontSize: '10px',
              color: 'var(--rasta-green-light)',
              marginLeft: '4px',
              fontWeight: 600,
              background: 'rgba(50,205,50,0.12)',
              borderRadius: '8px',
              padding: '1px 6px',
            }}>
              {LEVEL_LABELS[level]}
            </span>
          </div>
        </div>

        {/* Chrono */}
        <div style={{
          fontFamily: 'monospace',
          color: 'var(--rasta-gold)',
          fontSize: '20px',
          fontWeight: 900,
          letterSpacing: '1px',
          textShadow: '0 0 10px rgba(255,215,0,0.45)',
          flexShrink: 0,
          minWidth: '48px',
          textAlign: 'right',
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
            overflowY: 'auto',
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
                ⚔️ La Baffe est sauvée !
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
            <div style={{
              fontSize: '12px',
              color: 'var(--rasta-green-light)',
              textAlign: 'center',
              background: 'rgba(50,205,50,0.08)',
              border: '1px solid rgba(50,205,50,0.2)',
              borderRadius: '10px',
              padding: '6px 14px',
            }}>
              ✓ Score sauvegardé
            </div>

            {/* Tribute question form */}
            {winPhase === 'question' && tributeQuestion && (
              <div style={{
                width: '100%',
                background: 'rgba(255,215,0,0.06)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--rasta-gold)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}>
                  {tributeQuestion.text}
                </div>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={tributeQuestion.placeholder}
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,215,0,0.25)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '15px',
                    resize: 'none',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  className="btn-rasta"
                  onClick={handleSubmitAnswer}
                  disabled={!answer.trim() || submitting}
                  style={{ opacity: !answer.trim() || submitting ? 0.5 : 1 }}
                >
                  Envoyer 💌
                </button>
              </div>
            )}

            {/* Thanks message */}
            {winPhase === 'thanks' && (
              <div style={{
                width: '100%',
                background: 'rgba(50,205,50,0.1)',
                border: '1px solid rgba(50,205,50,0.3)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
                color: 'var(--rasta-green-light)',
                fontSize: '17px',
                fontWeight: 700,
              }}>
                Merci ! Léonie va adorer 🌸
              </div>
            )}

            {/* Navigation buttons */}
            {winPhase === 'buttons' && (
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
            )}
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
            {/* Schlagonie mascot: leaf + face + crown */}
            <svg width="110" height="120" viewBox="0 0 110 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              {/* ── 7-finger cannabis leaf ── */}
              {/* centre stem */}
              <line x1="55" y1="100" x2="55" y2="40" stroke="#228B22" strokeWidth="3" strokeLinecap="round"/>
              {/* centre top finger */}
              <ellipse cx="55" cy="28" rx="7" ry="16" fill="#32CD32" transform="rotate(0 55 44)"/>
              {/* left fingers */}
              <ellipse cx="55" cy="28" rx="6" ry="14" fill="#2db82d" transform="rotate(-28 55 60)"/>
              <ellipse cx="55" cy="28" rx="5" ry="12" fill="#228B22" transform="rotate(-56 55 68)"/>
              <ellipse cx="55" cy="28" rx="4" ry="10" fill="#1a6e1a" transform="rotate(-80 55 74)"/>
              {/* right fingers */}
              <ellipse cx="55" cy="28" rx="6" ry="14" fill="#2db82d" transform="rotate(28 55 60)"/>
              <ellipse cx="55" cy="28" rx="5" ry="12" fill="#228B22" transform="rotate(56 55 68)"/>
              <ellipse cx="55" cy="28" rx="4" ry="10" fill="#1a6e1a" transform="rotate(80 55 74)"/>
              {/* ── Face circle ── */}
              <circle cx="55" cy="62" r="20" fill="#F5CBA7" stroke="#c4956a" strokeWidth="1.5"/>
              {/* eyes */}
              <circle cx="48" cy="58" r="3.5" fill="#2c1a0a"/>
              <circle cx="62" cy="58" r="3.5" fill="#2c1a0a"/>
              {/* eye glints */}
              <circle cx="49.5" cy="56.5" r="1.2" fill="white"/>
              <circle cx="63.5" cy="56.5" r="1.2" fill="white"/>
              {/* smile */}
              <path d="M47 67 Q55 74 63 67" stroke="#a0522d" strokeWidth="2" strokeLinecap="round" fill="none"/>
              {/* rosy cheeks */}
              <ellipse cx="43" cy="65" rx="5" ry="3" fill="rgba(220,80,60,0.25)"/>
              <ellipse cx="67" cy="65" rx="5" ry="3" fill="rgba(220,80,60,0.25)"/>
              {/* ── Crown ── */}
              {/* crown base band */}
              <rect x="36" y="40" width="38" height="10" rx="3" fill="#FFD700"/>
              {/* crown points */}
              <polygon points="36,40 42,26 48,40" fill="#FFD700"/>
              <polygon points="49,40 55,22 61,40" fill="#FFD700"/>
              <polygon points="62,40 68,26 74,40" fill="#FFD700"/>
              {/* crown outline */}
              <polyline points="36,40 36,50 74,50 74,40 68,26 61,40 55,22 49,40 42,26 36,40" fill="none" stroke="#FFA500" strokeWidth="1.2" strokeLinejoin="round"/>
              {/* rubies: 3 */}
              <circle cx="45" cy="45" r="3.5" fill="#DC143C"/>
              <circle cx="55" cy="45" r="3.5" fill="#DC143C"/>
              <circle cx="65" cy="45" r="3.5" fill="#DC143C"/>
              {/* pearls: 2 */}
              <circle cx="36" cy="50" r="3" fill="white" stroke="#ddd" strokeWidth="0.8"/>
              <circle cx="74" cy="50" r="3" fill="white" stroke="#ddd" strokeWidth="0.8"/>
            </svg>
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
                Aydoilles a conquis La Baffe 🌫️
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
