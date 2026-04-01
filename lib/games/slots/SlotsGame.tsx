'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { LEVEL_CONFIG, getReelSymbols, calcPayout, calcNearMiss, SYMBOL_FAMILIES } from './logic';

const AUTO_STOP_MS = 3000;
const AUTO_TICK_MS = 50; // résolution de la barre visuelle uniquement

type Phase = 'idle' | 'spinning' | 'result';
type id    = ReturnType<typeof setInterval>;

function haptic(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* noop */ }
}

export default function SlotsGame({ level, onLevelComplete, onGameOver }: GameProps) {
  const cfg     = LEVEL_CONFIG[level];
  const symbols = getReelSymbols(level);
  const N       = symbols.length;
  const animMs  = Math.min(Math.round(cfg.tickMs * 0.8), 100);

  // ── État React ────────────────────────────────────────────────────────────
  const [phase,      setPhase]      = useState<Phase>('idle');
  const [reelIdx,    setReelIdx]    = useState<[number, number, number]>([0, 1, 2]);
  const [reelKeys,   setReelKeys]   = useState<[number, number, number]>([0, 0, 0]);
  const [spinning,   setSpinning]   = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [held,       setHeld]       = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [coins,      setCoins]      = useState(0);
  const [spinsLeft,  setSpinsLeft]  = useState(cfg.maxSpins);
  const [lastResult, setLastResult] = useState<{ coins: number; label: string } | null>(null);
  const [autoTimers, setAutoTimers] = useState<[number, number, number]>([AUTO_STOP_MS, AUTO_STOP_MS, AUTO_STOP_MS]);
  const [streak,     setStreak]     = useState(0);
  const [nearMiss,   setNearMiss]   = useState<{ symbol: string; label: string } | null>(null);

  // ── Refs logique ──────────────────────────────────────────────────────────
  const startRef      = useRef(Date.now());
  const reelIdxRef    = useRef<[number, number, number]>([0, 1, 2]);
  const spinningRef   = useRef<[boolean, boolean, boolean]>([false, false, false]);
  const coinsRef      = useRef(0);
  const spinsLeftRef  = useRef(cfg.maxSpins);
  const streakRef     = useRef(0);
  const phaseRef      = useRef<Phase>('idle');

  // Intervalles de tick par rouleau (avance les symboles)
  const tickIds       = useRef<[id | null, id | null, id | null]>([null, null, null]);
  // Timeouts auto-stop (UN SEUL PAR ROULEAU — tire une seule fois)
  const autoStopIds   = useRef<[id | null, id | null, id | null]>([null, null, null]);
  // Intervalle purement visuel pour la barre de compte à rebours
  const visualTimerId = useRef<id | null>(null);

  // ── Cleanup total ─────────────────────────────────────────────────────────
  useEffect(() => () => {
    tickIds.current.forEach((id)     => id && clearInterval(id));
    autoStopIds.current.forEach((id) => id && clearTimeout(id));
    if (visualTimerId.current) clearInterval(visualTimerId.current);
  }, []);

  // ── Avance un rouleau ─────────────────────────────────────────────────────
  function advanceReel(i: 0 | 1 | 2) {
    setReelIdx((prev) => {
      const next = [...prev] as [number, number, number];
      next[i] = (next[i] + 1) % N;
      reelIdxRef.current = next;
      return next;
    });
    setReelKeys((prev) => {
      const next = [...prev] as [number, number, number];
      next[i]++;
      return next;
    });
  }

  // ── Résolution (une seule fois par spin, gardée par phaseRef) ─────────────
  function resolveResult() {
    if (phaseRef.current !== 'spinning') return;
    phaseRef.current = 'result'; // verrouillage immédiat

    const line = reelIdxRef.current.map((i) => symbols[i]) as [string, string, string];
    const result = calcPayout(line);

    const mult           = streakRef.current >= 3 ? 2 : streakRef.current >= 2 ? 1.5 : 1;
    const effectiveCoins = result.coins > 0 ? Math.round(result.coins * mult) : 0;
    const label          = mult > 1 && result.coins > 0 ? `${result.label} ×${mult}` : result.label;

    const newStreak = effectiveCoins > 0 ? streakRef.current + 1 : 0;
    streakRef.current = newStreak;
    setStreak(newStreak);

    const miss = effectiveCoins === 0 ? calcNearMiss(line) : null;
    setNearMiss(miss);

    if      (effectiveCoins >= 30) haptic([100, 50, 100, 50, 200]);
    else if (effectiveCoins >= 20) haptic([80, 40, 80]);
    else if (effectiveCoins >= 8)  haptic(80);
    else if (miss)                 haptic([20, 30, 20]);
    else                           haptic(15);

    const newCoins = coinsRef.current + effectiveCoins;
    const newSpins = spinsLeftRef.current - 1;
    coinsRef.current      = newCoins;
    spinsLeftRef.current  = newSpins;
    setCoins(newCoins);
    setSpinsLeft(newSpins);
    setLastResult({ coins: effectiveCoins, label });
    setPhase('result');

    if (newCoins >= cfg.target)  setTimeout(() => onLevelComplete(Date.now() - startRef.current), 700);
    else if (newSpins <= 0)      setTimeout(() => onGameOver(), 1200);
  }

  // ── Arrêt d'un rouleau ────────────────────────────────────────────────────
  function stopReel(i: 0 | 1 | 2) {
    if (!spinningRef.current[i]) return;

    // Annuler le timeout auto-stop pour ce rouleau (s'il n'a pas déjà tiré)
    if (autoStopIds.current[i]) { clearTimeout(autoStopIds.current[i]!); autoStopIds.current[i] = null; }
    // Arrêter le ticker
    if (tickIds.current[i])     { clearInterval(tickIds.current[i]!);    tickIds.current[i]     = null; }

    haptic(30);
    spinningRef.current[i] = false;

    const ns: [boolean, boolean, boolean] = [...spinningRef.current] as [boolean, boolean, boolean];
    setSpinning(ns);

    // Si tous arrêtés → résoudre
    if (!ns.some((s) => s)) {
      // Arrêter aussi la barre visuelle
      if (visualTimerId.current) { clearInterval(visualTimerId.current); visualTimerId.current = null; }
      resolveResult();
    }
  }

  // ── Lancer un spin ────────────────────────────────────────────────────────
  function startSpin() {
    if (phaseRef.current === 'spinning') return;

    const isLast         = spinsLeftRef.current === 1 && coinsRef.current < cfg.target;
    const effectiveTick  = isLast ? Math.max(cfg.tickMs, 120) : cfg.tickMs;
    const toSpin: [boolean, boolean, boolean] = [!held[0], !held[1], !held[2]];

    // Reset complet
    spinningRef.current = [...toSpin] as [boolean, boolean, boolean];
    phaseRef.current    = 'spinning';

    setHeld([false, false, false]);
    setSpinning(toSpin);
    setLastResult(null);
    setNearMiss(null);
    setAutoTimers([AUTO_STOP_MS, AUTO_STOP_MS, AUTO_STOP_MS]);
    setPhase('spinning');

    if (!toSpin.some((s) => s)) {
      // Tous les rouleaux étaient en hold → résolution immédiate
      spinningRef.current = [false, false, false];
      resolveResult();
      return;
    }

    // Démarrer les tickers et les timeouts auto-stop pour chaque rouleau actif
    toSpin.forEach((shouldSpin, i) => {
      if (!shouldSpin) return;
      const ri = i as 0 | 1 | 2;

      tickIds.current[ri]     = setInterval(() => advanceReel(ri), effectiveTick);
      // setTimeout UNE SEULE FOIS → aucun risque de ré-exécution
      autoStopIds.current[ri] = setTimeout(() => stopReel(ri), AUTO_STOP_MS) as unknown as id;
    });

    // Barre visuelle : un seul intervalle qui décrémente et affiche
    const elapsed = [0, 0, 0];
    visualTimerId.current = setInterval(() => {
      const next: [number, number, number] = [
        toSpin[0] ? Math.max(0, AUTO_STOP_MS - (elapsed[0] += AUTO_TICK_MS)) : 0,
        toSpin[1] ? Math.max(0, AUTO_STOP_MS - (elapsed[1] += AUTO_TICK_MS)) : 0,
        toSpin[2] ? Math.max(0, AUTO_STOP_MS - (elapsed[2] += AUTO_TICK_MS)) : 0,
      ];
      // Geler les barres des rouleaux déjà arrêtés
      if (!spinningRef.current[0]) next[0] = autoTimers[0];
      if (!spinningRef.current[1]) next[1] = autoTimers[1];
      if (!spinningRef.current[2]) next[2] = autoTimers[2];
      setAutoTimers(next);
    }, AUTO_TICK_MS) as unknown as id;
  }

  function toggleHold(i: 0 | 1 | 2) {
    if (phase !== 'result') return;
    setHeld((prev) => { const next = [...prev] as [boolean, boolean, boolean]; next[i] = !next[i]; return next; });
  }

  // ── Dérivés UI ────────────────────────────────────────────────────────────
  const isLastSpin        = spinsLeft === 1 && coins < cfg.target;
  const progress          = Math.min(coins / cfg.target, 1);
  const isJackpot         = (lastResult?.coins ?? 0) >= 30;
  const availableFamilies = Object.entries(SYMBOL_FAMILIES)
    .filter(([, syms]) => syms.every((s) => symbols.includes(s)));

  return (
    <div style={{ padding: '16px 12px', maxWidth: '400px', margin: '0 auto', userSelect: 'none' }}>

      <style>{`
        @keyframes sym-slide-in  { from { transform: translateY(-55%); opacity: 0.15; } to { transform: translateY(0); opacity: 1; } }
        @keyframes sym-ghost-in  { from { transform: translateY(-70%); opacity: 0; }   to { transform: translateY(0); opacity: 0.3; } }
        @keyframes jackpot-pulse { 0%,100% { box-shadow: 0 0 20px rgba(255,215,0,.3); } 50% { box-shadow: 0 0 55px rgba(255,215,0,.8); } }
        @keyframes last-pulse    { 0%,100% { box-shadow: 0 0 18px rgba(220,20,60,.25); } 50% { box-shadow: 0 0 40px rgba(220,20,60,.6); } }
        @keyframes near-miss-in  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes streak-pop    { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
      `}</style>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFD700' }}>
            🪙 {coins}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>/{cfg.target}</span>
          </div>
          {streak >= 2 && (
            <div style={{
              fontSize: '12px', fontWeight: 800,
              color: streak >= 3 ? '#FF6B35' : '#FFD700',
              background: streak >= 3 ? 'rgba(255,107,53,.15)' : 'rgba(255,215,0,.12)',
              border: `1px solid ${streak >= 3 ? 'rgba(255,107,53,.4)' : 'rgba(255,215,0,.35)'}`,
              borderRadius: '6px', padding: '1px 6px',
              animation: 'streak-pop 0.4s ease',
            }}>×{streak >= 3 ? '2' : '1.5'}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {streak >= 2 && (
            <div style={{ fontSize: '12px', color: streak >= 3 ? '#FF6B35' : '#FFD700', fontWeight: 700 }}>
              🔥 ×{streak}
            </div>
          )}
          <div style={{ fontSize: '14px', fontWeight: 700, color: spinsLeft <= 3 ? '#DC143C' : 'var(--text-muted)' }}>
            {spinsLeft} spin{spinsLeft !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── Barre progression pièces ───────────────────────────────────────── */}
      <div style={{ height: '7px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: 'linear-gradient(90deg, #228B22, #FFD700)', borderRadius: '4px', transition: 'width 0.45s ease' }} />
      </div>

      {/* ── Cadre machine ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(0,0,0,0.38)',
        border: `2px solid ${isJackpot ? 'rgba(255,215,0,.85)' : isLastSpin ? 'rgba(220,20,60,.7)' : 'rgba(255,215,0,.2)'}`,
        borderRadius: '20px', padding: '14px 10px', marginBottom: '12px',
        animation: isJackpot ? 'jackpot-pulse .7s ease 3' : (isLastSpin && phase !== 'spinning') ? 'last-pulse 1s ease infinite' : 'none',
        transition: 'border-color 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,215,0,.15)' }} />
          <span style={{ fontSize: '9px', color: isLastSpin ? 'rgba(220,20,60,.7)' : 'rgba(255,215,0,.45)', fontWeight: 600, letterSpacing: '1px', transition: 'color .3s' }}>
            {isLastSpin ? '⚠ DERNIER BRAS ⚠' : '▶ PAYLINE ◀'}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,215,0,.15)' }} />
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
                <button
                  onClick={() => isSpinning ? stopReel(i) : undefined}
                  style={{ width: '100%', padding: 0, background: 'none', border: 'none', cursor: isSpinning ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent', borderRadius: '12px', overflow: 'hidden' }}
                >
                  {/* Haut */}
                  <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', opacity: .3, overflow: 'hidden', filter: isSpinning ? 'blur(4px)' : 'none', transition: 'filter .1s' }}>
                    <span key={`t${i}-${reelKeys[i]}`} style={{ display: 'inline-block', animation: isSpinning ? `sym-ghost-in ${animMs}ms ease-out` : 'none' }}>
                      {symbols[topIdx]}
                    </span>
                  </div>

                  {/* Centre / payline */}
                  <div style={{
                    height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                    background: isHeld ? 'rgba(255,215,0,.13)' : isSpinning ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.07)',
                    border: `2px solid ${isHeld ? 'rgba(255,215,0,.55)' : isSpinning ? 'rgba(255,80,80,.35)' : 'rgba(255,255,255,.09)'}`,
                    borderRadius: '12px', fontSize: '42px', lineHeight: 1, overflow: 'hidden',
                    filter: isSpinning ? 'blur(1.5px)' : 'none',
                    transition: 'filter .12s, border-color .15s, background .15s',
                  }}>
                    <span key={`m${i}-${reelKeys[i]}`} style={{ display: 'inline-block', animation: isSpinning ? `sym-slide-in ${animMs}ms ease-out` : 'none' }}>
                      {symbols[midIdx]}
                    </span>
                    {isSpinning && <div style={{ fontSize: '10px', color: 'rgba(255,80,80,.9)', fontWeight: 800, lineHeight: 1 }}>STOP</div>}
                    {isHeld     && <div style={{ fontSize: '9px', color: '#FFD700', fontWeight: 700, letterSpacing: '.5px', lineHeight: 1 }}>HOLD</div>}
                  </div>

                  {/* Bas */}
                  <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', opacity: .3, overflow: 'hidden', filter: isSpinning ? 'blur(4px)' : 'none', transition: 'filter .1s' }}>
                    <span key={`b${i}-${reelKeys[i]}`} style={{ display: 'inline-block', animation: isSpinning ? `sym-ghost-in ${animMs}ms ease-out` : 'none' }}>
                      {symbols[botIdx]}
                    </span>
                  </div>
                </button>

                {/* Barre auto-stop (visuelle seulement) */}
                <div style={{ width: '100%', height: '3px', background: isSpinning ? 'var(--border-color)' : 'transparent', borderRadius: '2px', overflow: 'hidden', transition: 'background .2s' }}>
                  {isSpinning && (
                    <div style={{ height: '100%', width: `${autoRatio * 100}%`, background: autoRatio > .55 ? '#32CD32' : autoRatio > .25 ? '#FFD700' : '#DC143C', borderRadius: '2px', transition: `width ${AUTO_TICK_MS}ms linear, background .3s` }} />
                  )}
                </div>

                {/* Bouton HOLD */}
                {phase === 'result' && (
                  <button
                    onClick={() => toggleHold(i)}
                    style={{
                      width: '100%', padding: '6px 0',
                      background: isHeld ? 'rgba(255,215,0,.13)' : 'rgba(255,255,255,.04)',
                      border: `1px solid ${isHeld ? 'rgba(255,215,0,.5)' : 'rgba(255,255,255,.1)'}`,
                      borderRadius: '8px', color: isHeld ? '#FFD700' : 'var(--text-muted)',
                      fontSize: '10px', fontWeight: 700, letterSpacing: '.5px',
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent', transition: 'all .15s',
                    }}
                  >{isHeld ? '🔒 HOLD' : 'HOLD'}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Messages résultat / near-miss ──────────────────────────────────── */}
      <div style={{ minHeight: '44px', textAlign: 'center', marginBottom: '10px' }}>
        {lastResult && lastResult.coins > 0 && (
          <div style={{ fontSize: '18px', fontWeight: 800, color: lastResult.coins >= 30 ? '#FFD700' : lastResult.coins >= 20 ? '#32CD32' : '#C0C0C0' }}>
            {lastResult.label} +{lastResult.coins} 🪙
          </div>
        )}
        {lastResult?.coins === 0 && phase === 'result' && !nearMiss && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pas de gain cette fois…</div>
        )}
        {nearMiss && phase === 'result' && (
          <div style={{ animation: 'near-miss-in .3s ease' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFD700' }}>{nearMiss.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Arrête le bon rouleau au bon moment !</div>
          </div>
        )}
      </div>

      {/* ── Bouton TIRER LE BRAS / DERNIER BRAS ──────────────────────────────  */}
      {(phase === 'idle' || phase === 'result') && spinsLeft > 0 && coins < cfg.target && (
        <button
          onClick={startSpin}
          style={{
            width: '100%', padding: '16px',
            background: isLastSpin ? 'linear-gradient(135deg, #8B0000, #DC143C)' : 'linear-gradient(135deg, #1a5c1a, #228B22)',
            border: `1px solid ${isLastSpin ? 'rgba(220,20,60,.6)' : 'rgba(50,205,50,.4)'}`,
            borderRadius: '14px', color: 'white', fontSize: '18px', fontWeight: 900,
            cursor: 'pointer', letterSpacing: '.5px',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: isLastSpin ? '0 4px 20px rgba(220,20,60,.4)' : '0 4px 15px rgba(34,139,34,.3)',
            transition: 'all .3s',
          }}
        >{isLastSpin ? '🎰 DERNIER BRAS !' : '🎰 TIRER LE BRAS'}</button>
      )}

      {/* ── Table des gains ────────────────────────────────────────────────── */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={chip('#FFD700')}>🌲🌲🌲 → +30🪙</div>
        {availableFamilies.map(([key, syms]) => (
          <div key={key} style={chip('#32CD32')}>{syms.join('')} → +20🪙</div>
        ))}
        <div style={chip('#C0C0C0')}>XX? → +8🪙</div>
        {streak >= 2 && <div style={chip('#FF6B35')}>🔥 Série → ×{streak >= 3 ? '2' : '1.5'}</div>}
      </div>
    </div>
  );
}

function chip(color: string): React.CSSProperties {
  return { fontSize: '11px', color, fontWeight: 600, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '8px', padding: '4px 8px' };
}
