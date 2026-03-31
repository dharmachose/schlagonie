import Link from 'next/link';
import { LEVEL_LABELS } from '@/lib/games/config';
import { LEVEL_CONFIG } from '@/lib/games/slots/logic';
import type { DifficultyLevel } from '@/lib/types';

const LEVEL_EMOJIS: Record<DifficultyLevel, string> = {
  1: '🌱', 2: '🌿', 3: '🌲', 4: '🌳', 5: '🏔️',
};

export default function SlotsPage() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{
        color: 'var(--rasta-gold)',
        fontSize: '24px',
        fontWeight: 900,
        marginBottom: '8px',
        letterSpacing: '-0.5px',
      }}>
        🎰 La Roulette Vosgienne
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
        Arrête les rouleaux au bon moment et accumule assez de pièces pour battre la Roulette Vosgienne !
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {([1, 2, 3, 4, 5] as DifficultyLevel[]).map((lvl) => {
          const cfg = LEVEL_CONFIG[lvl];
          return (
            <Link key={lvl} href={`/games/slots/${lvl}`} className="card-link">
              <div className="card-vosges" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  fontSize: '36px',
                  width: '56px', height: '56px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(34,139,34,0.15)',
                  borderRadius: '14px',
                  border: '1px solid rgba(34,139,34,0.3)',
                  flexShrink: 0,
                }}>
                  {LEVEL_EMOJIS[lvl]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px' }}>
                    Niveau {lvl} — {LEVEL_LABELS[lvl]}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '3px' }}>
                    {cfg.symbolCount} symboles · {cfg.target}🪙 en {cfg.maxSpins} spins
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '20px', flexShrink: 0 }}>›</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
