'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps, DifficultyLevel } from '@/lib/types';
import { QUESTIONS, WIN_SCORE, QUESTION_COUNT, QUESTION_TIME } from './questions';
import type { AlloQuestion } from './types';

function shuffleAndPick(level: DifficultyLevel): AlloQuestion[] {
  const eligible = QUESTIONS.filter(q => q.minLevel <= level);
  const arr = [...eligible];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, QUESTION_COUNT[level]);
}

type Phase = 'reading' | 'answering' | 'feedback';

export default function AlloGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [questions] = useState(() => shuffleAndPick(level));
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME[level]);
  const [phase, setPhase] = useState<Phase>('reading');
  const [selected, setSelected] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [earnedPts, setEarnedPts] = useState(0);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);

  const startRef = useRef(Date.now());
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const phaseRef = useRef<Phase>('reading');
  const timeLeftRef = useRef(QUESTION_TIME[level]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutFiredRef = useRef(false);

  const q = questions[qi];
  const maxTime = QUESTION_TIME[level];

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const resolve = useCallback((answer: string) => {
    if (phaseRef.current !== 'answering') return;
    clearTimer();
    phaseRef.current = 'feedback';
    setPhase('feedback');

    const currentQ = questions[qi];
    const isTimeout = answer === '__timeout__';
    const correct = !isTimeout && answer === currentQ.correct;
    const newCombo = correct ? comboRef.current + 1 : 0;
    const mult = newCombo >= 5 ? 1.5 : newCombo >= 3 ? 1.2 : 1.0;
    const timeBonus = correct ? Math.round((timeLeftRef.current / maxTime) * 50) : 0;
    const pts = correct ? Math.round((currentQ.points + timeBonus) * mult) : 0;

    comboRef.current = newCombo;
    scoreRef.current += pts;
    const newLives = correct ? livesRef.current : livesRef.current - 1;
    livesRef.current = newLives;

    setCombo(newCombo);
    setScore(scoreRef.current);
    setLives(newLives);
    setSelected(answer === '__timeout__' ? null : answer);
    setEarnedPts(pts);
    setIsAnswerCorrect(correct);
    setFeedbackMsg(
      correct
        ? currentQ.explanation
        : isTimeout
          ? `Temps écoulé ! Bonne réponse : "${currentQ.correct}". ${currentQ.explanation}`
          : `Bonne réponse : "${currentQ.correct}". ${currentQ.explanation}`
    );

    setTimeout(() => {
      if (newLives <= 0) { onGameOver(); return; }
      const nextQi = qi + 1;
      if (nextQi >= questions.length) {
        if (scoreRef.current >= WIN_SCORE[level]) {
          onLevelComplete(Date.now() - startRef.current);
        } else {
          onGameOver();
        }
        return;
      }
      setQi(nextQi);
      setSelected(null);
      const newTime = QUESTION_TIME[level];
      setTimeLeft(newTime);
      timeLeftRef.current = newTime;
      timeoutFiredRef.current = false;
      setPhase('reading');
      phaseRef.current = 'reading';
    }, 2200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, questions, level, maxTime, onLevelComplete, onGameOver, clearTimer]);

  // Reading → answering after 1.5s
  useEffect(() => {
    if (phase !== 'reading') return;
    const t = setTimeout(() => {
      setPhase('answering');
      phaseRef.current = 'answering';
    }, 1500);
    return () => clearTimeout(t);
  }, [phase, qi]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'answering') return;
    timeoutFiredRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, prev - 0.1);
        timeLeftRef.current = next;
        if (next <= 0 && !timeoutFiredRef.current) {
          timeoutFiredRef.current = true;
          // Defer to avoid setState-inside-setState
          setTimeout(() => resolve('__timeout__'), 0);
        }
        return next;
      });
    }, 100);
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qi]);

  if (!q) return null;

  const timerPct = timeLeft / maxTime;
  const timerColor = timerPct > 0.5 ? '#32CD32' : timerPct > 0.25 ? '#FFD700' : '#DC143C';
  const comboMult = combo >= 5 ? '×1.5' : combo >= 3 ? '×1.2' : null;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-dark)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* ── Barre de score ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}>
        <div style={{ color: 'var(--rasta-gold)', fontWeight: 900, fontSize: '20px', fontFamily: 'monospace', minWidth: '60px' }}>
          {score}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {comboMult && (
            <span style={{
              fontSize: '12px', color: '#FF8C00', fontWeight: 700,
              background: 'rgba(255,140,0,0.15)', borderRadius: '8px', padding: '2px 7px',
            }}>
              🔥 {comboMult}
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ {WIN_SCORE[level]}</span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ fontSize: '16px', opacity: i < lives ? 1 : 0.2, transition: 'opacity 0.3s' }}>❤️</span>
          ))}
        </div>
      </div>

      {/* ── Timer bar ── */}
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{
          height: '100%',
          width: `${timerPct * 100}%`,
          background: timerColor,
          transition: 'width 0.1s linear, background 0.5s ease',
        }} />
      </div>

      {/* ── Compteur de questions ── */}
      <div style={{
        textAlign: 'center',
        fontSize: '11px',
        color: 'var(--text-muted)',
        padding: '4px 0 2px',
        flexShrink: 0,
      }}>
        Question {qi + 1} / {questions.length}
        {phase === 'answering' && (
          <span style={{ marginLeft: '8px', color: timerColor, fontWeight: 700, fontFamily: 'monospace' }}>
            {Math.ceil(timeLeft)}s
          </span>
        )}
      </div>

      {/* ── Zone chat ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {/* Bulle client */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '30px', lineHeight: 1, flexShrink: 0 }}>{q.customerEmoji}</span>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              {q.customerName}
            </div>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px 16px 16px 2px',
              padding: '9px 13px',
              maxWidth: '230px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              lineHeight: 1.55,
            }}>
              {q.customerMessage}
            </div>
          </div>
        </div>

        {/* Indicateur "en train d'écrire" (phase reading) */}
        {phase === 'reading' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginBottom: '3px' }}>
                Support La Baffe 🎧
              </div>
              <div style={{
                background: 'rgba(34,139,34,0.1)',
                border: '1px solid rgba(50,205,50,0.2)',
                borderRadius: '16px 16px 2px 16px',
                padding: '9px 14px',
                fontSize: '20px',
                color: 'var(--text-muted)',
                letterSpacing: '3px',
              }}>
                •••
              </div>
            </div>
            <span style={{ fontSize: '26px', lineHeight: 1, flexShrink: 0 }}>🎧</span>
          </div>
        )}

        {/* Bulle réponse de l'agent avec le slot à remplir */}
        {(phase === 'answering' || phase === 'feedback') && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginBottom: '3px' }}>
                Support La Baffe 🎧
              </div>
              <div style={{
                background: 'rgba(34,139,34,0.1)',
                border: '1px solid rgba(50,205,50,0.25)',
                borderRadius: '16px 16px 2px 16px',
                padding: '9px 13px',
                maxWidth: '230px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: 1.55,
              }}>
                {q.responseBefore}

                {/* Slot à compléter */}
                {phase === 'answering' && (
                  <span style={{
                    display: 'inline-block',
                    background: 'rgba(255,215,0,0.12)',
                    border: '1.5px dashed var(--rasta-gold)',
                    borderRadius: '5px',
                    color: 'var(--rasta-gold)',
                    fontWeight: 700,
                    padding: '0 7px',
                    margin: '0 1px',
                    letterSpacing: '2px',
                  }}>
                    _ _ _
                  </span>
                )}

                {/* Réponse choisie (feedback) */}
                {phase === 'feedback' && (
                  <>
                    {selected && !isAnswerCorrect && (
                      <span style={{
                        display: 'inline-block',
                        fontWeight: 700,
                        color: 'var(--rasta-red)',
                        textDecoration: 'line-through',
                        padding: '0 3px',
                        margin: '0 1px',
                      }}>
                        {selected}
                      </span>
                    )}
                    <span style={{
                      display: 'inline-block',
                      fontWeight: 700,
                      color: isAnswerCorrect ? 'var(--rasta-green-light)' : '#FFD700',
                      padding: '0 3px',
                      margin: '0 1px',
                      background: isAnswerCorrect ? 'rgba(50,205,50,0.12)' : 'rgba(255,215,0,0.12)',
                      borderRadius: '4px',
                    }}>
                      {q.correct}
                    </span>
                  </>
                )}

                {q.responseAfter}
              </div>
            </div>
            <span style={{ fontSize: '26px', lineHeight: 1, flexShrink: 0 }}>🎧</span>
          </div>
        )}

        {/* Bulle de feedback / explication */}
        {phase === 'feedback' && (
          <div style={{
            background: isAnswerCorrect ? 'rgba(34,139,34,0.15)' : 'rgba(220,20,60,0.15)',
            border: `1px solid ${isAnswerCorrect ? 'rgba(50,205,50,0.5)' : 'rgba(220,20,60,0.5)'}`,
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
          }}>
            <span style={{ fontWeight: 700, marginRight: '4px' }}>
              {isAnswerCorrect ? '✅' : '❌'}
            </span>
            {feedbackMsg}
            {earnedPts > 0 && (
              <div style={{
                color: 'var(--rasta-gold)',
                fontWeight: 700,
                marginTop: '5px',
                fontSize: '14px',
              }}>
                +{earnedPts} pts{combo >= 3 ? ` — combo ${comboMult} !` : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Boutons de réponse ── */}
      {phase === 'answering' && (
        <div style={{
          padding: '8px 12px 20px',
          display: 'grid',
          gridTemplateColumns: q.options.length <= 2 ? '1fr' : '1fr 1fr',
          gap: '8px',
          flexShrink: 0,
          background: 'var(--bg-dark)',
        }}>
          {q.options.map(opt => (
            <button
              key={opt}
              onClick={() => resolve(opt)}
              style={{
                minHeight: '54px',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px 10px',
                WebkitTapHighlightColor: 'transparent',
                lineHeight: 1.3,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Spacer quand les boutons sont cachés */}
      {phase !== 'answering' && <div style={{ height: '16px', flexShrink: 0 }} />}
    </div>
  );
}
