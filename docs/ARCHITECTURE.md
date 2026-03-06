# Gorillax -- Architecture du projet

## Stack technique

### Backend

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | FastAPI | 0.1.0 |
| ORM | SQLModel (SQLAlchemy) | - |
| BDD (dev) | SQLite | - |
| BDD (prod) | PostgreSQL (Render) | - |
| Auth | JWT (access + refresh tokens) | - |
| Runtime | Python 3.10+ | - |
| Package manager | uv | - |
| Hebergement | Render | - |

### Frontend

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | React Native | 0.81.5 |
| Meta-framework | Expo | ~54.0.30 |
| Navigation | Expo Router (file-based) | ~6.0.17 |
| Langage | TypeScript | ~5.9.2 |
| Stockage local | expo-sqlite | ^16.0.10 |
| Stockage securise | expo-secure-store | ^15.0.8 |
| Tests | Jest + jest-expo | 29.7.0 |
| Package manager | pnpm | - |
| Build | EAS Build (Expo Application Services) | - |

### Dependances frontend notables

- `react-native-reanimated` : animations fluides
- `react-native-gesture-handler` : gestion des gestes tactiles
- `expo-image` : chargement optimise des images
- `expo-haptics` : feedback haptique
- `expo-linear-gradient` : degrades UI
- `expo-web-browser` : ouverture de liens externes
- `@react-native-async-storage/async-storage` : stockage cle-valeur persistant

---

## Structure des dossiers

```
appli_V3-main/
|-- deploy.sh                  # Script de deploiement automatise
|-- README.md                  # Presentation du projet
|-- docs/                      # Documentation
|   |-- API.md                 # Doc API REST complete
|   |-- ARCHITECTURE.md        # Ce fichier
|   |-- Roadmap.md             # Roadmap fonctionnelle
|   `-- ...                    # Guides (EAS, tests, etc.)
|
|-- api/                       # Backend Python (FastAPI)
|   |-- pyproject.toml         # Dependances Python (uv)
|   |-- uv.lock                # Lock file
|   |-- gorillax.db            # Base SQLite locale (dev)
|   |-- migrations/            # Migrations Alembic
|   |-- scripts/               # Scripts utilitaires (seed, reset)
|   `-- src/api/
|       |-- main.py            # Point d'entree FastAPI, lifespan, routers
|       |-- db.py              # Connexion BDD, init, migrations auto
|       |-- models.py          # Modeles SQLModel (20 tables)
|       |-- schemas.py         # Schemas Pydantic (validation I/O)
|       |-- seeds.py           # Seed des exercices par defaut
|       |-- routes/            # Endpoints API (22 fichiers)
|       |   |-- auth.py        # Authentification (register, login, refresh, etc.)
|       |   |-- exercises.py   # CRUD exercices
|       |   |-- feed.py        # Feed social + follow/unfollow
|       |   |-- share.py       # Partage de seances
|       |   |-- likes.py       # Likes + commentaires
|       |   |-- profile.py     # Profils publics + follow + avatar
|       |   |-- users.py       # Gestion profil utilisateur + setup steps
|       |   |-- users_stats.py # Stats utilisateur (volume, streak, etc.)
|       |   |-- programs.py    # Programmes + generation intelligente
|       |   |-- explore.py     # Trending, suggestions, recherche
|       |   |-- notifications.py # Notifications
|       |   |-- leaderboard.py # Classements
|       |   |-- stories.py     # Stories
|       |   |-- messaging.py   # Messagerie privee
|       |   |-- sync.py        # Synchronisation offline
|       |   |-- shared_workouts.py # Detail workout partage
|       |   |-- wallet.py      # Pass Apple/Google Wallet
|       |   |-- salle.py       # API pour systeme salle (lecteur QR)
|       |   |-- health.py      # Health check
|       |   |-- seed.py        # Seed donnees demo (dev)
|       |   `-- admin.py       # Endpoints admin (dev)
|       |-- services/          # Logique metier
|       |   |-- program_generator.py  # Generation de programmes
|       |   |-- exercise_loader.py    # Import exercices depuis URL
|       |   |-- email.py              # Envoi d'emails (verification, reset)
|       |   |-- apple_pass.py         # Generation .pkpass Apple Wallet
|       |   `-- google_wallet.py      # URL Google Wallet
|       `-- utils/             # Utilitaires
|           |-- auth.py        # Hash, JWT, tokens
|           |-- dependencies.py # Dependances FastAPI (get_current_user)
|           |-- rate_limit.py  # Rate limiting
|           |-- validation.py  # Validation inputs
|           `-- slug.py        # Generation de slugs exercices
|
|-- app/                       # Frontend React Native (Expo)
|   |-- app.json               # Configuration Expo
|   |-- package.json           # Dependances Node
|   |-- tsconfig.json          # Config TypeScript
|   |-- app/                   # Ecrans (Expo Router, file-based routing)
|   |   |-- _layout.tsx        # Layout racine
|   |   |-- index.tsx          # Ecran d'accueil / redirection
|   |   |-- login.tsx          # Connexion
|   |   |-- register.tsx       # Inscription
|   |   |-- profile-setup-simple.tsx # Configuration profil (onboarding)
|   |   |-- (tabs)/            # Navigation principale (bottom tabs)
|   |   |   |-- _layout.tsx    # Layout tabs
|   |   |   |-- index.tsx      # Tab Accueil
|   |   |   |-- feed.tsx       # Tab Feed social
|   |   |   |-- explore.tsx    # Tab Explorer
|   |   |   |-- messages.tsx   # Tab Messages
|   |   |   `-- profile.tsx    # Tab Profil
|   |   |-- track/[id].tsx     # Suivi de seance en cours
|   |   |-- history/           # Historique des seances
|   |   |-- programme/         # Programmes d'entrainement
|   |   |-- profile/[id].tsx   # Profil d'un autre utilisateur
|   |   |-- messages/          # Conversations et messages
|   |   |-- shared-workout/[id].tsx # Detail workout partage
|   |   |-- notifications.tsx  # Notifications
|   |   |-- leaderboard.tsx    # Classements
|   |   |-- settings.tsx       # Parametres
|   |   |-- pass-salle.tsx     # Carte membre (pass Wallet)
|   |   `-- legal/             # CGU, Confidentialite
|   `-- src/
|       |-- components/        # Composants reutilisables
|       |-- hooks/             # Custom hooks (useAuth, useWorkouts, etc.)
|       |-- services/          # Appels API
|       `-- db/                # SQLite local + sync
|
`-- gorillax-salles/           # Projet Gorillax Salles (separe)
```

---

## Modeles de donnees

### Diagramme des tables

```
User
 |-- id (PK)
 |-- username (unique)
 |-- email (unique)
 |-- password_hash
 |-- avatar_url, bio, objective
 |-- experience_level, training_frequency, equipment_available
 |-- location, height, weight, birth_date, gender
 |-- profile_completed
 |-- email_verified, email_verification_token
 |-- reset_password_token
 |-- oauth_provider, oauth_id
 |-- last_login, login_count
 |-- created_at

