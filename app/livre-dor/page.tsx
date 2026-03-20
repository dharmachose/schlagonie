import { getAllTributes } from '@/lib/leaderboard';
import { getTributeQuestion } from '@/lib/tribute-questions';
import { GAMES } from '@/lib/games/config';
import type { GameId, DifficultyLevel } from '@/lib/types';

export const dynamic = 'force-dynamic';

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function formatDateShort(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

// ── Rasta palette ─────────────────────────────────────────────────────────
const RED   = '#C0392B';
const YELLOW = '#D4A017';
const GREEN  = '#1E7A2E';
const CREAM  = '#F8F3E8';
const DARK   = '#0E0E0E';

// ── Feuille de cannabis SVG ───────────────────────────────────────────────
function Leaf({ size = 28, color = GREEN, style = {} }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 115" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0, ...style }}>
      {/* Tige */}
      <path d="M47 115 L47 82 Q50 78 53 82 L53 115 Z" />
      {/* Feuille centrale haute */}
      <path d="M50 75 C49 58 43 40 44 24 C45 12 55 12 56 24 C57 40 51 58 50 75 Z" />
      {/* Feuille gauche haute */}
      <path d="M50 75 C42 65 25 62 16 48 C9 36 20 28 30 36 C38 43 45 60 50 75 Z" />
      {/* Feuille droite haute */}
      <path d="M50 75 C58 65 75 62 84 48 C91 36 80 28 70 36 C62 43 55 60 50 75 Z" />
      {/* Feuille gauche basse */}
      <path d="M50 75 C44 70 26 72 14 62 C4 54 10 44 22 50 C32 55 44 68 50 75 Z" />
      {/* Feuille droite basse */}
      <path d="M50 75 C56 70 74 72 86 62 C96 54 90 44 78 50 C68 55 56 68 50 75 Z" />
      {/* Feuille gauche basse-latérale */}
      <path d="M50 75 C46 73 32 78 24 72 C16 66 20 57 28 61 C36 65 46 71 50 75 Z" />
      {/* Feuille droite basse-latérale */}
      <path d="M50 75 C54 73 68 78 76 72 C84 66 80 57 72 61 C64 65 54 71 50 75 Z" />
    </svg>
  );
}

