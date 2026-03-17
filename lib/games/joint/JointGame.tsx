'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { STEPS, SPEED_TARGET, WIN_SCORE, type ActionType } from './steps';
import type { GameProps } from '@/lib/types';

// Visual config per action type
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

export default function JointGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [phase, setPhase] = useState<'active' | 'success'>('active');
  const [lastGain, setLastGain] = useState({ base: 0, speed: 0 });

  const stepStartRef = useRef(Date.now());
  const startRef = useRef(Date.now());
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);

  // Forward ref to always call latest completeStep in async contexts
  const completeStepRef = useRef<(forced?: boolean) => void>(() => {});

  const completeStep = useCallback((forced = false) => {
    if (phase !== 'active') return;
    const step = STEPS[stepIdx];
    const elapsed = Date.now() - stepStartRef.current;
    const speedTarget = SPEED_TARGET[level];

    const speedBonus = forced
      ? 0
      : elapsed <= speedTarget
      ? step.bonusPoints
      : elapsed <= speedTarget * 2
      ? Math.round(step.bonusPoints * (1 - (elapsed - speedTarget) / speedTarget))
      : 0;

    const gain = step.basePoints + Math.max(0, speedBonus);
    const newScore = score + gain;

    setLastGain({ base: step.basePoints, speed: Math.max(0, speedBonus) });
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
    }, 600);
  }, [phase, stepIdx, score, level, onLevelComplete, onGameOver]);

  completeStepRef.current = completeStep;

  // Touch swipe + tap detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (phase !== 'active') return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;

    const step = STEPS[stepIdx];
    if (step.action === 'hold') {
      holdStartRef.current = Date.now();
      const target = step.target ?? 1400;
      const animate = () => {
        if (holdStartRef.current === null) return;
        const elapsed = Date.now() - holdStartRef.current;
        const progress = Math.min((elapsed / target) * 100, 100);
        setHoldProgress(progress);
        if (progress >= 100) {
          holdStartRef.current = null;
          completeStepRef.current();
          return;
        }
        holdRafRef.current = requestAnimationFrame(animate);
      };
      holdRafRef.current = requestAnimationFrame(animate);
    }
  }, [phase, stepIdx]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (phase !== 'active') return;
    const step = STEPS[stepIdx];

    if (step.action === 'hold') {
      holdStartRef.current = null;
      if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
      setHoldProgress(0);
      return;
    }

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    if (step.action === 'tap') {
      completeStep();
      return;
    }
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
    if (detected === step.action) completeStep();
  }, [phase, stepIdx, tapCount, completeStep]);

  // Click fallback for desktop
  const handleClick = useCallback(() => {
    if (phase !== 'active') return;
    const step = STEPS[stepIdx];
    if (step.action === 'tap') completeStep();
    if (step.action === 'rapid-tap') {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount >= (step.target ?? 8)) completeStep();
    }
  }, [phase, stepIdx, tapCount, completeStep]);

  // Cleanup hold RAF on unmount
  useEffect(() => () => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
  }, []);

  const step = STEPS[stepIdx];
  const target = step.target ?? 8;
  const winScore = WIN_SCORE[level];
  const totalProgress = ((stepIdx) / STEPS.length) * 100;

  // SVG hold ring params
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const holdDash = (holdProgress / 100) * CIRC;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '8px 12px',
        gap: '8px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
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

      {/* Main action area — fills remaining space */}
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
          border: phase === 'success'
            ? '2px solid #00C851'
            : '2px solid rgba(255,255,255,0.08)',
          background: phase === 'success'
            ? 'rgba(0,200,81,0.08)'
            : 'rgba(255,255,255,0.02)',
          overflow: 'hidden',
          touchAction: 'none',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {/* Success overlay */}
        {phase === 'success' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            zIndex: 10,
            animation: 'joint-bounce-in 0.25s ease-out',
          }}>
            <div style={{ fontSize: '56px', lineHeight: 1 }}>✅</div>
            <div style={{
              color: '#00C851',
              fontWeight: 900,
              fontSize: '28px',
              fontFamily: 'monospace',
              textShadow: '0 0 20px rgba(0,200,81,0.6)',
            }}>
              +{lastGain.base + lastGain.speed}
            </div>
            {lastGain.speed > 0 && (
              <div style={{
                color: '#FFD700',
                fontSize: '14px',
                background: 'rgba(255,215,0,0.1)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: '8px',
                padding: '2px 10px',
              }}>
                ⚡ Bonus vitesse +{lastGain.speed}
              </div>
            )}
          </div>
        )}

        {/* Step content */}
        {phase === 'active' && (
          <>
            {/* Big emoji */}
            <div style={{ fontSize: '72px', lineHeight: 1, animation: 'joint-float 2s ease-in-out infinite' }}>
              {step.emoji}
            </div>

            {/* Label + description */}
            <div style={{ textAlign: 'center', padding: '0 16px' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '20px', marginBottom: '4px' }}>
                {step.label}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                {step.description}
              </div>
            </div>

            {/* Action indicator */}
            {step.action === 'hold' ? (
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <svg width="120" height="120" style={{ position: 'absolute', inset: 0 }}>
                  <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r={R}
                    fill="none"
                    stroke="#00C851"
                    strokeWidth="8"
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
                  width: 90, height: 90,
                  borderRadius: '50%',
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
                width: 90, height: 90,
                borderRadius: '50%',
                border: '3px solid #00C851',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px',
                animation: 'joint-pulse 1.2s ease-in-out infinite',
              }}>
                👆
              </div>
            ) : (
              /* Directional swipe indicator */
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '32px',
                      color: '#00C851',
                      opacity: 0.3 + i * 0.3,
                      animation: `${ACTION_ANIM[step.action]} 1s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  >
                    {ACTION_ICON[step.action]}
                  </div>
                ))}
              </div>
            )}

            {/* Hint text */}
            <div style={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: '12px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              {ACTION_HINT[step.action]}
            </div>
          </>
        )}
      </div>

      {/* Step mini-map at the bottom */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        gap: '4px',
        justifyContent: 'center',
        paddingBottom: '2px',
      }}>
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            style={{
              width: i === stepIdx ? 20 : 8,
              height: 8,
              borderRadius: '99px',
              background: i < stepIdx
                ? '#00C851'
                : i === stepIdx
                ? '#FFD700'
                : 'rgba(255,255,255,0.12)',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
