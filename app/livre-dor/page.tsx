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

export default async function LivreOrPage() {
  const tributes = await getAllTributes();

  if (!tributes) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', fontFamily: 'sans-serif', color: '#333' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2>Base de données non configurée</h2>
        <p style={{ color: '#888' }}>DATABASE_URL manquant</p>
      </div>
    );
  }

  // ── Stats globales ──────────────────────────────────────────────────────────
  const totalAnswers = tributes.length;
  const uniquePlayers = new Set(tributes.map((t) => t.playerId)).size;
  const uniqueQuestions = new Set(tributes.map((t) => t.questionId)).size;
  const totalQuestions = 35; // 7 jeux × 5 niveaux
  const coveragePct = Math.round((uniqueQuestions / totalQuestions) * 100);

  // Joueurs + nombre de réponses
  const playerMap = new Map<string, { name: string; count: number; lastSeen: number }>();
  for (const t of tributes) {
    const existing = playerMap.get(t.playerId);
    if (existing) {
      existing.count++;
      existing.lastSeen = Math.max(existing.lastSeen, t.answeredAt);
    } else {
      playerMap.set(t.playerId, { name: t.playerName, count: 1, lastSeen: t.answeredAt });
    }
  }
  const players = [...playerMap.values()].sort((a, b) => b.count - a.count);

  // Index par questionId
  const byQuestion = new Map<string, typeof tributes>();
  for (const t of tributes) {
    const arr = byQuestion.get(t.questionId) ?? [];
    arr.push(t);
    byQuestion.set(t.questionId, arr);
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  const statBadge: React.CSSProperties = {
    background: '#f5f0ff',
    border: '1px solid #d4b8ff',
    borderRadius: '12px',
    padding: '16px 20px',
    textAlign: 'center',
    flex: 1,
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#f9f7ff',
      minHeight: '100vh',
      padding: '0 0 60px',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 50%, #C026D3 100%)',
        color: '#fff',
        padding: '40px 24px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '56px', marginBottom: '12px', lineHeight: 1 }}>📖</div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
          Livre d'Or de Léonie
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', marginTop: '8px' }}>
          🎂 18 ans — messages de ses amis
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>
          Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
        </p>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}>

        {/* Stats globales */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '24px 0' }}>
          <div style={statBadge}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#7C3AED' }}>{totalAnswers}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>réponses total</div>
          </div>
          <div style={statBadge}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#7C3AED' }}>{uniquePlayers}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>joueurs</div>
          </div>
          <div style={statBadge}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#7C3AED' }}>{uniqueQuestions}<span style={{ fontSize: '18px', color: '#aaa' }}>/{totalQuestions}</span></div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>questions couvertes</div>
          </div>
          <div style={statBadge}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#7C3AED' }}>{coveragePct}%</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>couverture</div>
          </div>
        </div>

        {totalAnswers === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕊️</div>
            <h2 style={{ color: '#666', fontWeight: 700 }}>Aucune réponse encore</h2>
            <p style={{ color: '#aaa', fontSize: '14px' }}>Les messages arriveront au fur et à mesure des parties jouées.</p>
          </div>
        ) : (
          <>
            {/* Joueurs */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#1a1a1a' }}>
                👥 Joueurs participants
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {players.map((p, i) => (
                  <div key={p.name + i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px',
                    background: i === 0 ? '#f5f0ff' : '#fafafa',
                    borderRadius: '10px',
                    border: i === 0 ? '1px solid #d4b8ff' : '1px solid #eee',
                  }}>
                    <div style={{ fontSize: '20px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤'}</div>
                    <div style={{ flex: 1, fontWeight: 700, fontSize: '15px' }}>{p.name}</div>
                    <div style={{ fontSize: '13px', color: '#7C3AED', fontWeight: 700 }}>
                      {p.count} rép.
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                      vu le {formatDateShort(p.lastSeen)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Réponses par jeu */}
            {GAMES.map((game) => {
              const levels: DifficultyLevel[] = [1, 2, 3, 4, 5];
              const gameHasAnswers = levels.some((lvl) => {
                const q = getTributeQuestion(game.id as GameId, lvl);
                return q && byQuestion.has(q.id);
              });
              if (!gameHasAnswers) return null;

              return (
                <div key={game.id} style={{ ...cardStyle, marginTop: '16px' }}>
                  <h2 style={{
                    margin: '0 0 20px',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <span style={{
                      background: `${game.color}20`,
                      border: `1px solid ${game.color}50`,
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

                      return (
                        <div key={lvl}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#7C3AED',
                            marginBottom: '10px',
                            padding: '8px 12px',
                            background: '#f5f0ff',
                            borderRadius: '8px',
                            borderLeft: '3px solid #7C3AED',
                          }}>
                            Niv.{lvl} — {q.text}
                            <span style={{ fontWeight: 400, color: '#aaa', marginLeft: '8px' }}>
                              ({answers.length} rép.)
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {answers.map((a) => (
                              <div key={a.id} style={{
                                display: 'flex',
                                gap: '12px',
                                padding: '12px 14px',
                                background: '#fafafa',
                                border: '1px solid #eee',
                                borderRadius: '10px',
                              }}>
                                <div style={{
                                  flexShrink: 0,
                                  width: '34px', height: '34px',
                                  borderRadius: '50%',
                                  background: '#7C3AED20',
                                  border: '1px solid #7C3AED40',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '14px', fontWeight: 900, color: '#7C3AED',
                                }}>
                                  {a.playerName[0].toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: '13px', fontWeight: 700, color: '#555',
                                    marginBottom: '4px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                  }}>
                                    {a.playerName}
                                    <span style={{ color: '#bbb', fontWeight: 400, fontSize: '11px' }}>
                                      {formatDate(a.answeredAt)}
                                    </span>
                                  </div>
                                  <div style={{
                                    fontSize: '15px', color: '#1a1a1a',
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word',
                                    fontStyle: 'italic',
                                  }}>
                                    &ldquo;{a.answer}&rdquo;
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Questions sans réponse */}
            {(() => {
              const unanswered: string[] = [];
              for (const game of GAMES) {
                for (const lvl of [1, 2, 3, 4, 5] as DifficultyLevel[]) {
                  const q = getTributeQuestion(game.id as GameId, lvl);
                  if (q && !byQuestion.has(q.id)) {
                    unanswered.push(`${game.emoji} Niv.${lvl} — ${q.text}`);
                  }
                }
              }
              if (unanswered.length === 0) return null;
              return (
                <div style={{ ...cardStyle, marginTop: '16px', opacity: 0.75 }}>
                  <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: '#888' }}>
                    ⏳ Questions en attente de réponse ({unanswered.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {unanswered.map((q, i) => (
                      <div key={i} style={{
                        fontSize: '13px', color: '#aaa',
                        padding: '6px 10px',
                        background: '#f5f5f5',
                        borderRadius: '8px',
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

        <p style={{ textAlign: 'center', color: '#ccc', fontSize: '12px', marginTop: '40px' }}>
          🌲 Schlagonie — Royaume des Vosges · Dashboard privé
        </p>
      </div>
    </div>
  );
}
