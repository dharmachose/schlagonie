import type { GameId, DifficultyLevel } from './types';

export interface TributeQuestion {
  id: string;
  gameId: GameId;
  level: DifficultyLevel;
  text: string;
  placeholder: string;
}

const TRIBUTE_QUESTIONS: TributeQuestion[] = [
  // ── Memory 🌲 ──────────────────────────────────────────────────────────────
  { id: 'q-memory-1', gameId: 'memory', level: 1, text: 'Un mot d\'amour pour Léonie 💛', placeholder: 'Une belle pensée...' },
  { id: 'q-memory-2', gameId: 'memory', level: 2, text: 'Un souvenir avec Léonie que tu ne pourras jamais oublier ✨', placeholder: 'Je me souviens que...' },
  { id: 'q-memory-3', gameId: 'memory', level: 3, text: 'Ce que tu aimes le plus chez Léonie 🌟', placeholder: 'Sa façon de...' },
  { id: 'q-memory-4', gameId: 'memory', level: 4, text: 'Une qualité cachée de Léonie que peu de gens connaissent 🔍', placeholder: 'En vrai elle est...' },
  { id: 'q-memory-5', gameId: 'memory', level: 5, text: 'Si Léonie était un personnage de film, ce serait qui ? 🎬', placeholder: 'Clairement...' },

  // ── Tetris 🪵 ──────────────────────────────────────────────────────────────
  { id: 'q-tetris-1', gameId: 'tetris', level: 1, text: 'Un (petit) défaut de Schlagonie 😈', placeholder: 'On peut bien le dire...' },
  { id: 'q-tetris-2', gameId: 'tetris', level: 2, text: 'Léonie en 3 adjectifs 🎲', placeholder: 'Elle est...' },
  { id: 'q-tetris-3', gameId: 'tetris', level: 3, text: 'Ce qui te fait le plus rire chez Schlagonie 😂', placeholder: 'Quand elle...' },
  { id: 'q-tetris-4', gameId: 'tetris', level: 4, text: 'Un truc que Léonie ne ferait absolument jamais 🙅', placeholder: 'Jamais de la vie elle...' },
  { id: 'q-tetris-5', gameId: 'tetris', level: 5, text: 'Léonie dans 10 ans, tu la vois comment ? 🔮', placeholder: 'Je la vois...' },

  // ── Match3 👋 ──────────────────────────────────────────────────────────────
  { id: 'q-match3-1', gameId: 'match3', level: 1, text: 'La meilleure chose que Léonie t\'ait jamais dite 💬', placeholder: 'Elle m\'a dit...' },
  { id: 'q-match3-2', gameId: 'match3', level: 2, text: 'Un mot d\'insulte (affectueux) pour Schlagonie 😜', placeholder: 'Cette grande...' },
  { id: 'q-match3-3', gameId: 'match3', level: 3, text: 'Ce que tout le monde pense tout bas de Schlagonie 🤭', placeholder: 'On le sait tous...' },
  { id: 'q-match3-4', gameId: 'match3', level: 4, text: 'La chose dont Léonie est le plus fière selon toi 🏅', placeholder: 'Je pense qu\'elle est fière de...' },
  { id: 'q-match3-5', gameId: 'match3', level: 5, text: 'Ce que Léonie apporte d\'unique dans ta vie ✨', placeholder: 'Grâce à elle...' },

  // ── Pacman 👑 ──────────────────────────────────────────────────────────────
  { id: 'q-pacman-1', gameId: 'pacman', level: 1, text: 'Un conseil pour Schlagonie pour ses prochaines années 🧭', placeholder: 'Mon conseil serait...' },
  { id: 'q-pacman-2', gameId: 'pacman', level: 2, text: 'Si tu pouvais offrir un super pouvoir à Léonie, lequel ? ⚡', placeholder: 'Je lui donnerais...' },
  { id: 'q-pacman-3', gameId: 'pacman', level: 3, text: 'Un truc que tu ne ferais jamais à la place de Schlagonie 🙈', placeholder: 'Jamais je...' },
  { id: 'q-pacman-4', gameId: 'pacman', level: 4, text: 'Un moment où Léonie t\'a surpris(e) 😮', placeholder: 'Une fois elle a...' },
  { id: 'q-pacman-5', gameId: 'pacman', level: 5, text: 'Ce que tu admires secrètement chez Schlagonie 🌹', placeholder: 'Je n\'ose pas toujours le dire mais...' },

  // ── Joint 🌿 ───────────────────────────────────────────────────────────────
  { id: 'q-joint-1', gameId: 'joint', level: 1, text: 'Décris Schlagonie en une phrase 🎤', placeholder: 'Elle est...' },
  { id: 'q-joint-2', gameId: 'joint', level: 2, text: 'Le plat préféré de Léonie selon toi 🍽️', placeholder: 'Sûrement...' },
  { id: 'q-joint-3', gameId: 'joint', level: 3, text: 'Ce que tu changerais (ou pas !) chez Schlagonie 🔧', placeholder: 'Honnêtement...' },
  { id: 'q-joint-4', gameId: 'joint', level: 4, text: 'Si Léonie était un animal, ce serait lequel ? 🐾', placeholder: 'Clairement un(e)...' },
  { id: 'q-joint-5', gameId: 'joint', level: 5, text: 'Un endroit du monde que tu imagines Léonie habiter 🗺️', placeholder: 'Je la vois bien à...' },

  // ── Tower ⚔️ ───────────────────────────────────────────────────────────────
  { id: 'q-tower-1', gameId: 'tower', level: 1, text: 'Ton meilleur souvenir avec Léonie 🎂', placeholder: 'Je me souviens de...' },
  { id: 'q-tower-2', gameId: 'tower', level: 2, text: 'Un truc que tu voudrais faire avec Léonie 🤝', placeholder: 'J\'adorerais qu\'on...' },
  { id: 'q-tower-3', gameId: 'tower', level: 3, text: 'Ce que Léonie fait de mieux dans la vie 🏆', placeholder: 'Elle excelle à...' },
  { id: 'q-tower-4', gameId: 'tower', level: 4, text: 'Un message secret pour Léonie 🤫', placeholder: 'Psssst Léonie...' },
  { id: 'q-tower-5', gameId: 'tower', level: 5, text: 'Si tu organisais une fête pour Léonie, ça ressemblerait à quoi ? 🎉', placeholder: 'Il y aurait...' },

  // ── Roulette Vosgienne 🎰 ─────────────────────────────────────────────────
  { id: 'q-slots-1', gameId: 'slots', level: 1, text: 'Si Léonie était un symbole de la machine à sous, ce serait lequel ? 🎰', placeholder: 'Clairement le...' },
  { id: 'q-slots-2', gameId: 'slots', level: 2, text: 'Ce sur quoi Léonie mise dans la vie 🍀', placeholder: 'Elle mise sur...' },
  { id: 'q-slots-3', gameId: 'slots', level: 3, text: 'Un jackpot que tu souhaites à Léonie dans sa vie ✨', placeholder: 'J\'espère qu\'elle gagne...' },
  { id: 'q-slots-4', gameId: 'slots', level: 4, text: 'Le truc le plus fou que Léonie ferait si elle gagnait au casino 🤑', placeholder: 'Elle serait capable de...' },
  { id: 'q-slots-5', gameId: 'slots', level: 5, text: 'Léonie face à l\'adversité : elle fait quoi ? 🎲', placeholder: 'Quand ça coince, elle...' },

  // ── Allo 📞 ────────────────────────────────────────────────────────────────
  { id: 'q-allo-1', gameId: 'allo', level: 1, text: 'La première chose qui te vient en tête quand tu penses à Léonie 💭', placeholder: 'Aussitôt je pense à...' },
  { id: 'q-allo-2', gameId: 'allo', level: 2, text: 'Un truc que Léonie dit tout le temps 🔁', placeholder: 'Elle dit souvent...' },
  { id: 'q-allo-3', gameId: 'allo', level: 3, text: 'Ce que Léonie ne supporte absolument pas 😤', placeholder: 'Elle ne supporte pas...' },
  { id: 'q-allo-4', gameId: 'allo', level: 4, text: 'Un rêve que tu souhaites pour Léonie 🌈', placeholder: 'Je lui souhaite...' },
  { id: 'q-allo-5', gameId: 'allo', level: 5, text: 'Ton message pour les 18 ans de Léonie 🎂🎊', placeholder: 'Pour tes 18 ans...' },
];

export function getTributeQuestion(gameId: GameId, level: DifficultyLevel): TributeQuestion | null {
  return TRIBUTE_QUESTIONS.find((q) => q.gameId === gameId && q.level === level) ?? null;
}
