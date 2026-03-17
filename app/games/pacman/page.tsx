import Link from 'next/link';
import { LEVEL_LABELS } from '@/lib/games/config';
import type { DifficultyLevel } from '@/lib/types';

export default function PacmanPage() {
  return (
    <div style={{ padding: '20px 16px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--rasta-gold)', fontSize: '22px', fontWeight: 900, marginBottom: '8px' }}>
        🏃 Shlagonie Fuit !
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
        Shlagonie dévale les ruelles d&apos;Aydoilles, fuyant les fantômes vosgiens. Mange tous les points pour gagner !
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {([1, 2, 3, 4, 5] as DifficultyLevel[]).map((lvl) => (
          <Link key={lvl} href={`/games/pacman/${lvl}`} style={{ textDecoration: 'none' }}>
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
