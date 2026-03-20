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
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit',
  });
}

// Feuille de cannabis SVG inline
function CannabisLeaf({ size = 32, color = '#2D7A22', style = {} }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 110"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      {/* Tige */}
      <line x1="50" y1="108" x2="50" y2="62" stroke={color} strokeWidth="5" strokeLinecap="round" />
      {/* Doigt central haut */}
      <path d="M50 10 C46 4 38 2 34 8 C30 14 36 22 42 26 C38 24 32 28 33 34 C34 40 42 38 46 36 L50 62 L54 36 C58 38 66 40 67 34 C68 28 62 24 58 26 C64 22 70 14 66 8 C62 2 54 4 50 10 Z" fill={color} />
      {/* Doigt gauche haut */}
      <path d="M22 25 C14 22 8 26 8 32 C8 38 16 40 22 38 C16 42 12 50 16 55 C20 60 28 56 30 50 C30 58 34 64 40 64 C44 64 46 60 46 56 L50 62 L38 42 C34 38 28 32 22 25 Z" fill={color} />
      {/* Doigt droit haut */}
      <path d="M78 25 C86 22 92 26 92 32 C92 38 84 40 78 38 C84 42 88 50 84 55 C80 60 72 56 70 50 C70 58 66 64 60 64 C56 64 54 60 54 56 L50 62 L62 42 C66 38 72 32 78 25 Z" fill={color} />
      {/* Doigt gauche bas */}
      <path d="M12 60 C6 56 2 60 2 66 C2 72 8 74 14 72 C10 76 10 84 16 86 C22 88 26 80 26 74 C28 80 34 84 40 82 C44 80 44 74 42 70 L50 62 L28 58 C22 56 16 60 12 60 Z" fill={color} />
      {/* Doigt droit bas */}
      <path d="M88 60 C94 56 98 60 98 66 C98 72 92 74 86 72 C90 76 90 84 84 86 C78 88 74 80 74 74 C72 80 66 84 60 82 C56 80 56 74 58 70 L50 62 L72 58 C78 56 84 60 88 60 Z" fill={color} />
    </svg>
  );
}

// Rasta colors
const R = '#D42B2B'; // rouge
const Y = '#F5C400'; // jaune
const G = '#1E8C1A'; // vert

