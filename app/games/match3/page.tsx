import Link from 'next/link';
import { LEVEL_LABELS } from '@/lib/games/config';
import type { DifficultyLevel } from '@/lib/types';

export default function Match3Page() {
  return (
    <div style={{ padding: '20px 16px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--rasta-gold)', fontSize: '22px', fontWeight: 900, marginBottom: '8px' }}>
        👋 Crush des Vosges
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
        Aligne baffes, sapins et bédots pour scorer ! Atteins l&apos;objectif avant que Shlagonie ne s&apos;énerve 😤
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {([1, 2, 3, 4, 5] as DifficultyLevel[]).map((lvl) => (
          <Link key={lvl} href={`/games/match3/${lvl}`} style={{ textDecoration: 'none' }}>
            <div className="card-vosges" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Niveau {lvl}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{LEVEL_LABELS[lvl]}</div>
              </div>
              <span style={{ fontSize: '24px' }}>▶️</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
