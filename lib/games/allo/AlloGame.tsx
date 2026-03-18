'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps, DifficultyLevel } from '@/lib/types';
import { QUESTIONS, WIN_SCORE, QUESTION_COUNT, QUESTION_TIME } from './questions';
import type { AlloQuestion } from './types';

function shuffleArr(arr: AlloQuestion[]): AlloQuestion[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleAndPick(level: DifficultyLevel): AlloQuestion[] {
  // Questions du niveau exact en priorité (jamais vues aux niveaux précédents)
  const thisLevel = shuffleArr(QUESTIONS.filter(q => q.minLevel === level));
  // Questions des niveaux inférieurs en complément si besoin
  const lowerLevels = shuffleArr(QUESTIONS.filter(q => q.minLevel < level));
  return [...thisLevel, ...lowerLevels].slice(0, QUESTION_COUNT[level]);
}

type Phase = 'reading' | 'answering' | 'feedback';

// Ticket number persists for the session
const TICKET_BASE = 4200 + Math.floor(Math.random() * 800);

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
  const [canContinue, setCanContinue] = useState(false);
  const [pendingLives, setPendingLives] = useState(3);

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
    setPendingLives(newLives);
    setSelected(answer === '__timeout__' ? null : answer);
    setEarnedPts(pts);
    setIsAnswerCorrect(correct);
    setCanContinue(false);
    setFeedbackMsg(
      correct
        ? currentQ.explanation
        : isTimeout
          ? `Temps écoulé ! Bonne réponse : "${currentQ.correct}". ${currentQ.explanation}`
          : `Bonne réponse : "${currentQ.correct}". ${currentQ.explanation}`
    );

    // Si plus de vies, game over automatique après un court délai
    if (newLives <= 0) {
      setTimeout(() => onGameOver(), 1800);
      return;
    }

    // Bouton "Continuer" disponible après 600ms (laisse le temps de voir le feedback)
    setTimeout(() => setCanContinue(true), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, questions, level, maxTime, onLevelComplete, onGameOver, clearTimer]);

  const advanceToNext = useCallback(() => {
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
    setCanContinue(false);
    const newTime = QUESTION_TIME[level];
    setTimeLeft(newTime);
    timeLeftRef.current = newTime;
    timeoutFiredRef.current = false;
    setPhase('reading');
    phaseRef.current = 'reading';
  }, [qi, questions.length, level, onLevelComplete, onGameOver]);

  // Reading → answering after 2s (temps de lire le message client)
  useEffect(() => {
    if (phase !== 'reading') return;
    const t = setTimeout(() => {
      setPhase('answering');
      phaseRef.current = 'answering';
    }, 2000);
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
  const ticketNum = `#${TICKET_BASE + qi}`;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0f1a',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e8ecf0',
    }}>

      {/* ══════════════════════════════════════════════
          HEADER HELPDESK
      ══════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1e3a 0%, #0a1428 100%)',
        borderBottom: '1px solid rgba(74,144,217,0.25)',
        padding: '9px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Logo / branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{
            width: '34px', height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2a5fbd, #1a3d8a)',
            border: '1px solid rgba(74,144,217,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
          }}>
            🎧
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#5b9ef0', letterSpacing: '0.4px', lineHeight: 1 }}>
              LA BAFFE SUPPORT
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', letterSpacing: '0.3px' }}>
              Centre d&apos;assistance client
            </div>
          </div>
        </div>

        {/* Agent status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: 'rgba(50,205,50,0.08)',
          border: '1px solid rgba(50,205,50,0.2)',
          borderRadius: '20px',
          padding: '4px 9px',
        }}>
          <span style={{
            width: '7px', height: '7px',
            borderRadius: '50%',
            background: '#32CD32',
            display: 'inline-block',
            boxShadow: '0 0 6px #32CD32',
          }} />
          <span style={{ fontSize: '10px', color: '#32CD32', fontWeight: 700, letterSpacing: '0.3px' }}>
            EN LIGNE
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TICKET INFO BAR
      ══════════════════════════════════════════════ */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        {/* Ticket number */}
        <span style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace',
          fontWeight: 600,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '4px',
          padding: '1px 5px',
          flexShrink: 0,
        }}>
          {ticketNum}
        </span>

        {/* Customer name */}
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 600, flexShrink: 0 }}>
          {q.customerName}
        </span>

        {/* Type badge */}
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '10px',
          background: q.type === 'orthography' ? 'rgba(255,193,7,0.12)' : 'rgba(74,144,217,0.15)',
          color: q.type === 'orthography' ? '#ffc107' : '#5b9ef0',
          border: `1px solid ${q.type === 'orthography' ? 'rgba(255,193,7,0.25)' : 'rgba(74,144,217,0.3)'}`,
          letterSpacing: '0.3px',
          flexShrink: 0,
        }}>
          {q.type === 'orthography' ? '📝 ORTHOGRAPHE' : '📊 STATISTIQUE'}
        </span>

        <div style={{ flex: 1 }} />

        {/* Question counter */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {Array.from({ length: questions.length }).map((_, i) => (
            <div key={i} style={{
              width: i === qi ? '14px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i < qi ? '#32CD32' : i === qi ? '#5b9ef0' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TIMER ROW
      ══════════════════════════════════════════════ */}
      <div style={{
        padding: '5px 14px',
        background: 'rgba(0,0,0,0.2)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {phase === 'reading' ? '⏳ Lecture…' : phase === 'answering' ? '⏱ Temps restant' : '✓ Traité'}
        </span>
        <div style={{
          flex: 1,
          height: '5px',
          background: 'rgba(255,255,255,0.07)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: phase === 'reading' ? '100%' : `${timerPct * 100}%`,
            background: phase === 'reading' ? 'rgba(74,144,217,0.4)' : timerColor,
            borderRadius: '3px',
            transition: phase === 'reading' ? 'none' : 'width 0.1s linear, background 0.4s ease',
          }} />
        </div>
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: 'monospace',
          color: phase === 'answering' ? timerColor : 'rgba(255,255,255,0.25)',
          minWidth: '28px',
          textAlign: 'right',
          transition: 'color 0.4s',
          flexShrink: 0,
        }}>
          {phase === 'answering' ? `${Math.ceil(timeLeft)}s` : phase === 'reading' ? `${maxTime}s` : '✓'}
        </span>
      </div>

      {/* ══════════════════════════════════════════════
          ZONE CHAT
      ══════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>

        {/* Séparateur de ticket */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
            Ticket ouvert
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* MESSAGE CLIENT ── */}
        <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
          {/* Avatar client */}
          <div style={{
            width: '38px', height: '38px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '1.5px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
          }}>
            {q.customerEmoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header du message */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '5px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                {q.customerName}
              </span>
              <span style={{
                fontSize: '9px', color: 'rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px', padding: '1px 5px',
              }}>
                CLIENT
              </span>
            </div>
            {/* Bulle message */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '4px 14px 14px 14px',
              padding: '10px 13px',
              fontSize: '13px',
              color: '#dde3ea',
              lineHeight: 1.6,
              maxWidth: '260px',
            }}>
              {q.customerMessage}
            </div>
          </div>
        </div>

        {/* AGENT EN TRAIN D'ÉCRIRE ── */}
        {phase === 'reading' && (
          <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '5px', justifyContent: 'flex-end' }}>
                <span style={{
                  fontSize: '9px', color: '#5b9ef0',
                  background: 'rgba(74,144,217,0.12)',
                  border: '1px solid rgba(74,144,217,0.25)',
                  borderRadius: '4px', padding: '1px 5px',
                  fontWeight: 700,
                }}>
                  VOUS · AGENT
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                  Moi
                </span>
              </div>
              <div style={{
                display: 'inline-block',
                background: 'rgba(74,144,217,0.08)',
                border: '1px solid rgba(74,144,217,0.2)',
                borderRadius: '14px 4px 14px 14px',
                padding: '10px 16px',
                fontSize: '22px',
                letterSpacing: '5px',
                color: 'rgba(74,144,217,0.6)',
              }}>
                •••
              </div>
            </div>
            {/* Avatar agent */}
            <div style={{
              width: '38px', height: '38px',
              borderRadius: '50%',
              background: 'rgba(74,144,217,0.12)',
              border: '1.5px solid rgba(74,144,217,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>
              🎧
            </div>
          </div>
        )}

        {/* RÉPONSE AGENT AVEC LE SLOT ── */}
        {(phase === 'answering' || phase === 'feedback') && (
          <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right', maxWidth: '260px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '5px', justifyContent: 'flex-end' }}>
                <span style={{
                  fontSize: '9px', color: '#5b9ef0',
                  background: 'rgba(74,144,217,0.12)',
                  border: '1px solid rgba(74,144,217,0.25)',
                  borderRadius: '4px', padding: '1px 5px',
                  fontWeight: 700,
                }}>
                  VOUS · AGENT
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                  Moi
                </span>
              </div>
              {/* Bulle réponse en cours */}
              <div style={{
                display: 'inline-block',
                textAlign: 'left',
                background: 'rgba(74,144,217,0.07)',
                border: `1.5px solid ${
                  phase === 'feedback'
                    ? isAnswerCorrect
                      ? 'rgba(50,205,50,0.45)'
                      : 'rgba(220,20,60,0.45)'
                    : 'rgba(74,144,217,0.3)'
                }`,
                borderRadius: '14px 4px 14px 14px',
                padding: '10px 13px',
                fontSize: '13px',
                color: '#dde3ea',
                lineHeight: 1.6,
                transition: 'border-color 0.3s',
              }}>
                {q.responseBefore}

                {/* Slot vide (answering) */}
                {phase === 'answering' && (
                  <span style={{
                    display: 'inline-block',
                    background: 'rgba(255,215,0,0.1)',
                    border: '1.5px dashed rgba(255,215,0,0.5)',
                    borderRadius: '5px',
                    color: '#FFD700',
                    fontWeight: 700,
                    padding: '1px 10px',
                    margin: '0 2px',
                    letterSpacing: '3px',
                    fontSize: '11px',
                    verticalAlign: 'middle',
                  }}>
                    _ _ _
                  </span>
                )}

                {/* Résultat (feedback) */}
                {phase === 'feedback' && (
                  <>
                    {selected && !isAnswerCorrect && (
                      <span style={{
                        fontWeight: 700,
                        color: '#DC143C',
                        textDecoration: 'line-through',
                        padding: '0 2px',
                      }}>
                        {selected}
                      </span>
                    )}{' '}
                    <span style={{
                      fontWeight: 700,
                      color: isAnswerCorrect ? '#32CD32' : '#FFD700',
                      padding: '1px 7px',
                      background: isAnswerCorrect ? 'rgba(50,205,50,0.12)' : 'rgba(255,215,0,0.1)',
                      borderRadius: '5px',
                    }}>
                      {q.correct}
                    </span>
                  </>
                )}

                {q.responseAfter}
              </div>
            </div>

            {/* Avatar agent */}
            <div style={{
              width: '38px', height: '38px',
              borderRadius: '50%',
              background: 'rgba(74,144,217,0.12)',
              border: `1.5px solid ${phase === 'feedback' ? (isAnswerCorrect ? 'rgba(50,205,50,0.4)' : 'rgba(220,20,60,0.4)') : 'rgba(74,144,217,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
              transition: 'border-color 0.3s',
            }}>
              {phase === 'feedback' ? (isAnswerCorrect ? '✅' : '❌') : '🎧'}
            </div>
          </div>
        )}

        {/* FEEDBACK / EXPLICATION ── */}
        {phase === 'feedback' && (
          <div style={{
            background: isAnswerCorrect ? 'rgba(50,205,50,0.07)' : 'rgba(220,20,60,0.07)',
            border: `1px solid ${isAnswerCorrect ? 'rgba(50,205,50,0.2)' : 'rgba(220,20,60,0.2)'}`,
            borderRadius: '10px',
            padding: '12px 13px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.65,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '13px', color: isAnswerCorrect ? '#32CD32' : '#DC143C' }}>
              {isAnswerCorrect ? '✅ Bonne réponse !' : '❌ Incorrect'}
            </div>
            {feedbackMsg}
            {earnedPts > 0 && (
              <div style={{ color: '#FFD700', fontWeight: 700, marginTop: '6px', fontSize: '13px' }}>
                +{earnedPts} pts{combo >= 3 ? ` · combo ${comboMult} !` : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          BOUTON CONTINUER (feedback)
      ══════════════════════════════════════════════ */}
      {phase === 'feedback' && pendingLives > 0 && (
        <div style={{
          padding: '10px 12px 16px',
          flexShrink: 0,
          background: 'rgba(0,0,0,0.15)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={advanceToNext}
            disabled={!canContinue}
            style={{
              width: '100%',
              minHeight: '52px',
              background: canContinue
                ? isAnswerCorrect
                  ? 'linear-gradient(135deg, rgba(50,205,50,0.2), rgba(34,139,34,0.15))'
                  : 'linear-gradient(135deg, rgba(74,144,217,0.2), rgba(42,95,189,0.15))'
                : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${canContinue
                ? isAnswerCorrect ? 'rgba(50,205,50,0.4)' : 'rgba(74,144,217,0.4)'
                : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '12px',
              color: canContinue ? '#e8ecf0' : 'rgba(255,255,255,0.2)',
              fontSize: '15px',
              fontWeight: 700,
              cursor: canContinue ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
              transition: 'all 0.4s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              letterSpacing: '0.3px',
            }}
          >
            {canContinue ? (
              <>
                {qi + 1 >= questions.length ? '🏁 Voir les résultats' : 'Ticket suivant →'}
              </>
            ) : (
              <span style={{ fontSize: '13px', opacity: 0.5 }}>•••</span>
            )}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ZONE DE RÉPONSE (boutons)
      ══════════════════════════════════════════════ */}
      {phase === 'answering' && (
        <div style={{
          background: 'rgba(74,144,217,0.04)',
          borderTop: '1px solid rgba(74,144,217,0.15)',
          padding: '10px 12px 14px',
          flexShrink: 0,
        }}>
          {/* Label */}
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: 'rgba(74,144,217,0.7)',
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            marginBottom: '9px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}>
            <span style={{ width: '14px', height: '1.5px', background: 'rgba(74,144,217,0.4)', display: 'inline-block' }} />
            {q.type === 'orthography' ? 'Choisissez le bon mot' : 'Choisissez le bon chiffre'}
            <span style={{ width: '14px', height: '1.5px', background: 'rgba(74,144,217,0.4)', display: 'inline-block' }} />
          </div>

          {/* Boutons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: q.options.length <= 2 ? '1fr' : '1fr 1fr',
            gap: '8px',
          }}>
            {q.options.map(opt => (
              <button
                key={opt}
                onClick={() => resolve(opt)}
                style={{
                  minHeight: '52px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  color: '#dde3ea',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 10px',
                  WebkitTapHighlightColor: 'transparent',
                  lineHeight: 1.3,
                  transition: 'background 0.12s, border-color 0.12s',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          BARRE DE STATUT (score / combo / vies)
      ══════════════════════════════════════════════ */}
      <div style={{
        background: '#07101e',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>PTS</span>
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#FFD700', fontFamily: 'monospace', lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>/ {WIN_SCORE[level]}</span>
        </div>

        {/* Combo */}
        {comboMult ? (
          <div style={{
            fontSize: '12px', color: '#FF8C00', fontWeight: 700,
            background: 'rgba(255,140,0,0.1)',
            border: '1px solid rgba(255,140,0,0.25)',
            borderRadius: '8px', padding: '3px 9px',
          }}>
            🔥 COMBO {comboMult}
          </div>
        ) : (
          <div style={{ width: '1px' }} />
        )}

        {/* Vies */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              fontSize: '16px',
              opacity: i < lives ? 1 : 0.1,
              transition: 'opacity 0.4s',
              filter: i < lives ? 'none' : 'grayscale(1)',
            }}>
              ❤️
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
