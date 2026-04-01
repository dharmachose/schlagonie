'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { LEVEL_CONFIG, getReelSymbols, calcPayout, SYMBOL_FAMILIES } from './logic';

const AUTO_STOP_MS  = 3000;   // ms avant auto-stop d'un rouleau
const DECEL_STEPS   = 3;      // nombre de ticks de décélération
const AUTO_TICK_MS  = 50;     // résolution du timer auto-stop

type Phase = 'idle' | 'spinning' | 'result';

export default function SlotsGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const cfg     = LEVEL_CONFIG[level];
  const symbols = getReelSymbols(level);
  const N       = symbols.length;
  const animMs  = Math.min(Math.round(cfg.tickMs * 0.8), 100); // durée animation par tick

  // ── État React (UI) ───────────────────────────────────────────────────────
  const [phase,      setPhase]      = useState<Phase>('idle');
  const [reelIdx,    setReelIdx]    = useState<[number, number, number]>([0, 1, 2]);
  const [reelKeys,   setReelKeys]   = useState<[number, number, number]>([0, 0, 0]);
  const [spinning,   setSpinning]   = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [held,       setHeld]       = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [coins,      setCoins]      = useState(0);
  const [spinsLeft,  setSpinsLeft]  = useState(cfg.maxSpins);
  const [lastResult, setLastResult] = useState<{ coins: number; label: string } | null>(null);
  const [autoTimers, setAutoTimers] = useState<[number, number, number]>([AUTO_STOP_MS, AUTO_STOP_MS, AUTO_STOP_MS]);

  // ── Refs (logique, pas de re-render) ──────────────────────────────────────
  const startRef     = useRef(Date.now());
  const reelIdxRef   = useRef<[number, number, number]>([0, 1, 2]);
  const spinningRef  = useRef<[boolean, boolean, boolean]>([false, false, false]);
  const coinsRef     = useRef(0);
  const spinsLeftRef = useRef(cfg.maxSpins);
  const phaseRef     = useRef<Phase>('idle');
  const intervalIds  = useRef<[id | null, id | null, id | null]>([null, null, null]);
  const autoIntervalRef = useRef<id | null>(null);
  // Ref vers stopReel pour pouvoir l'appeler depuis le useEffect auto-stop
  const stopReelRef  = useRef<(i: 0 | 1 | 2) => void>(() => {});

  type id = ReturnType<typeof setInterval>;

  // ── Cleanup global ────────────────────────────────────────────────────────
  useEffect(() => () => {
    intervalIds.current.forEach((id) => id && clearInterval(id));
    if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
  }, []);

  // ── Timer auto-stop : s'active quand phase passe à 'spinning' ─────────────
  useEffect(() => {
    if (phase !== 'spinning') {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
      return;
    }

    const timers: [number, number, number] = [AUTO_STOP_MS, AUTO_STOP_MS, AUTO_STOP_MS];

    autoIntervalRef.current = setInterval(() => {
      for (let i = 0; i < 3; i++) {
        if (spinningRef.current[i as 0 | 1 | 2]) {
          timers[i as 0 | 1 | 2] -= AUTO_TICK_MS;
          if (timers[i as 0 | 1 | 2] <= 0) {
            timers[i as 0 | 1 | 2] = 0;
            stopReelRef.current(i as 0 | 1 | 2);
          }
        }
      }
      setAutoTimers([...timers] as [number, number, number]);
    }, AUTO_TICK_MS);

    return () => {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Avance un rouleau (tick) ──────────────────────────────────────────────
  function advanceReel(i: 0 | 1 | 2) {
    setReelIdx((prev) => {
      const next: [number, number, number] = [...prev] as [number, number, number];
      next[i] = (next[i] + 1) % N;
      reelIdxRef.current = next;
      return next;
    });
    setReelKeys((prev) => {
      const next: [number, number, number] = [...prev] as [number, number, number];
      next[i]++;
      return next;
    });
  }

  // ── Résout le résultat quand tous les rouleaux sont arrêtés ───────────────
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
    phaseRef.current = 'result';
    setPhase('result');

    if (newCoins >= cfg.target) {
      setTimeout(() => onLevelComplete(Date.now() - startRef.current), 700);
    } else if (newSpins <= 0) {
      setTimeout(() => onGameOver(), 1200);
    }
  }

  // ── Arrête un rouleau avec décélération ───────────────────────────────────
  function stopReel(i: 0 | 1 | 2) {
    if (!spinningRef.current[i]) return;

    clearInterval(intervalIds.current[i]!);
    intervalIds.current[i] = null;

    let delay = cfg.tickMs * 1.6;

    function decelTick(stepsLeft: number) {
      advanceReel(i);
      if (stepsLeft <= 1) {
        const ns: [boolean, boolean, boolean] = [...spinningRef.current] as [boolean, boolean, boolean];
        ns[i] = false;
        spinningRef.current = ns;
        setSpinning([...ns] as [boolean, boolean, boolean]);
        if (!ns.some((s) => s)) resolveResult();
      } else {
        delay *= 2.2;
        setTimeout(() => decelTick(stepsLeft - 1), delay);
      }
    }

    setTimeout(() => decelTick(DECEL_STEPS), delay);
  }

  // Mettre à jour la ref à chaque render pour que l'effet auto-stop appelle la version fraîche
  stopReelRef.current = stopReel;

  // ── Démarre un spin ────────────────────────────────────────────────────────
  function startSpin() {
    if (phaseRef.current === 'spinning') return;
    const toSpin: [boolean, boolean, boolean] = [!held[0], !held[1], !held[2]];
    spinningRef.current = [...toSpin] as [boolean, boolean, boolean];
    setHeld([false, false, false]);
    setSpinning(toSpin);
    setLastResult(null);
    setAutoTimers([AUTO_STOP_MS, AUTO_STOP_MS, AUTO_STOP_MS]);
    phaseRef.current = 'spinning';
    setPhase('spinning');

    toSpin.forEach((shouldSpin, i) => {
      if (!shouldSpin) return;
      intervalIds.current[i as 0 | 1 | 2] = setInterval(
        () => advanceReel(i as 0 | 1 | 2),
        cfg.tickMs,
      );
    });

    if (!toSpin.some((s) => s)) {
      spinningRef.current = [false, false, false];
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

  // ── Dérivés ────────────────────────────────────────────────────────────────
  const progress  = Math.min(coins / cfg.target, 1);
  const isJackpot = lastResult?.coins === 30;

  // Liste des combos famille disponibles au niveau courant
  const availableFamilies = Object.entries(SYMBOL_FAMILIES)
    .filter(([, syms]) => syms.every((s) => symbols.includes(s)));

  return (
    <div style={{ padding: '16px 12px', maxWidth: '400px', margin: '0 auto', userSelect: 'none' }}>

      {/* Keyframes injectés (une seule fois dans le DOM) */}
      <style>{`
        @keyframes sym-slide-in {
          from { transform: translateY(-55%); opacity: 0.15; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes sym-ghost-in {
          from { transform: translateY(-70%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 0.3; }
        }
        @keyframes jackpot-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3); }
          50%       { box-shadow: 0 0 45px rgba(255,215,0,0.7); }
        }
      `}</style>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFD700' }}>
          🪙 {coins}
          <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>/{cfg.target}</span>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: spinsLeft <= 3 ? '#DC143C' : 'var(--text-muted)' }}>
          {spinsLeft} spin{spinsLeft !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Barre de progression pièces ────────────────────────────────────── */}
      <div style={{ height: '7px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{
          height: '100%', width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, #228B22, #FFD700)',
          borderRadius: '4px', transition: 'width 0.45s ease',
        }} />
      </div>

      {/* ── Cadre machine ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(0,0,0,0.38)',
        border: `2px solid ${isJackpot ? 'rgba(255,215,0,0.85)' : 'rgba(255,215,0,0.2)'}`,
        borderRadius: '20px',
        padding: '14px 10px 14px',
        marginBottom: '12px',
        animation: isJackpot ? 'jackpot-pulse 0.7s ease 3' : 'none',
        transition: 'border-color 0.3s',
      }}>

        {/* Ligne payline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,215,0,0.15)' }} />
          <span style={{ fontSize: '9px', color: 'rgba(255,215,0,0.45)', fontWeight: 600, letterSpacing: '1px' }}>
            ▶ PAYLINE ◀
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,215,0,0.15)' }} />
        </div>

        {/* ── 3 rouleaux ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {([0, 1, 2] as const).map((i) => {
            const isSpinning = spinning[i];
            const isHeld     = held[i];
            const midIdx     = reelIdx[i];
            const topIdx     = (midIdx - 1 + N) % N;
            const botIdx     = (midIdx + 1) % N;
            const autoRatio  = autoTimers[i] / AUTO_STOP_MS;

            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>

                {/* Zone rouleau cliquable (arrêt uniquement au tap pendant le spin) */}
                <button
                  onClick={() => isSpinning ? stopReel(i) : undefined}
                  style={{
                    width: '100%', padding: 0, background: 'none', border: 'none',
                    cursor: isSpinning ? 'pointer' : 'default',
                    WebkitTapHighlightColor: 'transparent',
                    borderRadius: '12px', overflow: 'hidden',
                  }}
                >
                  {/* Symbole du haut (fantôme) */}
                  <div style={{
                    height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '26px', opacity: 0.3,
                    overflow: 'hidden',
                    filter: isSpinning ? 'blur(4px)' : 'none',
                    transition: 'filter 0.1s',
                  }}>
                    <span
                      key={`t${i}-${reelKeys[i]}`}
                      style={{ display: 'inline-block', animation: isSpinning ? `sym-ghost-in ${animMs}ms ease-out` : 'none' }}
                    >
                      {symbols[topIdx]}
                    </span>
                  </div>

                  {/* Symbole central (payline) */}
                  <div style={{
                    height: '80px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '3px',
                    background: isHeld
                      ? 'rgba(255,215,0,0.13)'
                      : isSpinning ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
                    border: `2px solid ${
                      isHeld ? 'rgba(255,215,0,0.55)'
                      : isSpinning ? 'rgba(255,80,80,0.35)'
                      : 'rgba(255,255,255,0.09)'
                    }`,
                    borderRadius: '12px',
                    fontSize: '42px', lineHeight: 1,
                    overflow: 'hidden',
                    filter: isSpinning ? 'blur(1.5px)' : 'none',
                    transition: 'filter 0.12s, border-color 0.15s, background 0.15s',
                  }}>
                    <span
                      key={`m${i}-${reelKeys[i]}`}
                      style={{ display: 'inline-block', animation: isSpinning ? `sym-slide-in ${animMs}ms ease-out` : 'none' }}
                    >
                      {symbols[midIdx]}
                    </span>
                    {isSpinning && (
                      <div style={{ fontSize: '10px', color: 'rgba(255,80,80,0.9)', fontWeight: 800, lineHeight: 1 }}>
                        STOP
                      </div>
                    )}
                    {isHeld && (
                      <div style={{ fontSize: '9px', color: '#FFD700', fontWeight: 700, letterSpacing: '0.5px', lineHeight: 1 }}>
                        HOLD
                      </div>
                    )}
                  </div>

                  {/* Symbole du bas (fantôme) */}
                  <div style={{
                    height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '26px', opacity: 0.3,
                    overflow: 'hidden',
                    filter: isSpinning ? 'blur(4px)' : 'none',
                    transition: 'filter 0.1s',
                  }}>
                    <span
                      key={`b${i}-${reelKeys[i]}`}
                      style={{ display: 'inline-block', animation: isSpinning ? `sym-ghost-in ${animMs}ms ease-out` : 'none' }}
                    >
                      {symbols[botIdx]}
                    </span>
                  </div>
                </button>

                {/* Barre de compte à rebours auto-stop */}
                <div style={{
                  width: '100%', height: '3px',
                  background: isSpinning ? 'var(--border-color)' : 'transparent',
                  borderRadius: '2px', overflow: 'hidden',
                  transition: 'background 0.2s',
                }}>
                  {isSpinning && (
                    <div style={{
                      height: '100%',
                      width: `${autoRatio * 100}%`,
                      background: autoRatio > 0.55 ? '#32CD32' : autoRatio > 0.25 ? '#FFD700' : '#DC143C',
                      borderRadius: '2px',
                      transition: `width ${AUTO_TICK_MS}ms linear, background 0.3s`,
                    }} />
                  )}
                </div>

                {/* Bouton HOLD (séparé, visible uniquement en phase result) */}
                {phase === 'result' && (
                  <button
                    onClick={() => toggleHold(i)}
                    style={{
                      width: '100%', padding: '6px 0',
                      background: isHeld ? 'rgba(255,215,0,0.13)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isHeld ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      color: isHeld ? '#FFD700' : 'var(--text-muted)',
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isHeld ? '🔒 HOLD' : 'HOLD'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Message résultat ───────────────────────────────────────────────── */}
      <div style={{ minHeight: '30px', textAlign: 'center', marginBottom: '10px' }}>
        {lastResult && lastResult.coins > 0 && (
          <div style={{
            fontSize: '18px', fontWeight: 800,
            color: lastResult.coins >= 30 ? '#FFD700' : lastResult.coins >= 20 ? '#32CD32' : '#C0C0C0',
          }}>
            {lastResult.label} +{lastResult.coins} 🪙
          </div>
        )}
        {lastResult?.coins === 0 && phase === 'result' && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pas de gain cette fois…</div>
        )}
      </div>

      {/* ── Bouton spin ────────────────────────────────────────────────────── */}
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
          🎰 TIRER LE BRAS
        </button>
      )}

      {/* ── Table des gains ────────────────────────────────────────────────── */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={chipStyle('#FFD700')}>🌲🌲🌲 → +30🪙</div>
        {availableFamilies.map(([key, syms]) => (
          <div key={key} style={chipStyle('#32CD32')}>
            {syms.join('')} → +20🪙
          </div>
        ))}
        <div style={chipStyle('#C0C0C0')}>XX? → +8🪙</div>
      </div>
    </div>
  );
}

function chipStyle(color: string): React.CSSProperties {
  return {
    fontSize: '11px', color, fontWeight: 600,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', padding: '4px 8px',
  };
}
