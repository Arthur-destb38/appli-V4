# Gorillax

Application mobile de fitness avec fonctionnalites sociales. L'idee : combiner le suivi d'entrainement avec un reseau social pour garder la motivation.

**Projet M2 MoSEF** -- Arthur Destribats & Niama El Kamal -- Paris 1, Fevrier 2026

---

## Le projet en bref

80% des gens abandonnent la salle apres 3 mois. Pourquoi ? Pas de suivi, pas de motivation, personne pour te pousser.

Gorillax essaie de resoudre ca en melangeant deux trucs :
- Une app de tracking classique (seances, exercices, progression)
- Un feed social a la Instagram ou tu partages tes seances

En gros, c'est un peu le Strava de la muscu.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React Native 0.81 + Expo 54 + TypeScript |
| Navigation | Expo Router (file-based routing) |
| BDD locale | expo-sqlite (offline-first) |
| Backend | FastAPI (Python 3.10+) |
| ORM | SQLModel (SQLAlchemy) |
| BDD serveur | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (access + refresh tokens) |
| Deploiement API | Render |
| Build mobile | EAS Build (Expo) |

---

## Lancer le projet

### Prerequis

- Python 3.10+ (avec `uv` pour la gestion des dependances)
- Node.js 20+
- pnpm (`npm install -g pnpm` si besoin)
- L'app Expo Go sur ton telephone (ou un navigateur web)

### Installation rapide

```bash
git clone https://github.com/Arthur-destb38/appli-V4.git
cd appli_V3
chmod +x deploy.sh
./deploy.sh
```

Le script fait tout : il installe les dependances, lance l'API, charge les donnees de demo, et demarre l'app. A la fin tu scannes le QR code avec Expo Go ou tu ouvres http://localhost:8081 dans ton navigateur.

> Le telephone et l'ordinateur doivent etre sur le meme WiFi si tu utilises Expo Go.

### Compte de demonstration

Pour tester rapidement sans creer de compte :
- **Username** : `demo`
- **Password** : `DemoPassword123`

Ou clique sur le bouton "Connexion Demo" sur la page de login.

### Options du script

```bash
./deploy.sh --api-only   # Juste l'API
./deploy.sh --app-only   # Juste l'app (utilise l'API cloud)
./deploy.sh --tunnel     # Si le QR code ne marche pas, passe par internet
```

### Telephone : passer par Render

Sur ton **telephone** (Expo Go ou build), l'app utilise **Render** par defaut (`appli-v2.onrender.com`). Comme ca, "Ajouter a Apple Wallet" et le reste marchent sans etre sur le meme Wi-Fi que ton Mac.

- Ne pas creer `app/.env` avec `EXPO_PUBLIC_API_URL` en prod.
- Pour forcer l'API locale sur le telephone (dev), mets dans `app/.env` : `EXPO_PUBLIC_API_URL=http://TON_IP:8000`.

---

## Architecture

```
Frontend (React Native + Expo)
        |
    REST API (HTTPS)
        |
Backend (FastAPI + SQLModel)
        |
  SQLite / PostgreSQL
```

Pour le detail complet de l'architecture, voir [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

### Structure des dossiers

```
appli_V3/
|-- deploy.sh              # Le script qui fait tout
|-- api/                   # Le backend Python
|   |-- src/api/           # Code source
|   |   |-- main.py        # Point d'entree FastAPI
|   |   |-- models.py      # 20 modeles SQLModel
|   |   |-- schemas.py     # Schemas Pydantic (validation)
|   |   |-- routes/        # 22 fichiers de routes
|   |   |-- services/      # Logique metier (programmes, email, wallet)
|   |   `-- utils/         # Auth, validation, rate limiting
|   |-- scripts/           # Scripts utilitaires (seed, reset)
|   `-- migrations/        # Migrations Alembic
`-- app/                   # L'app React Native
    |-- app/               # Les ecrans (Expo Router)
    |   |-- (tabs)/        # Navigation principale (5 tabs)
    |   |-- login.tsx      # Connexion
    |   |-- register.tsx   # Inscription
    |   |-- track/[id].tsx # Suivi seance en temps reel
    |   |-- messages/      # Messagerie privee
    |   `-- ...            # 35+ ecrans
    `-- src/
        |-- components/    # Composants reutilisables
        |-- hooks/         # useAuth, useWorkouts, etc.
        |-- services/      # Appels API
        `-- db/            # SQLite local + sync
```

---

## Fonctionnalites

### Fitness

- **Programmes personnalises** : PPL, Full Body, Upper/Lower, generation intelligente basee sur le profil
- **Base de 130+ exercices** : avec groupes musculaires, equipement, difficulte
- **Suivi en temps reel** : poids, reps, RPE, temps de repos
- **Historique et progression** : graphiques par exercice, volume total, PR
- **Mode offline** : tout marche sans connexion, sync automatique via `/sync/push` et `/sync/pull`

### Social

- **Feed** : vois les seances de tes amis en temps reel, avec likes et commentaires
- **Profils** : stats, bio, avatar, objectifs, followers/following
- **Classements** : volume, frequence, likes, followers (par semaine/mois/all-time)
- **Notifications** : likes, commentaires, nouveaux followers
- **Messagerie privee** : conversations 1:1, messages non lus
- **Explore** : trending posts, suggestions d'utilisateurs, recherche