Workout
 |-- id (PK)
 |-- user_id -> User.id
 |-- client_id (sync offline)
 |-- title, status (draft/completed)
 |-- started_at, ended_at, deleted_at
 |-- created_at, updated_at

Exercise
 |-- id (PK)
 |-- name, slug (unique)
 |-- category, muscle_group
 |-- equipment, instructions, video_url

WorkoutExercise
 |-- id (PK)
 |-- workout_id -> Workout.id
 |-- exercise_id -> Exercise.id
 |-- client_id, order_index, planned_sets

Set
 |-- id (PK)
 |-- workout_exercise_id -> WorkoutExercise.id
 |-- client_id, order
 |-- reps, weight, rpe, duration_seconds
 |-- completed, done_at

Program
 |-- id (PK)
 |-- user_id -> User.id
 |-- title, objective, duration_weeks

ProgramSession
 |-- id (PK)
 |-- program_id -> Program.id
 |-- day_index, title, focus, estimated_minutes

ProgramSet
 |-- id (PK)
 |-- program_session_id -> ProgramSession.id
 |-- exercise_slug, reps, weight, rpe, order_index

Share
 |-- share_id (PK)
 |-- owner_id -> User.id
 |-- workout_id -> Workout.id
 |-- workout_title, exercise_count, set_count
 |-- caption, color, image_url

Like
 |-- id (PK)
 |-- share_id -> Share.share_id
 |-- user_id -> User.id

Comment
 |-- id (PK)
 |-- share_id -> Share.share_id
 |-- user_id -> User.id
 |-- username, content

CommentLike
 |-- id (PK)
 |-- comment_id -> Comment.id
 |-- user_id -> User.id

Follower
 |-- id (PK)
 |-- follower_id -> User.id
 |-- followed_id -> User.id
 |-- (unique index on follower_id + followed_id)

Notification
 |-- id (PK)
 |-- user_id -> User.id
 |-- type (like/comment/follow/mention)
 |-- actor_id, actor_username
 |-- reference_id, message, read

Story
 |-- id (PK)
 |-- title, owner_username
 |-- media_url, link

RefreshToken
 |-- id (PK)
 |-- user_id -> User.id
 |-- token (unique), expires_at, revoked

LoginAttempt
 |-- id (PK)
 |-- username, ip_address, success

SyncEvent
 |-- id (PK)
 |-- user_id, action, entity_type
 |-- entity_id, payload

PassToken
 |-- token (PK)
 |-- user_id -> User.id
 |-- expires_at, revoked_at

SalleAuditLog
 |-- id (PK)
 |-- gym_id, endpoint, user_id

Conversation
 |-- id (PK)
 |-- participant1_id -> User.id
 |-- participant2_id -> User.id
 |-- last_message_at

Message
 |-- id (PK)
 |-- conversation_id -> Conversation.id
 |-- sender_id -> User.id
 |-- content, read_at
