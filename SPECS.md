# PRD — Schlagonie Mini-Games 🌲

**Version** : 1.0
**Date** : Mars 2026
**Statut** : En développement
**Auteur** : Claude Code

---

## 1. Vision Produit

### 1.1 Résumé

Schlagonie est une **webapp mobile-first** regroupant plusieurs mini-jeux à thème, dédiée à une amie passionnée des Vosges. L'application est conçue pour être jouée en session courte depuis un smartphone, avec un système de points et de classements partagés entre joueurs.

### 1.2 Proposition de valeur

- Accessible instantanément depuis un navigateur mobile (pas d'installation)
- Mini-jeux rapides et satisfaisants (2–10 min par session)
- Thème cohérent et personnel : univers rasta × Vosges × Schlagonie
- Compétition amicale via classements partagés en ligne

### 1.3 Utilisateur cible

**Primaire** : Shlagonie et son cercle d'amis proches
**Secondaire** : Toute personne partagée le lien

---

## 2. Univers Visuel & Thème

### 2.1 Palette rasta

| Token | Valeur | Usage |
|-------|--------|-------|
| `--rasta-green` | `#228B22` | Éléments principaux, murs, barres |
| `--rasta-green-light` | `#32CD32` | Accents, textes secondaires |
| `--rasta-gold` | `#FFD700` | Scores, titres, éléments clés |
| `--rasta-gold-dark` | `#FFA500` | Dégradés, boutons |
| `--rasta-red` | `#DC143C` | Danger, game over, boutons d'alerte |
| `--bg-dark` | `#0d1a0d` | Fond principal |
| `--bg-card` | `#1a2e1a` | Cartes, panneaux |

### 2.2 Références visuelles Vosges

- 🌲 Sapin des Vosges (élément dominant)
- 👋 La Baffe (gimmick récurrent)
- 🥤 Le Coca / 🍫 Le Nutella
- 🌿 Ambiance rasta
- ⛰️ Montagnes, brouillard
- 🦌 Cerf des Vosges
- 🍄 Champignons
- ❄️ Neige vosgienne
- 🏔️ Sommets
- Aydoilles — ville de référence

### 2.3 Mascotte

**Princess Shlagonie** — personnage récurrent dans les overlays victoire/défaite, écrans de sélection. Représentée par emoji 🏃 (gameplay) et 🌿 (profil).

---

## 3. Architecture Fonctionnelle

### 3.1 Pages de l'application

| Route | Rôle |
|-------|------|
| `/` | Accueil — hub des jeux + score global |
| `/games` | Liste des jeux avec progression par niveau |
| `/games/[gameId]` | Page d'un jeu (sélection de niveau) |
| `/games/[gameId]/[level]` | Partie en cours |
| `/leaderboard` | Classements (global / par jeu / vitesse) |
| `/profile` | Profil joueur + stats personnelles |

### 3.2 Navigation

- **Bottom navigation bar** fixe sur mobile (4 onglets)
- Onglet actif mis en évidence (couleur or)
- Zone safe-area respectée (notch iPhone)
- Pas de navigation par geste (conflit avec swipe jeux)

---

## 4. Système de Profil Joueur

### 4.1 Création de profil

- **Déclencheur** : Premier lancement de l'app
- **Champs** : Pseudo (2–20 caractères)
- **Identifiant** : UUID généré côté client
- **Stockage** : localStorage via Zustand persist

### 4.2 Données joueur

```typescript
interface PlayerProfile {
  id: string        // UUID v4
  name: string      // Pseudo affiché
  createdAt: number // Timestamp création
}
```

### 4.3 Modification

- Accessible depuis `/profile` → "Changer de pseudo"
- Réinitialise le formulaire PlayerSetup
- L'UUID reste identique (pas de doublon Redis)

---

## 5. Système de Points & Scores

### 5.1 Règle de scoring

| Événement | Points |
|-----------|--------|
| Compléter un niveau (1ère fois) | **+1 point** |
| Compléter un niveau déjà fait | 0 (améliore uniquement le temps) |
| Score total maximum | **20 pts** (4 jeux × 5 niveaux) |

### 5.2 Données d'une complétion

```typescript
interface LevelCompletion {
  playerId: string
  playerName: string
  gameId: 'memory' | 'tetris' | 'match3' | 'pacman'
  level: 1 | 2 | 3 | 4 | 5
  elapsedMs: number    // Temps en millisecondes
  completedAt: number  // Timestamp
}
```

### 5.3 Persistence

- **Local** : Zustand (localStorage) — immédiat, offline-first
- **Distant** : Upstash Redis via API Route — classements partagés

---

## 6. Système de Classements

### 6.1 Trois classements distincts

**Classement Global**
- Tri par : total de points tous jeux confondus
- Clé Redis : `lb:global`
- Affiché dans : onglet "Global" de `/leaderboard`

**Classement Par Jeu**
- Tri par : points accumulés dans un jeu donné (max 5)
- Clé Redis : `lb:{gameId}`
- Affiché dans : onglet "Par Jeu" (sélecteur de jeu)

**Classement Vitesse**
- Tri par : meilleur temps pour un niveau précis
- Clé Redis : `lb:{gameId}:lvl:{N}:speed`
- Valeur Redis : `-elapsedMs` (négatif → plus rapide = rang plus élevé)
- Affiché dans : onglet "Vitesse" (sélecteur jeu + niveau)

### 6.2 Format affiché

```
🥇 PlayerName          42 pts
🥈 AutreJoueur         38 pts
🥉 Shlagonie           35 pts
#4 TroisièmeType       20 pts
```

### 6.3 Limites

- Top 20 joueurs par classement
- Mise à jour temps-réel à chaque soumission de score
- Fallback : tableau vide si Redis non configuré (pas d'erreur)

---

## 7. Jeux — Spécifications Détaillées

### 7.1 GameShell (wrapper commun)

Chaque jeu est wrappé dans `GameShell` qui fournit :

**HUD supérieur**
- Bouton ✕ (retour arrière)
- Nom du jeu + niveau actuel
- Timer en cours (`M:SS`)

**Overlays**
- **Victoire** : 🏆 + temps + boutons "Niveau suivant" / "Retour aux jeux"
- **Game Over** : 💀 + boutons "Réessayer" / "Retour aux jeux"

**Interface de jeu (contrat)**
```typescript
interface GameProps {
  level: 1 | 2 | 3 | 4 | 5
  onLevelComplete: (elapsedMs: number) => void
  onGameOver: () => void
}
```

---

### 7.2 Jeu 1 — Mémoire des Vosges 🌲

**Concept** : Memory classique avec des paires d'emoji vosgiennes

**Emoji disponibles** (18 types) :
`🌲 👋 🌿 🥤 ⛰️ ❄️ 🦌 🍄 🌧️ 🪵 🏔️ 🦅 🌰 🫐 🌻 🐿️ 🍃 ⭐`

**Niveaux de difficulté** :

| Niveau | Grille | Paires | Label |
|--------|--------|--------|-------|
| 1 | 3×4 | 6 | Promenade 🌱 |
| 2 | 4×4 | 8 | Randonnée 🌿 |
| 3 | 4×5 | 10 | Col des Vosges ⛰️ |
| 4 | 5×6 | 15 | Tempête 🌪️ |
| 5 | 6×6 | 18 | La Baffe Ultime 👋 |

**Règles** :
- Retourner 2 cartes par tour
- Match → cartes restent visibles, vertes
- No match → cartes se retournent après 900ms
- Victoire : toutes les paires trouvées
- Pas de condition de défaite (jeu infini jusqu'à victoire)

**Métriques affichées** : Nombre de coups, paires trouvées / total

---

### 7.3 Jeu 2 — Tetris Shlagonie 🪵

**Concept** : Tetris classique avec des pièces aux couleurs et noms vosgiennes

**Pièces thématisées** :

| Type | Emoji | Couleur | Nom |
|------|-------|---------|-----|
| I | 🪵 | Vert #32CD32 | Bûche |
| O | 🥤 | Or #FFD700 | Coca |
| T | 🌲 | Vert #228B22 | Sapin |
| S | 🌿 | Vert clair | Feuilles |
| Z | 🍄 | Rouge #DC143C | Champignon |
| J | ❄️ | Bleu ciel | Neige |
| L | ⛰️ | Orange #FFA500 | Montagne |

**Niveaux de difficulté** :

| Niveau | Vitesse chute | Score cible | Label |
|--------|---------------|-------------|-------|
| 1 | 800ms/case | 500 | Promenade 🌱 |
| 2 | 500ms/case | 800 | Randonnée 🌿 |
| 3 | 300ms/case | 1200 | Col des Vosges ⛰️ |
| 4 | 180ms/case | 1800 | Tempête 🌪️ |
| 5 | 100ms/case | 2500 | La Baffe Ultime 👋 |

**Règles** :
- Grille 10×20 standard
- Victoire : atteindre le score cible
- Défaite : pièce ne peut pas être placée (pile trop haute)
- Scoring lignes : 1 ligne=100, 2=300, 3=500, 4=800

**Contrôles** :
- Clavier : ←→ déplacer, ↑ rotation, ↓ descente douce, Espace hard drop
- Mobile : boutons directionnels + rotation affichés à l'écran
- Touch : swipe gauche/droite, swipe bas = hard drop, swipe haut = rotation

---

### 7.4 Jeu 3 — Crush des Vosges 👋

**Concept** : Match-3 (type Candy Crush) avec des gemmes vosgiens

**Gemmes disponibles** (7 types) :
`🌲 👋 🥤 🌿 ❄️ 🍄 ⛰️`

**Niveaux de difficulté** :

| Niveau | Types de gemmes | Taille grille | Score cible |
|--------|----------------|---------------|-------------|
| 1 | 4 | 6×6 | 300 |
| 2 | 5 | 7×7 | 600 |
| 3 | 5 | 8×8 | 1000 |
| 4 | 6 | 8×8 | 1500 |
| 5 | 7 | 9×9 | 2500 |

**Règles** :
- Sélectionner une gemme, puis une voisine (haut/bas/gauche/droite)
- L'échange n'est valide que s'il crée un match d'au moins 3
- Cascade automatique après chaque suppression
- Score : 10 pts × taille match + bonus pour 4+ (`(n-3) × 20`)
- Victoire : atteindre le score cible
- Pas de limite de coups (jeu infini jusqu'à victoire)

**Métriques affichées** : Score actuel + barre de progression vers cible

---

### 7.5 Jeu 4 — Shlagonie Fuit ! 🏃

**Concept** : Pac-Man dans les ruelles d'Aydoilles

**Éléments du labyrinthe** :
- Murs : blocs vert forêt vosgienne
- Points : petits disques or (10 pts chacun)
- Power pellets : gros disques or (50 pts + fantômes effrayés 8 secondes)
- Shlagonie : 🏃 (le joueur)
- Fantômes normaux : 👻 🎃 💀 👿
- Fantômes effrayés : 💙

**Niveaux de difficulté** :

| Niveau | Nb fantômes | Vitesse Shlagonie | Vitesse fantômes | Label |
|--------|-------------|-------------------|------------------|-------|
| 1 | 1 | 200ms/case | 800ms/case | Promenade 🌱 |
| 2 | 2 | 175ms/case | 600ms/case | Randonnée 🌿 |
| 3 | 3 | 150ms/case | 450ms/case | Col des Vosges ⛰️ |
| 4 | 4 | 130ms/case | 300ms/case | Tempête 🌪️ |
| 5 | 4 | 110ms/case | 200ms/case | La Baffe Ultime 👋 |

**Règles** :
- Manger tous les points pour gagner
- Collision avec fantôme non-effrayé = -1 vie
- 3 vies par partie
- Fantôme effrayé mangé = +200 pts + respawn fantôme au centre
- Victoire : 0 points restants
- Défaite : 0 vies restantes

**IA des fantômes** :
- Mode normal (70%) : chasse Shlagonie (plus court chemin Manhattan)
- Mode normal (30%) : mouvement aléatoire
- Mode effrayé : fuit Shlagonie (s'éloigne)

**Contrôles** :
- Clavier : ZQSD ou flèches directionnelles
- Mobile : D-pad à l'écran (4 boutons directionnels)
- Touch : swipe gauche/droite/haut/bas

---

## 8. Spécifications Techniques

### 8.1 Stack

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Framework | Next.js 14 App Router + TypeScript | Natif Vercel, SSG/SSR, API Routes |
| Styling | Tailwind CSS v4 + CSS Variables | Mobile-first utility, thème centralisé |
| State | Zustand + persist middleware | Léger, offline-first |
| Backend scores | Upstash Redis | Sorted sets natifs, serverless-friendly |
| Déploiement | Vercel | Intégration Git, preview branches |

### 8.2 Structure de fichiers

```
schlagonie/
├── app/
│   ├── layout.tsx                    # Layout global + BottomNav
│   ├── page.tsx                      # Home (hub)
│   ├── globals.css                   # Thème rasta, animations, utilitaires
│   ├── games/
│   │   ├── page.tsx                  # Hub jeux avec progression
│   │   ├── memory/
│   │   │   ├── page.tsx              # Sélection niveau Memory
│   │   │   └── [level]/page.tsx      # Partie Memory
│   │   ├── tetris/[level]/page.tsx
│   │   ├── match3/[level]/page.tsx
│   │   └── pacman/[level]/page.tsx
│   ├── leaderboard/page.tsx          # Classements (3 onglets)
│   ├── profile/page.tsx              # Profil + stats
│   └── api/
│       ├── scores/route.ts           # POST score → Redis
│       └── leaderboard/route.ts      # GET classements
├── components/
│   ├── BottomNav.tsx                 # Navigation mobile fixe
│   ├── GameShell.tsx                 # HUD + overlays communs
│   └── PlayerSetup.tsx              # Formulaire création pseudo
└── lib/
    ├── types.ts                      # Types partagés + clés Redis
    ├── store.ts                      # Zustand store
    ├── leaderboard.ts                # Client Upstash Redis
    └── games/
        ├── config.ts                 # Métadonnées jeux + labels niveaux
        ├── memory/logic.ts + MemoryGame.tsx
        ├── tetris/logic.ts + TetrisGame.tsx
        ├── match3/logic.ts + Match3Game.tsx
        └── pacman/logic.ts + PacmanGame.tsx
```

### 8.3 Variables d'environnement

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

Requis uniquement pour les classements en ligne. L'app fonctionne sans (scores locaux uniquement).

### 8.4 API Routes

**POST `/api/scores`**
```json
{
  "playerId": "uuid",
  "playerName": "Shlagonie",
  "gameId": "memory",
  "level": 3,
  "elapsedMs": 45200,
  "completedAt": 1710000000000
}
```
Réponse : `{ "ok": true }`

**GET `/api/leaderboard`**

| Paramètres | Exemple | Retourne |
|-----------|---------|----------|
| `?type=global` | `/api/leaderboard?type=global` | Top 20 global |
| `?type=game&gameId=tetris` | `/api/leaderboard?type=game&gameId=tetris` | Top 20 jeu |
| `?type=speed&gameId=memory&level=3` | `/api/leaderboard?type=speed&gameId=memory&level=3` | Top 20 vitesse |

Réponse :
```json
[
  { "rank": 1, "playerName": "Shlagonie", "score": 20, "fastestMs": 45200 },
  ...
]
```

---

## 9. Expérience Utilisateur

### 9.1 Premier lancement

1. Écran PlayerSetup — saisie du pseudo (2–20 chars)
2. Redirection automatique vers l'accueil
3. Score global affiché : 0

### 9.2 Flux de jeu standard

```
/games → [sélection jeu] → [sélection niveau] → partie
    → Victoire : overlay 🏆 + soumission score + "Niveau suivant"
    → Défaite : overlay 💀 + "Réessayer"
```

### 9.3 Accessibilité mobile

- Pas de zoom sur focus input (`maximum-scale=1`)
- Touch action = `manipulation` (supprime délai 300ms)
- Tap highlight désactivé sur tous les boutons interactifs
- Taille minimum des zones tactiles : 44×44px
- Safe area insets respectés (notch + home indicator)

---

## 10. Roadmap

### Phase 0 — Socle ✅ (terminé)
- [x] Setup Next.js + Tailwind + Zustand + Upstash Redis
- [x] Thème rasta + composants communs
- [x] GameShell, BottomNav, PlayerSetup
- [x] API Routes scores + leaderboard
- [x] Pages : Home, Games Hub, Leaderboard, Profile

### Phase 1 — Memory ✅ (terminé)
- [x] Logique deck (buildDeck, 18 emoji vosgiennes)
- [x] Grilles 3×4 → 6×6 selon niveau
- [x] Flip animation, détection match, condition victoire

### Phase 2 — Tetris ✅ (terminé)
- [x] Moteur de jeu (placement, rotation, gravity, line clear)
- [x] Pièces thématisées (🪵🥤🌲🌿🍄❄️⛰️)
- [x] Contrôles clavier + touch + boutons écran
- [x] Score cible par niveau

### Phase 3 — Match-3 ✅ (terminé)
- [x] Grille générative sans match initial
- [x] Détection horizontale + verticale
- [x] Cascade automatique + gravity
- [x] Barre de progression score

### Phase 4 — Pac-Man ✅ (terminé)
- [x] Labyrinthe fixe (style Aydoilles)
- [x] IA fantômes (chasse + fuite)
- [x] Power pellets + mode effrayé
- [x] D-pad mobile + swipe

### Phase 5 — Améliorations futures 🔜
- [ ] Animations CSS plus riches (gemmes qui tombent, particules)
- [ ] Sons (Web Audio API) — thème rasta
- [ ] Super Mario — Princess Shlagonie (Phaser.js)
- [ ] Clash of Clans — Tower defense vosgien (Phaser.js)
- [ ] Mode plein écran / PWA installable
- [ ] Partage score sur réseaux sociaux
- [ ] Avatars personnalisables (emojis Vosges)
- [ ] Système de badges / achievements

---

## 11. Critères d'Acceptation

### Fonctionnel
- [ ] Créer un pseudo → persisté après rechargement de page
- [ ] Compléter Memory niveau 1 → +1 point dans le total
- [ ] Même niveau rejoué → 0 point supplémentaire, meilleur temps mis à jour
- [ ] Score soumis → apparaît dans le classement en ligne
- [ ] Classement vitesse → trié du plus rapide au plus lent
- [ ] 5 niveaux accessibles pour chaque jeu

### Mobile
- [ ] Rendu correct sur viewport 375px (iPhone SE)
- [ ] Rendu correct sur viewport 390px (iPhone 15)
- [ ] D-pad Pac-Man utilisable avec le pouce
- [ ] Grille Memory niveau 5 (6×6) tient dans l'écran
- [ ] Tetris : boutons de contrôle accessibles sans clavier

### Performance
- [ ] Build Next.js sans erreur TypeScript
- [ ] Première peinture < 3s sur connexion 4G
- [ ] Pas de fuite mémoire (intervals nettoyés sur unmount)

---

*🌲 Made with love for Shlagonie, reine d'Aydoilles et gardienne des Vosges 👑*
