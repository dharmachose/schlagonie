# Schlagonie 🌲

> Mini-jeux mobile-first dans l'univers rasta des Vosges, dédiés à la reine de La Baffe.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** avec thème rasta (vert/or/rouge)
- **Zustand** pour le state (profil joueur + scores locaux)
- **Upstash Redis** pour les classements en ligne
- **Vercel** pour le déploiement

## Jeux disponibles

| Jeu | Thème | Niveaux |
|-----|-------|---------|
| 🌲 Mémoire des Vosges | Paires de cartes emoji vosgiennes | 5 |
| 🪵 Tetris Shlagonie | Bûches, sapins, cocas | 5 |
| 👋 Crush des Vosges | Match-3 avec gemmes des Vosges | 5 |
| 👑 Shlagonie Fuit ! | La reine fuit les légumes | 5 |

## Système de points

- **1 point** par niveau complété (première fois)
- **Classement global** : total de points
- **Classement par jeu** : points dans ce jeu
- **Classement vitesse** : meilleur temps par niveau

## Lancement local

```bash
npm install
cp .env.example .env.local
# Remplir UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN
npm run dev
```

## Variables d'environnement (Vercel)

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Configurer dans le dashboard Vercel → Settings → Environment Variables.