```

---

## Flux de donnees

### Flux d'authentification

```
                    +------------------+
                    |  App (login.tsx) |
                    +--------+---------+
                             |
                    POST /auth/login
                    {username, password}
                             |
                    +--------v---------+
                    |   FastAPI /auth   |
                    |  - rate limiting  |
                    |  - verify_password|
                    |  - create JWT     |
                    +--------+---------+
                             |
                    {access_token, refresh_token}
                             |
                    +--------v---------+
                    | expo-secure-store |
                    | (stockage local)  |
                    +------------------+
```

1. L'utilisateur saisit username + password sur `login.tsx`
2. L'app envoie `POST /auth/login` au serveur
3. Le serveur verifie le rate limiting, puis le mot de passe (bcrypt/scrypt)
4. Si valide : creation d'un access token (courte duree) + refresh token (longue duree)
5. Le refresh token est stocke en BDD (`RefreshToken`)
6. L'app stocke les deux tokens dans `expo-secure-store`
7. Chaque requete authentifiee envoie `Authorization: Bearer <access_token>`
8. Quand l'access token expire, l'app appelle `POST /auth/refresh` avec le refresh token

### Flux offline-first (sync)

```
  +------------------+       +------------------+       +------------------+
  |   App (local)    |       |   Sync Service   |       |   API Server     |
  |   SQLite local   | ----> |   POST /sync/push| ----> |   PostgreSQL     |
  |   Mutation queue  |       |   (batch)        |       |   (source of truth)|
  +------------------+       +------------------+       +------------------+
         ^                                                       |
         |                   GET /sync/pull                      |
         +------------------------------------------------------|
```

1. L'utilisateur cree/modifie un workout **localement** (SQLite via expo-sqlite)
2. Chaque modification est enregistree dans une **file de mutations** locale
3. Quand le reseau est disponible, l'app envoie `POST /sync/push` avec toutes les mutations en attente
4. Le serveur traite chaque mutation et retourne les `server_id` correspondants
5. L'app peut aussi `GET /sync/pull?since=<timestamp>` pour recuperer les changements serveur

### Flux social (feed)

```
  Complete workout -> POST /share/workouts/{id} -> Share cree en BDD
                                                        |
  GET /feed  <-- Feed construit depuis les shares des utilisateurs suivis
                  (+ likes, comments, pagination par cursor)
```

### Flux Gorillax Salles (pass Wallet)

```
  App mobile                    API Gorillax              Systeme salle
  ----------                    ------------              --------------
  GET /wallet/pass-token   -->  Cree/retourne PassToken
  GET /wallet/apple/pass   -->  Genere .pkpass (.pkpass)
  Ajout Apple Wallet
                                                          Scan QR code
                                POST /salle/resolve-token <-- (avec API Key)
                                --> {user_id, display_name}
                                GET /salle/users/{id}/current-session
                                --> Affichage sur machine
```

---

## Configuration et variables d'environnement

### Backend (`api/.env` ou variables systeme)

| Variable | Description | Defaut |
|----------|-------------|--------|
| `DATABASE_URL` | URL de connexion BDD (PostgreSQL ou SQLite) | `sqlite:///gorillax.db` |
| `ENVIRONMENT` | `production` ou autre | - |
| `CORS_ORIGINS` | Origines CORS autorisees (virgule) | `*` |
| `EXERCISES_URL` | URL JSON des exercices (Google Drive) | - |
| `JWT_SECRET_KEY` | Cle secrete pour les JWT | - |
| `APPLE_PASS_*` | Certificats Apple Wallet (PEM) | - |
| `GOOGLE_WALLET_ISSUER_ID` | ID emetteur Google Wallet | - |
| `SALLE_API_KEY` | Cle API pour le systeme salle | - |
| `SALLE_RATE_LIMIT_PER_MINUTE` | Rate limit salle | `100` |
| `SALLE_CACHE_TTL_SECONDS` | TTL cache salle | `120` |

### Frontend (`app/.env`)

| Variable | Description | Defaut |
|----------|-------------|--------|
| `EXPO_PUBLIC_API_URL` | URL de l'API | `https://appli-v2.onrender.com` (app.json) |

---

## Deploiement

### Backend (Render)

- Heberge sur Render (plan gratuit)
- URL : `https://appli-v2.onrender.com`
- Auto-deploy depuis GitHub
- Base PostgreSQL en production
- Mise en veille apres 15 min d'inactivite

### Frontend (Expo / EAS)

- Build via EAS Build : `pnpm build:android`, `pnpm build:ios`
- OTA updates : `pnpm update:ota`
- En dev : Expo Go (scan QR code)
- Bundle ID : `com.gorillax.gym`
- Scheme URL : `gorillax://`

---

## Securite

- **Mots de passe** : hashes avec salt (bcrypt/scrypt via `hash_password`)
- **JWT** : access tokens courte duree + refresh tokens longue duree en BDD
- **Rate limiting** : sur login (par username + IP), sur API salle (global)
- **Validation** : schemas Pydantic stricts (email, password, username)
- **CORS** : restreint en production (`gorillax.app`, `appli-v2.onrender.com`)
- **RLS** : Row-Level Security sur PostgreSQL via `set_config('app.current_user_id', ...)`
- **Audit** : `SalleAuditLog` pour les appels API salle
- **Protection enumeration** : reset password retourne toujours le meme message
