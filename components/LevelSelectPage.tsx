import Link from 'next/link';
import { LEVEL_LABELS } from '@/lib/games/config';
import type { DifficultyLevel } from '@/lib/types';

interface LevelSelectPageProps {
  gameId: string;
  title: string;
  description: string;
  color: string;
  levelEmojis: Record<DifficultyLevel, string>;
  levelDetails: Record<DifficultyLevel, string>;
}

export default function LevelSelectPage({
  gameId,
  title,
  description,
  color,
  levelEmojis,
  levelDetails,
}: LevelSelectPageProps) {
  return (
    <div style={{ padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{
        color: 'var(--rasta-gold)',
        fontSize: '24px',
        fontWeight: 900,
        marginBottom: '8px',
        letterSpacing: '-0.5px',
      }}>
        {title}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
        {description}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {([1, 2, 3, 4, 5] as DifficultyLevel[]).map((lvl) => (
          <Link key={lvl} href={`/games/${gameId}/${lvl}`} className="card-link">
            <div className="card-vosges" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              borderColor: `${color}50`,
            }}>
              <div style={{
                fontSize: '36px',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${color}18`,
                borderRadius: '14px',
                border: `1px solid ${color}40`,
                flexShrink: 0,
              }}>
                {levelEmojis[lvl]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px' }}>
                  Niveau {lvl} — {LEVEL_LABELS[lvl]}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '3px' }}>
                  {levelDetails[lvl]}
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '20px', flexShrink: 0 }}>›</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
