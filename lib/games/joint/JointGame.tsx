'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { STEPS, SPEED_TARGET, WIN_SCORE, type ActionType } from './steps';
import type { GameProps } from '@/lib/types';

const ACTION_ICON: Record<ActionType, string> = {
  'swipe-right': '→',
  'swipe-left': '←',
  'swipe-up': '↑',
  'swipe-down': '↓',
  'tap': '👆',
  'rapid-tap': '👆',
  'hold': '✊',
};

const ACTION_HINT: Record<ActionType, string> = {
  'swipe-right': 'Swipe →',
  'swipe-left': 'Swipe ←',
  'swipe-up': 'Swipe ↑',
  'swipe-down': 'Swipe ↓',
  'tap': 'Tape !',
  'rapid-tap': 'Tape vite !',
  'hold': 'Tiens appuyé',
};

const ACTION_ANIM: Record<ActionType, string> = {
  'swipe-right': 'joint-slide-right',
  'swipe-left': 'joint-slide-left',
  'swipe-up': 'joint-slide-up',
  'swipe-down': 'joint-slide-down',
  'tap': 'joint-pulse',
  'rapid-tap': 'joint-pulse',
  'hold': 'joint-pulse',
};

// Amélioration 1 — Joint progressif
const JOINT_STAGES = [
  { emoji: '⚙️', label: 'Grindage...' },
  { emoji: '📄', label: 'La feuille' },
  { emoji: '🌿', label: 'En prépa...' },
  { emoji: '🚬', label: 'On roule !' },
  { emoji: '🔒', label: 'Fermé !' },
  { emoji: '🔥', label: 'En feu !' },
];

function getJointStage(stepIdx: number): number {
  if (stepIdx <= 1) return 0;
  if (stepIdx === 2) return 1;
  if (stepIdx <= 6) return 2;
  if (stepIdx <= 8) return 3;
  if (stepIdx === 9) return 4;
  return 5;
}