// ── Barre rasta tricolore ─────────────────────────────────────────────────
function RastaBar({ reversed = false, width = '100%', height = 6 }: { reversed?: boolean; width?: string; height?: number }) {
  const colors = reversed ? [GREEN, YELLOW, RED] : [RED, YELLOW, GREEN];
  return (
    <div style={{ display: 'flex', width, height, borderRadius: 99, overflow: 'hidden', margin: '0 auto' }}>
      {colors.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
    </div>
  );
}

// ── Avatar initiale ───────────────────────────────────────────────────────
function Avatar({ letter, color }: { letter: string; color: string }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: `${color}18`, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 900, color,
      flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

// ── Pill de question ──────────────────────────────────────────────────────
function QuestionPill({ level, text, color, count }: { level: number; text: string; color: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px',
      background: `${color}0E`,
      borderRadius: 10,
      borderLeft: `3px solid ${color}`,
      marginBottom: 12,
    }}>
      <span style={{
        background: color, color: '#fff',
        fontSize: 10, fontWeight: 800,
        borderRadius: 6, padding: '2px 7px',
        whiteSpace: 'nowrap', marginTop: 2,
        letterSpacing: '0.5px',
        flexShrink: 0,
      }}>
        NIV.{level}
      </span>
      <span style={{ fontSize: 14, color: '#2a2a2a', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{text}</span>
      <span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap', marginTop: 2, flexShrink: 0 }}>{count} rép.</span>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 18,
  padding: '22px 20px',
  boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
  border: '1px solid rgba(0,0,0,0.06)',
};

export default async function LivreOrPage() {
  const tributes = await getAllTributes();

  if (!tributes) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', background: CREAM, minHeight: '100vh' }}>
        <Leaf size={52} color={GREEN} style={{ marginBottom: 16 }} />
        <h2 style={{ color: DARK }}>Base de données non configurée</h2>
      </div>
    );
  }

  const totalAnswers    = tributes.length;
  const uniquePlayers   = new Set(tributes.map(t => t.playerId)).size;
  const uniqueQuestions = new Set(tributes.map(t => t.questionId)).size;
  const totalQuestions  = 35;
  const coveragePct     = Math.round((uniqueQuestions / totalQuestions) * 100);

  const playerMap = new Map<string, { name: string; count: number; lastSeen: number }>();
  for (const t of tributes) {
    const e = playerMap.get(t.playerId);
    if (e) { e.count++; e.lastSeen = Math.max(e.lastSeen, t.answeredAt); }
    else playerMap.set(t.playerId, { name: t.playerName, count: 1, lastSeen: t.answeredAt });
  }
  const players = [...playerMap.values()].sort((a, b) => b.count - a.count);

  const byQuestion = new Map<string, typeof tributes>();
  for (const t of tributes) {
    const arr = byQuestion.get(t.questionId) ?? [];
    arr.push(t);
    byQuestion.set(t.questionId, arr);
  }

  const statItems = [
    { value: totalAnswers,    sub: 'réponses',          color: RED    },
    { value: uniquePlayers,   sub: 'joueurs',            color: GREEN  },
    { value: `${uniqueQuestions}/${totalQuestions}`, sub: 'questions', color: YELLOW },
    { value: `${coveragePct}%`, sub: 'couverture',      color: RED    },
  ];

  const accentCycle = [RED, YELLOW, GREEN];
  const lvlColors   = [GREEN, YELLOW, RED, GREEN, YELLOW] as const;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: CREAM, minHeight: '100vh', paddingBottom: 80 }}>

      {/* ══════════════ HEADER ══════════════ */}
      <div style={{
        background: `linear-gradient(160deg, #0a0a0a 0%, #161008 40%, #0a160a 100%)`,
        color: '#fff',
        padding: '0 0 36px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top rasta bar */}
        <RastaBar height={7} width="100%" />

        {/* Feuilles de fond */}
        <Leaf size={120} color="rgba(255,255,255,0.03)" style={{ position: 'absolute', top: -10, left: -20, transform: 'rotate(-15deg)', pointerEvents: 'none' }} />
        <Leaf size={90}  color="rgba(255,255,255,0.03)" style={{ position: 'absolute', top: 20, right: -15, transform: 'rotate(20deg)', pointerEvents: 'none' }} />
        <Leaf size={60}  color="rgba(255,255,255,0.025)" style={{ position: 'absolute', bottom: 0, left: '40%', transform: 'rotate(5deg)', pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center', padding: '32px 24px 0' }}>
          {/* Icônes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 18 }}>
            <Leaf size={40} color={GREEN} />
            <div style={{ fontSize: 58, lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>📖</div>
            <Leaf size={40} color={YELLOW} />
          </div>

          {/* Titre */}
          <h1 style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: '-0.5px',
            background: `linear-gradient(135deg, ${RED} 0%, ${YELLOW} 50%, ${GREEN} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Livre d&apos;Or de Léonie
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: '10px 0 4px' }}>
            🎂 18 ans — messages de ses amis
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>
            Mis à jour le {new Date().toLocaleString('fr-FR')}
          </p>

          {/* Bottom rasta bar */}
          <div style={{ marginTop: 28 }}>
            <RastaBar reversed height={5} width="50%" />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>

        {/* ══════════════ STATS ══════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '24px 0 20px' }}>
          {statItems.map(({ value, sub, color }, i) => (
            <div key={i} style={{
              ...card,
              textAlign: 'center',
              borderTop: `4px solid ${color}`,
              padding: '18px 12px 14px',
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px' }}>
                {value}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {totalAnswers === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
            <Leaf size={52} color={GREEN} style={{ marginBottom: 16 }} />
            <h2 style={{ color: '#444', fontWeight: 700, margin: '0 0 8px' }}>Aucune réponse encore</h2>
            <p style={{ color: '#bbb', fontSize: 14, margin: 0 }}>Les messages arriveront au fur et à mesure des parties.</p>
          </div>
        ) : (
          <>

            {/* ══════════════ JOUEURS ══════════════ */}
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Leaf size={20} color={GREEN} />
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: DARK }}>Joueurs participants</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {players.map((p, i) => {
                  const accent = accentCycle[i % 3];
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={p.name + i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px',
                      background: i === 0 ? `${accent}0A` : '#FAFAFA',
                      borderRadius: 12,
                      border: `1px solid ${i === 0 ? `${accent}30` : '#EBEBEB'}`,
                    }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{medals[i] ?? '👤'}</span>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{p.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: accent }}>{p.count} rép.</div>
                      <div style={{ fontSize: 11, color: '#bbb' }}>le {formatDateShort(p.lastSeen)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ══════════════ RÉPONSES PAR JEU ══════════════ */}
            {GAMES.map((game) => {
              const levels: DifficultyLevel[] = [1, 2, 3, 4, 5];
              const hasAnswers = levels.some(lvl => {
                const q = getTributeQuestion(game.id as GameId, lvl);
                return q && byQuestion.has(q.id);
              });
              if (!hasAnswers) return null;

              return (
                <div key={game.id} style={{ ...card, marginBottom: 16 }}>
                  {/* Titre du jeu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 12,
                      background: 'rgba(50,205,50,0.12)',
                      border: '1.5px solid rgba(50,205,50,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, flexShrink: 0,
                    }}>
                      {game.emoji}
                    </div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: DARK }}>{game.title}</h2>
                  </div>

                  {/* Niveaux */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {levels.map((lvl) => {
                      const q = getTributeQuestion(game.id as GameId, lvl);
                      if (!q) return null;
                      const answers = byQuestion.get(q.id) ?? [];
                      if (!answers.length) return null;
                      const qColor = lvlColors[lvl - 1];

                      return (
                        <div key={lvl}>
                          <QuestionPill level={lvl} text={q.text} color={qColor} count={answers.length} />

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {answers.map((a, ai) => {
                              const accent = accentCycle[ai % 3];
                              return (
                                <div key={a.id} style={{
                                  display: 'flex', gap: 12,
                                  padding: '14px 16px',
                                  background: '#FAFAF8',
                                  borderRadius: 12,
                                  border: `1px solid #EBEBEB`,
                                  position: 'relative',
                                }}>
                                  {/* Grand guillemet décoratif */}
                                  <div style={{
                                    position: 'absolute', top: 8, right: 14,
                                    fontSize: 52, lineHeight: 1,
                                    color: `${accent}18`,
                                    fontFamily: 'Georgia, serif',
                                    fontWeight: 900,
                                    pointerEvents: 'none',
                                    userSelect: 'none',
                                  }}>&rdquo;</div>

                                  <Avatar letter={a.playerName[0].toUpperCase()} color={accent} />

                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: '#2a2a2a' }}>{a.playerName}</span>
                                      <span style={{ fontSize: 10, color: '#ccc' }}>·</span>
                                      <span style={{ fontSize: 11, color: '#bbb' }}>{formatDate(a.answeredAt)}</span>
                                    </div>
                                    <div style={{
                                      fontSize: 15, color: '#333',
                                      lineHeight: 1.6,
                                      fontStyle: 'italic',
                                      wordBreak: 'break-word',
                                    }}>
                                      &ldquo;{a.answer}&rdquo;
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ══════════════ QUESTIONS EN ATTENTE ══════════════ */}
            {(() => {
              const unanswered: string[] = [];
              for (const game of GAMES) {
                for (const lvl of [1, 2, 3, 4, 5] as DifficultyLevel[]) {
                  const q = getTributeQuestion(game.id as GameId, lvl);
                  if (q && !byQuestion.has(q.id)) unanswered.push(`${game.emoji} Niv.${lvl} — ${q.text}`);
                }
              }
              if (!unanswered.length) return null;
              return (
                <div style={{ ...card, marginBottom: 16, opacity: 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 14 }}>⏳</span>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#888' }}>
                      Questions en attente ({unanswered.length})
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {unanswered.map((q, i) => (
                      <div key={i} style={{
                        fontSize: 12, color: '#999',
                        padding: '6px 10px',
                        background: '#F5F5F5',
                        borderRadius: 8,
                        lineHeight: 1.4,
                      }}>
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ══════════════ FOOTER ══════════════ */}
        <div style={{ textAlign: 'center', marginTop: 40, paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            <Leaf size={18} color={RED} />
            <Leaf size={24} color={YELLOW} />
            <Leaf size={18} color={GREEN} />
          </div>
          <RastaBar width="120px" height={4} />
          <p style={{ fontSize: 11, color: '#ccc', marginTop: 12 }}>
            Schlagonie · Royaume des Vosges · Dashboard privé
          </p>
        </div>
      </div>
    </div>
  );
}