export default async function LivreOrPage() {
  const tributes = await getAllTributes();

  if (!tributes) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', fontFamily: 'sans-serif', background: '#0a1a0a', color: '#F5C400', minHeight: '100vh' }}>
        <CannabisLeaf size={48} color={G} style={{ marginBottom: '16px' }} />
        <h2>Base de données non configurée</h2>
        <p style={{ color: '#aaa' }}>DATABASE_URL manquant</p>
      </div>
    );
  }

  const totalAnswers    = tributes.length;
  const uniquePlayers   = new Set(tributes.map((t) => t.playerId)).size;
  const uniqueQuestions = new Set(tributes.map((t) => t.questionId)).size;
  const totalQuestions  = 35;
  const coveragePct     = Math.round((uniqueQuestions / totalQuestions) * 100);

  const playerMap = new Map<string, { name: string; count: number; lastSeen: number }>();
  for (const t of tributes) {
    const e = playerMap.get(t.playerId);
    if (e) { e.count++; e.lastSeen = Math.max(e.lastSeen, t.answeredAt); }
    else   playerMap.set(t.playerId, { name: t.playerName, count: 1, lastSeen: t.answeredAt });
  }
  const players = [...playerMap.values()].sort((a, b) => b.count - a.count);

  const byQuestion = new Map<string, typeof tributes>();
  for (const t of tributes) {
    const arr = byQuestion.get(t.questionId) ?? [];
    arr.push(t);
    byQuestion.set(t.questionId, arr);
  }

  const cardStyle: React.CSSProperties = {
    background: '#111a0f',
    border: '1.5px solid #2a3d22',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  };

  const statColors = [R, Y, G, R];

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#0a120a',
      minHeight: '100vh',
      padding: '0 0 80px',
    }}>

      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${R} 0%, #8B0000 20%, #1a1a00 45%, #1a4000 70%, ${G} 100%)`,
        color: '#fff',
        padding: '40px 24px 36px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Feuilles décoratives fond */}
        <CannabisLeaf size={60} color="rgba(255,255,255,0.06)" style={{ position: 'absolute', top: 8, left: 8, transform: 'rotate(-20deg)' }} />
        <CannabisLeaf size={80} color="rgba(255,255,255,0.04)" style={{ position: 'absolute', top: -10, right: 20, transform: 'rotate(25deg)' }} />
        <CannabisLeaf size={50} color="rgba(255,255,255,0.05)" style={{ position: 'absolute', bottom: 4, left: 60, transform: 'rotate(10deg)' }} />
        <CannabisLeaf size={55} color="rgba(255,255,255,0.05)" style={{ position: 'absolute', bottom: 0, right: 50, transform: 'rotate(-15deg)' }} />

        {/* Bande rasta */}
        <div style={{ display: 'flex', height: '5px', marginBottom: '20px', borderRadius: '99px', overflow: 'hidden', margin: '0 auto 20px', maxWidth: '200px' }}>
          <div style={{ flex: 1, background: R }} />
          <div style={{ flex: 1, background: Y }} />
          <div style={{ flex: 1, background: G }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
          <CannabisLeaf size={36} color={G} />
          <div style={{ fontSize: '52px', lineHeight: 1 }}>📖</div>
          <CannabisLeaf size={36} color={Y} />
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          Livre d&apos;Or de Léonie
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
          🎂 18 ans — messages de ses amis
        </p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: '4px' }}>
          Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
        </p>

        {/* Bande rasta bas */}
        <div style={{ display: 'flex', height: '4px', marginTop: '20px', borderRadius: '99px', overflow: 'hidden', margin: '20px auto 0', maxWidth: '160px' }}>
          <div style={{ flex: 1, background: G }} />
          <div style={{ flex: 1, background: Y }} />
          <div style={{ flex: 1, background: R }} />
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}>

        {/* ── Stats ── */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '24px 0' }}>
          {[
            { label: 'réponses total',       value: totalAnswers,                                 extra: null },
            { label: 'joueurs',              value: uniquePlayers,                                extra: null },
            { label: 'questions couvertes',  value: uniqueQuestions,                              extra: `/${totalQuestions}` },
            { label: 'couverture',           value: `${coveragePct}%`,                            extra: null },
          ].map(({ label, value, extra }, i) => (
            <div key={i} style={{
              flex: 1, minWidth: '120px',
              background: `${statColors[i]}12`,
              border: `1.5px solid ${statColors[i]}44`,
              borderRadius: '12px',
              padding: '14px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '30px', fontWeight: 900, color: statColors[i], lineHeight: 1.1 }}>
                {value}{extra && <span style={{ fontSize: '16px', color: '#666' }}>{extra}</span>}
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>{label}</div>
            </div>
          ))}
        </div>

        {totalAnswers === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px' }}>
            <CannabisLeaf size={48} color={G} style={{ marginBottom: '16px' }} />
            <h2 style={{ color: Y, fontWeight: 700 }}>Aucune réponse encore</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>Les messages arriveront au fur et à mesure des parties jouées.</p>
          </div>
        ) : (
          <>
            {/* ── Joueurs ── */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: Y, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CannabisLeaf size={22} color={G} />
                Joueurs participants
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {players.map((p, i) => {
                  const accent = [R, Y, G][i % 3];
                  return (
                    <div key={p.name + i} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px',
                      background: `${accent}10`,
                      borderRadius: '10px',
                      border: `1px solid ${accent}30`,
                    }}>
                      <div style={{ fontSize: '20px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤'}</div>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: '15px', color: '#ddd' }}>{p.name}</div>
                      <div style={{ fontSize: '13px', color: accent, fontWeight: 700 }}>{p.count} rép.</div>
                      <div style={{ fontSize: '12px', color: '#555' }}>vu le {formatDateShort(p.lastSeen)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Réponses par jeu ── */}
            {GAMES.map((game) => {
              const levels: DifficultyLevel[] = [1, 2, 3, 4, 5];
              const gameHasAnswers = levels.some((lvl) => {
                const q = getTributeQuestion(game.id as GameId, lvl);
                return q && byQuestion.has(q.id);
              });
              if (!gameHasAnswers) return null;

              return (
                <div key={game.id} style={{ ...cardStyle, marginTop: '14px' }}>
                  <h2 style={{
                    margin: '0 0 20px', fontSize: '18px', fontWeight: 800,
                    color: Y,
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{
                      background: `${game.color}25`,
                      border: `1px solid ${game.color}55`,
                      borderRadius: '10px',
                      padding: '4px 10px',
                      fontSize: '22px',
                    }}>
                      {game.emoji}
                    </span>
                    {game.title}
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {levels.map((lvl) => {
                      const q = getTributeQuestion(game.id as GameId, lvl);
                      if (!q) return null;
                      const answers = byQuestion.get(q.id) ?? [];
                      if (answers.length === 0) return null;

                      const accent = [G, Y, R, G, Y][lvl - 1];
                      return (
                        <div key={lvl}>
                          <div style={{
                            fontSize: '13px', fontWeight: 700,
                            color: accent,
                            marginBottom: '10px',
                            padding: '8px 12px',
                            background: `${accent}12`,
                            borderRadius: '8px',
                            borderLeft: `3px solid ${accent}`,
                          }}>
                            Niv.{lvl} — {q.text}
                            <span style={{ fontWeight: 400, color: '#555', marginLeft: '8px' }}>
                              ({answers.length} rép.)
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {answers.map((a, ai) => {
                              const bord = [R, Y, G][ai % 3];
                              return (
                                <div key={a.id} style={{
                                  display: 'flex', gap: '12px',
                                  padding: '12px 14px',
                                  background: '#0e160c',
                                  border: `1px solid ${bord}30`,
                                  borderRadius: '10px',
                                }}>
                                  <div style={{
                                    flexShrink: 0, width: '34px', height: '34px',
                                    borderRadius: '50%',
                                    background: `${bord}20`,
                                    border: `1.5px solid ${bord}60`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '14px', fontWeight: 900, color: bord,
                                  }}>
                                    {a.playerName[0].toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontSize: '13px', fontWeight: 700, color: '#aaa',
                                      marginBottom: '4px',
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                    }}>
                                      {a.playerName}
                                      <span style={{ color: '#444', fontWeight: 400, fontSize: '11px' }}>
                                        {formatDate(a.answeredAt)}
                                      </span>
                                    </div>
                                    <div style={{
                                      fontSize: '15px', color: '#d0d0d0',
                                      lineHeight: 1.55, wordBreak: 'break-word',
                                      fontStyle: 'italic',
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

            {/* ── Questions en attente ── */}
            {(() => {
              const unanswered: string[] = [];
              for (const game of GAMES) {
                for (const lvl of [1, 2, 3, 4, 5] as DifficultyLevel[]) {
                  const q = getTributeQuestion(game.id as GameId, lvl);
                  if (q && !byQuestion.has(q.id)) unanswered.push(`${game.emoji} Niv.${lvl} — ${q.text}`);
                }
              }
              if (unanswered.length === 0) return null;
              return (
                <div style={{ ...cardStyle, marginTop: '14px', opacity: 0.7 }}>
                  <h2 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#555', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CannabisLeaf size={16} color="#444" />
                    Questions en attente ({unanswered.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {unanswered.map((q, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#444', padding: '5px 10px', background: '#0d140b', borderRadius: '7px' }}>
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <CannabisLeaf size={18} color={R} />
            <CannabisLeaf size={22} color={Y} />
            <CannabisLeaf size={18} color={G} />
          </div>
          <p style={{ color: '#333', fontSize: '11px' }}>
            Schlagonie — Royaume des Vosges · Dashboard privé
          </p>
        </div>
      </div>
    </div>
  );
}