export default function JointGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  // Amélioration 3 — phase inclut 'error'
  const [phase, setPhase] = useState<'active' | 'success' | 'error'>('active');
  const [lastGain, setLastGain] = useState({ base: 0, speed: 0, combo: 0 });
  // Amélioration 2 — countdown timer
  const [stepTimerPct, setStepTimerPct] = useState(0);

  const stepStartRef = useRef(Date.now());
  const startRef = useRef(Date.now());
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  // Amélioration 4 — combo streak
  const comboRef = useRef(0);
  const completeStepRef = useRef<(forced?: boolean) => void>(() => {});

  // Amélioration 2 — arc countdown qui rétrécit (repart à chaque nouvelle étape)
  useEffect(() => {
    setStepTimerPct(0);
    const speedTarget = SPEED_TARGET[level];
    let raf: number;
    const tick = () => {
      const pct = Math.min(((Date.now() - stepStartRef.current) / speedTarget) * 100, 100);
      setStepTimerPct(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stepIdx, level]);

  const completeStep = useCallback((forced = false) => {
    if (phase !== 'active') return;
    const step = STEPS[stepIdx];
    const elapsed = Date.now() - stepStartRef.current;
    const speedTarget = SPEED_TARGET[level];
    const isFast = !forced && elapsed <= speedTarget;

    // Amélioration 4 — mise à jour combo
    comboRef.current = isFast ? comboRef.current + 1 : 0;
    const combo = comboRef.current;
    const multiplier = combo >= 5 ? 1.5 : combo >= 3 ? 1.2 : 1;

    const rawSpeedBonus = forced
      ? 0
      : elapsed <= speedTarget
      ? step.bonusPoints
      : elapsed <= speedTarget * 2
      ? Math.round(step.bonusPoints * (1 - (elapsed - speedTarget) / speedTarget))
      : 0;

    const speedBonus = Math.round(rawSpeedBonus * (isFast ? multiplier : 1));
    const gain = step.basePoints + Math.max(0, speedBonus);
    const newScore = score + gain;

    setLastGain({ base: step.basePoints, speed: Math.max(0, speedBonus), combo });
    setPhase('success');
    setScore(newScore);

    setTimeout(() => {
      const isLast = stepIdx >= STEPS.length - 1;
      if (isLast) {
        if (newScore >= WIN_SCORE[level]) {
          onLevelComplete(Date.now() - startRef.current);
        } else {
          onGameOver();
        }
      } else {
        setStepIdx((i) => i + 1);
        setTapCount(0);
        setHoldProgress(0);
        setPhase('active');
        stepStartRef.current = Date.now();
      }
    }, 950);
  }, [phase, stepIdx, score, level, onLevelComplete, onGameOver]);

  completeStepRef.current = completeStep;

  const pointerStartX = useRef(0);
  const pointerStartY = useRef(0);

  const startHold = useCallback(() => {
    if (phase !== 'active') return;
    if (holdStartRef.current !== null) return;
    const step = STEPS[stepIdx];
    if (step.action !== 'hold') return;
    holdStartRef.current = Date.now();
    const target = step.target ?? 1000;
    const animate = () => {
      if (holdStartRef.current === null) return;
      const progress = Math.min(((Date.now() - holdStartRef.current) / target) * 100, 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        holdStartRef.current = null;
        completeStepRef.current();
        return;
      }
      holdRafRef.current = requestAnimationFrame(animate);
    };
    holdRafRef.current = requestAnimationFrame(animate);
  }, [phase, stepIdx]);

  const cancelHold = useCallback(() => {
    holdStartRef.current = null;
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    setHoldProgress(0);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'active') return;
    // setPointerCapture garantit que pointerup/cancel arrivent même si le doigt sort de l'élément
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;

    const step = STEPS[stepIdx];
    if (step.action === 'hold') startHold();
  }, [phase, stepIdx, startHold]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'active') return;
    const step = STEPS[stepIdx];

    if (step.action === 'hold') {
      cancelHold();
      return;
    }

    const dx = e.clientX - pointerStartX.current;
    const dy = e.clientY - pointerStartY.current;

    if (step.action === 'tap') { completeStep(); return; }
    if (step.action === 'rapid-tap') {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount >= (step.target ?? 8)) completeStep();
      return;
    }

    const threshold = 40;
    let detected: string | null = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > threshold) detected = 'swipe-right';
      else if (dx < -threshold) detected = 'swipe-left';
    } else {
      if (dy > threshold) detected = 'swipe-down';
      else if (dy < -threshold) detected = 'swipe-up';
    }

    if (detected === step.action) {
      completeStep();
    } else if (detected !== null) {
      setPhase('error');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(80);
      setTimeout(() => setPhase('active'), 300);
    }
  }, [phase, stepIdx, tapCount, completeStep, cancelHold]);

  const handlePointerCancel = useCallback(() => {
    cancelHold();
  }, [cancelHold]);

  useEffect(() => () => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
  }, []);

  const step = STEPS[stepIdx];
  const target = step.target ?? 8;
  const winScore = WIN_SCORE[level];
  const totalProgress = (stepIdx / STEPS.length) * 100;
  const jointStage = getJointStage(stepIdx);

  // Amélioration 2 — arc countdown SVG
  const TR = 18;
  const TCIRC = 2 * Math.PI * TR;
  const timerDash = (1 - stepTimerPct / 100) * TCIRC;
  const timerColor = stepTimerPct < 75 ? '#00C851' : stepTimerPct < 90 ? '#FFD700' : '#DC143C';

  // Hold ring SVG
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const holdDash = (holdProgress / 100) * CIRC;

  // Action area border/bg depends on phase
  const areaBorder = phase === 'success'
    ? '2px solid #00C851'
    : phase === 'error'
    ? '2px solid #DC143C'
    : '2px solid rgba(255,255,255,0.08)';
  const areaBg = phase === 'success'
    ? 'rgba(0,200,81,0.08)'
    : phase === 'error'
    ? 'rgba(220,20,60,0.08)'
    : 'rgba(255,255,255,0.02)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '8px 12px',
      gap: '8px',
      boxSizing: 'border-box',
      userSelect: 'none',
    }}>
      {/* Header: score + step counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '6px 12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>/ {winScore}</span>
          </div>
          <div style={{ color: '#FFD700', fontWeight: 900, fontSize: '20px', fontFamily: 'monospace', lineHeight: 1.1 }}>{score}</div>
          <div style={{ marginTop: '4px', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((score / winScore) * 100, 100)}%`,
              background: 'linear-gradient(90deg, #00C851, #FFD700)',
              borderRadius: '99px',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '6px 14px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px' }}>Étape</div>
          <div style={{ color: '#00C851', fontWeight: 900, fontSize: '20px', lineHeight: 1.1 }}>
            {stepIdx + 1}<span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>/{STEPS.length}</span>
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div style={{ flexShrink: 0, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${totalProgress}%`,
          background: '#00C851',
          borderRadius: '99px',
          transition: 'width 0.3s',
        }} />
      </div>

      {/* Main action area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          gap: '16px',
          borderRadius: '20px',
          border: areaBorder,
          background: areaBg,
          overflow: 'hidden',
          touchAction: 'none',
          cursor: 'pointer',
          WebkitTouchCallout: 'none',
          transition: 'border-color 0.15s, background 0.15s',
          // Amélioration 3 — shake sur erreur
          animation: phase === 'error' ? 'joint-shake 0.3s ease-out' : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Amélioration 2 — arc countdown (top-left) */}
        <div style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none' }}>
          <svg width={TR * 2 + 8} height={TR * 2 + 8}>
            <circle cx={TR + 4} cy={TR + 4} r={TR} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
            {stepTimerPct < 100 && (
              <circle
                cx={TR + 4} cy={TR + 4} r={TR}
                fill="none"
                stroke={timerColor}
                strokeWidth="4"
                strokeDasharray={`${timerDash} ${TCIRC}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${TR + 4} ${TR + 4})`}
              />
            )}
          </svg>
        </div>

        {/* Amélioration 1 — joint progressif (top-right) */}
        <div
          key={jointStage}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,200,81,0.1)',
            border: '1px solid rgba(0,200,81,0.3)',
            borderRadius: '10px',
            padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: '5px',
            animation: 'joint-bounce-in 0.3s ease-out',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '18px' }}>{JOINT_STAGES[jointStage].emoji}</span>
          <span style={{ fontSize: '10px', color: '#00C851', fontWeight: 700, letterSpacing: '0.5px' }}>
            {JOINT_STAGES[jointStage].label}
          </span>
        </div>

        {/* Amélioration 3 — overlay erreur */}
        {phase === 'error' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}>
            <div style={{ fontSize: '64px', lineHeight: 1 }}>❌</div>
          </div>
        )}

        {/* Overlay succès */}
        {phase === 'success' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '8px', zIndex: 10,
            animation: 'joint-bounce-in 0.25s ease-out',
          }}>
            <div style={{ fontSize: '56px', lineHeight: 1 }}>✅</div>
            <div style={{
              color: '#00C851', fontWeight: 900, fontSize: '28px',
              fontFamily: 'monospace',
              textShadow: '0 0 20px rgba(0,200,81,0.6)',
            }}>
              +{lastGain.base + lastGain.speed}
            </div>
            {lastGain.speed > 0 && (
              <div style={{
                color: '#FFD700', fontSize: '14px',
                background: 'rgba(255,215,0,0.1)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: '8px', padding: '2px 10px',
              }}>
                ⚡ Bonus vitesse +{lastGain.speed}
              </div>
            )}
            {/* Amélioration 4 — affichage combo */}
            {lastGain.combo >= 3 && (
              <div style={{
                color: lastGain.combo >= 5 ? '#FF6B35' : '#FFD700',
                fontSize: '15px', fontWeight: 900,
                background: lastGain.combo >= 5 ? 'rgba(255,107,53,0.15)' : 'rgba(255,215,0,0.12)',
                border: `1px solid ${lastGain.combo >= 5 ? 'rgba(255,107,53,0.4)' : 'rgba(255,215,0,0.35)'}`,
                borderRadius: '8px', padding: '3px 12px',
              }}>
                {lastGain.combo >= 5 ? '💥 COMBO x1.5' : '🔥 COMBO x1.2'}
              </div>
            )}
          </div>
        )}

        {/* Contenu étape active */}
        {phase === 'active' && (
          <>
            <div style={{ fontSize: '72px', lineHeight: 1, animation: 'joint-float 2s ease-in-out infinite' }}>
              {step.emoji}
            </div>

            <div style={{ textAlign: 'center', padding: '0 16px' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '20px', marginBottom: '4px' }}>
                {step.label}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                {step.description}
              </div>
            </div>

            {step.action === 'hold' ? (
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <svg width="120" height="120" style={{ position: 'absolute', inset: 0 }}>
                  <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r={R} fill="none" stroke="#00C851" strokeWidth="8"
                    strokeDasharray={`${holdDash} ${CIRC}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.05s linear' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '4px',
                }}>
                  <div style={{ fontSize: '28px' }}>✊</div>
                  <div style={{ color: '#00C851', fontSize: '11px', fontWeight: 700 }}>TIENS</div>
                </div>
              </div>
            ) : step.action === 'rapid-tap' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 90, height: 90, borderRadius: '50%',
                  border: '3px solid #00C851',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px',
                  animation: 'joint-pulse 0.5s ease-in-out infinite',
                }}>
                  👆
                </div>
                <div style={{ color: '#00C851', fontWeight: 700, fontSize: '24px', fontFamily: 'monospace' }}>
                  {tapCount} / {target}
                </div>
                <div style={{ width: 160, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(tapCount / target) * 100}%`,
                    background: '#00C851',
                    borderRadius: '99px',
                    transition: 'width 0.05s',
                  }} />
                </div>
              </div>
            ) : step.action === 'tap' ? (
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                border: '3px solid #00C851',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px',
                animation: 'joint-pulse 1.2s ease-in-out infinite',
              }}>
                👆
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '32px', color: '#00C851',
                      opacity: 0.3 + i * 0.3,
                      animation: `${ACTION_ANIM[step.action]} 1s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  >
                    {ACTION_ICON[step.action]}
                  </div>
                ))}
              </div>
            )}

            <div style={{
              color: 'rgba(255,255,255,0.25)', fontSize: '12px',
              letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              {ACTION_HINT[step.action]}
            </div>
          </>
        )}
      </div>

      {/* Step mini-map */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: '4px',
        justifyContent: 'center', paddingBottom: '2px',
      }}>
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            style={{
              width: i === stepIdx ? 20 : 8,
              height: 8,
              borderRadius: '99px',
              background: i < stepIdx ? '#00C851' : i === stepIdx ? '#FFD700' : 'rgba(255,255,255,0.12)',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