### Authentification et securite

- **Inscription securisee** : validation email, mot de passe fort, usernames reserves bloques
- **Connexion** : JWT tokens avec refresh, rate limiting sur les tentatives
- **Configuration du profil** : onboarding en 3 etapes (infos, objectifs, preferences)
- **Mode demo** : compte de test pre-configure
- **Reset password** : par email avec token temporaire

### Gorillax Salles (integration salles de sport)

- **Pass Wallet** : carte membre Apple Wallet (.pkpass) et Google Wallet
- **API Salle** : resolution de token QR, profil public, seance en cours pour affichage machine
- **Audit** : log de chaque appel API salle
- Voir [gorillax-salles/](./gorillax-salles/) pour la documentation complete

---

## API

**Production** : https://appli-v2.onrender.com
**Documentation Swagger** : https://appli-v2.onrender.com/docs
**Documentation detaillee** : [docs/API.md](./docs/API.md)

### Endpoints principaux (70+ au total)

| Categorie | Prefix | Endpoints |
|-----------|--------|-----------|
| Auth | `/auth` | register, login, refresh, me, logout, verify-email, reset-password |
| Exercises | `/exercises` | list, get, create, bulk, import |
| Feed | `/feed` | get feed, follow, unfollow |
| Likes | `/likes` | toggle like, comments, comment likes |
| Share | `/share` | share workout |
| Profile | `/profile` | get, update, follow, followers, avatar |
| Users | `/users` | profile setup (3 steps), profile status |
| Programs | `/programs` | list, create, generate, save |
| Explore | `/explore` | trending, suggested users, search |
| Notifications | `/notifications` | list, read, delete |
| Leaderboard | `/leaderboard` | volume, sessions, likes, followers |
| Messages | `/messaging` | conversations, messages, send, unread count |
| Sync | `/sync` | push mutations, pull changes |
| Wallet | `/wallet` | pass token, Apple pass, Google pass |
| Salle | `/salle` | resolve token, current session, profile |
| Stories | `/stories` | list |

### Exemples rapides

```bash
# Health check
curl https://appli-v2.onrender.com/health

# Login
curl -X POST https://appli-v2.onrender.com/auth/demo-login

# Feed (avec auth)
TOKEN=$(curl -s -X POST https://appli-v2.onrender.com/auth/demo-login | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl "https://appli-v2.onrender.com/feed?limit=5" -H "Authorization: Bearer $TOKEN"

# Exercises
curl https://appli-v2.onrender.com/exercises

# Search
curl "https://appli-v2.onrender.com/explore/search?q=push"
```

> L'API sur Render se met en veille apres 15 min d'inactivite. Le premier appel peut prendre 30 secondes.

---

## Deploiement

### Backend (Render)

L'API tourne sur Render (gratuit). Variables d'environnement requises :

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL |
| `ENVIRONMENT` | `production` |
| `JWT_SECRET_KEY` | Cle secrete JWT |
| `EXERCISES_URL` | URL JSON exercices (optionnel) |
| `APPLE_PASS_*` | Certificats Apple Wallet (optionnel) |
| `SALLE_API_KEY` | Cle API salle (optionnel) |

### Frontend (EAS Build)

```bash
cd app
pnpm build:android         # Build Android (preview)
pnpm build:android:prod    # Build Android (production)
pnpm build:ios             # Build iOS (production)
pnpm build:all             # Build toutes plateformes
pnpm update:ota            # OTA update (sans rebuild)
```

---

## Developpement

### Lancer l'API seule

```bash
cd api
uv run uvicorn src.api.main:app --reload --port 8000
```

### Lancer l'app seule

```bash
cd app
pnpm start
```

### Reinitialiser la base de donnees

```bash
cd api
uv run python scripts/reset_db.py
uv run python scripts/seed_demo.py
```

### Seeder les donnees de demo (via API)

```bash
curl -X POST http://localhost:8000/seed/demo
curl -X POST http://localhost:8000/seed/messages
```

### Tests

```bash
cd app
pnpm test
```

---

## Troubleshooting

| Probleme | Solution |
|----------|----------|
| Port 8000 occupe | `lsof -ti:8000 \| xargs kill -9` |
| App ne se connecte pas | Verifier meme WiFi, ou utiliser `--tunnel` |
| QR code ne marche pas | `./deploy.sh --tunnel` ou http://localhost:8081 |
| Erreur pnpm | `npm install -g pnpm` |
| Erreur uv | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |

---

## Documentation

- [docs/API.md](./docs/API.md) -- Documentation complete de l'API REST (tous les endpoints, params, exemples curl)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) -- Architecture du projet (stack, modeles, flux de donnees, securite)
- [docs/Roadmap.md](./docs/Roadmap.md) -- Roadmap fonctionnelle
- [Swagger](https://appli-v2.onrender.com/docs) -- Documentation interactive de l'API

---

## Liens

- API : https://appli-v2.onrender.com
- Doc Swagger : https://appli-v2.onrender.com/docs
- GitHub : https://github.com/Arthur-destb38/appli_V3

---

Projet M2 MoSEF -- Paris 1 -- Fevrier 2026
