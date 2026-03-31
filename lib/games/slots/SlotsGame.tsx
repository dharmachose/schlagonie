'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { LEVEL_CONFIG, getReelSymbols, calcPayout } from './logic';

type Phase = 'idle' | 'spinning' | 'result';

export default function SlotsGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const cfg = LEVEL_CONFIG[level];
  const symbols = getReelSymbols(level);
  const n = symbols.length;

  const [phase, setPhase] = useState<Phase>('idle');
  const [reelIdx, setReelIdx] = useState<[number, number, number]>([0, 1, 2]);
  const [spinning, setSpinning] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [held, setHeld] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [coins, setCoins] = useState(0);
  const [spinsLeft, setSpinsLeft] = useState(cfg.maxSpins);
  const [lastResult, setLastResult] = useState<{ coins: number; label: string } | null>(null);

  const startRef = useRef(Date.now());
  const reelIdxRef = useRef<[number, number, number]>([0, 1, 2]);
  const spinningRef = useRef<[boolean, boolean, boolean]>([false, false, false]);
  const coinsRef = useRef(0);
  const spinsLeftRef = useRef(cfg.maxSpins);
  const intervalsRef = useRef<[ReturnType<typeof setInterval> | null, ReturnType<typeof setInterval> | null, ReturnType<typeof setInterval> | null]>([null, null, null]);

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((id) => id && clearInterval(id));
    };
  }, []);

  function resolveResult() {
    const line = reelIdxRef.current.map((i) => symbols[i]) as [string, string, string];
    const result = calcPayout(line);
    const newCoins = coinsRef.current + result.coins;
    const newSpins = spinsLeftRef.current - 1;
    coinsRef.current = newCoins;
    spinsLeftRef.current = newSpins;
    setCoins(newCoins);
    setSpinsLeft(newSpins);
    setLastResult(result);
    setPhase('result');

    if (newCoins >= cfg.target) {
      setTimeout(() => onLevelComplete(Date.now() - startRef.current), 600);
    } else if (newSpins <= 0) {
      setTimeout(() => onGameOver(), 1000);
    }
  }

  function startSpin() {
    if (phase !== 'idle' && phase !== 'result') return;
    const toSpin: [boolean, boolean, boolean] = [!held[0], !held[1], !held[2]];
    spinningRef.current = [...toSpin] as [boolean, boolean, boolean];
    setHeld([false, false, false]);
    setSpinning(toSpin);
    setLastResult(null);
    setPhase('spinning');

    if (!toSpin.some((s) => s)) {
      spinningRef.current = [false, false, false];
      resolveResult();
      return;
    }

    toSpin.forEach((shouldSpin, i) => {
      if (!shouldSpin) return;
      intervalsRef.current[i] = setInterval(() => {
        setReelIdx((prev) => {
          const next: [number, number, number] = [...prev] as [number, number, number];
          next[i] = (next[i] + 1) % n;
          reelIdxRef.current = next;
          return next;
        });
      }, cfg.tickMs);
    });
  }

  function stopReel(i: 0 | 1 | 2) {
    if (!spinningRef.current[i]) return;
    clearInterval(intervalsRef.current[i]!);
    intervalsRef.current[i] = null;
    const newSpinning: [boolean, boolean, boolean] = [...spinningRef.current] as [boolean, boolean, boolean];
    newSpinning[i] = false;
    spinningRef.current = newSpinning;
    setSpinning(newSpinning);
    if (!newSpinning.some((s) => s)) {
      resolveResult();
    }
  }

  function toggleHold(i: 0 | 1 | 2) {
    if (phase !== 'result') return;
    setHeld((prev) => {
      const next: [boolean, boolean, boolean] = [...prev] as [boolean, boolean, boolean];
      next[i] = !next[i];
      return next;
    });
  }

  const progress = Math.min(coins / cfg.target, 1);
  const isJackpot = lastResult && lastResult.coins === 30;

  return (
    <div style={{ padding: '16px 12px', maxWidth: '400px', margin: '0 auto', userSelect: 'none' }}>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFD700' }}>
          🪙 {coins}
          <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>/{cfg.target}</span>
        </div>
        <div style={{
          fontSize: '14px', fontWeight: 700,
          color: spinsLeft <= 3 ? '#DC143C' : 'var(--text-muted)',
        }}>
          {spinsLeft} spin{spinsLeft !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, #228B22, #FFD700)',
          borderRadius: '3px',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Machine frame */}
      <div style={{
        background: 'rgba(0,0,0,0.35)',
        border: `2px solid ${isJackpot ? 'rgba(255,215,0,0.8)' : 'rgba(255,215,0,0.2)'}`,
        borderRadius: '20px',
        padding: '16px 10px 20px',
        marginBottom: '14px',
        boxShadow: isJackpot ? '0 0 30px rgba(255,215,0,0.3)' : 'inset 0 2px 20px rgba(0,0,0,0.3)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>
        {/* Payline label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,215,0,0.15)' }} />
          <div style={{ fontSize: '9px', color: 'rgba(255,215,0,0.4)', fontWeight: 600, letterSpacing: '1px' }}>▶ PAYLINE ◀</div>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,215,0,0.15)' }} />
        </div>

        {/* 3 reels */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {([0, 1, 2] as const).map((i) => {
            const isSpinning = spinning[i];
            const isHeld = held[i];
            const mid = reelIdx[i];
            const top = (mid - 1 + n) % n;
            const bot = (mid + 1) % n;

            return (
              <button
                key={i}
                onClick={() => isSpinning ? stopReel(i) : toggleHold(i)}
                style={{
                  flex: 1, padding: 0,
                  background: 'none', border: 'none',
                  cursor: isSpinning || phase === 'result' ? 'pointer' : 'default',
                  WebkitTapHighlightColor: 'transparent',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                {/* Top symbol (dimmed) */}
                <div style={{
                  height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', opacity: 0.3,
                  filter: isSpinning ? 'blur(4px)' : 'none',
                  transition: isSpinning ? 'none' : 'filter 0.1s',
                }}>{symbols[top]}</div>

                {/* Middle symbol (payline) */}
                <div style={{
                  height: '80px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '2px',
                  background: isHeld
                    ? 'rgba(255,215,0,0.15)'
                    : isSpinning
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(255,255,255,0.07)',
                  border: `2px solid ${isHeld ? 'rgba(255,215,0,0.55)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '12px',
                  fontSize: '44px', lineHeight: 1,
                  filter: isSpinning ? 'blur(2px)' : 'none',
                  transform: isSpinning ? 'scale(1.06)' : 'scale(1)',
                  transition: isSpinning ? 'none' : 'all 0.15s ease',
                  position: 'relative',
                }}>
                  {symbols[mid]}
                  {isHeld && (
                    <div style={{ fontSize: '9px', color: '#FFD700', fontWeight: 700, letterSpacing: '0.5px' }}>
                      HOLD
                    </div>
                  )}
                  {isSpinning && (
                    <div style={{ fontSize: '10px', color: 'rgba(255,80,80,0.9)', fontWeight: 800 }}>
                      STOP
                    </div>
                  )}
                </div>

                {/* Bottom symbol (dimmed) */}
                <div style={{
                  height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', opacity: 0.3,
                  filter: isSpinning ? 'blur(4px)' : 'none',
                  transition: isSpinning ? 'none' : 'filter 0.1s',
                }}>{symbols[bot]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result message */}
      <div style={{ minHeight: '30px', textAlign: 'center', marginBottom: '12px' }}>
        {lastResult && lastResult.coins > 0 && (
          <div style={{
            fontSize: '18px', fontWeight: 800,
            color: lastResult.coins >= 30 ? '#FFD700' : lastResult.coins >= 20 ? '#32CD32' : '#C0C0C0',
          }}>
            {lastResult.label} +{lastResult.coins} 🪙
          </div>
        )}
        {lastResult && lastResult.coins === 0 && phase === 'result' && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pas de gain cette fois…</div>
        )}
        {phase === 'result' && lastResult && lastResult.coins > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Tape un rouleau pour le garder (HOLD)
          </div>
        )}
      </div>

      {/* Spin button */}
      {(phase === 'idle' || phase === 'result') && spinsLeft > 0 && coins < cfg.target && (
        <button
          onClick={startSpin}
          style={{
            width: '100%', padding: '16px',
            background: 'linear-gradient(135deg, #1a5c1a, #228B22)',
            border: '1px solid rgba(50,205,50,0.4)',
            borderRadius: '14px',
            color: 'white', fontSize: '18px', fontWeight: 900,
            cursor: 'pointer', letterSpacing: '0.5px',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 15px rgba(34,139,34,0.3)',
          }}
        >
          🃏 TIRER LE BRAS
        </button>
      )}

      {/* Payout table */}
      <div style={{ marginTop: '14px', display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { example: '🌲🌲🌲', desc: '3 identiques', coins: 30, color: '#FFD700' },
          { example: '🌲⛰️🦌', desc: 'Combo Vosges', coins: 20, color: '#32CD32' },
          { example: '🥾🥾?', desc: 'Paire', coins: 8, color: '#C0C0C0' },
        ].map((p) => (
          <div key={p.desc} style={{
            fontSize: '11px', color: p.color, fontWeight: 600,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', padding: '4px 8px',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <span>{p.example}</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>→</span>
            <span>+{p.coins}🪙</span>
          </div>
        ))}
      </div>
    </div>
  );
}
