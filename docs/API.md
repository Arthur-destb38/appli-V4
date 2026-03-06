# Gorillax API -- Documentation complete

**Base URL** : `https://appli-v2.onrender.com`
**Documentation Swagger** : `https://appli-v2.onrender.com/docs`
**Version** : 0.1.0

> L'API sur Render se met en veille apres 15 min d'inactivite. Le premier appel peut prendre ~30 secondes.

---

## Authentification

L'API utilise des **JWT tokens** (Bearer). Deux types de tokens :

- **Access token** : courte duree, envoye dans le header `Authorization: Bearer <token>`
- **Refresh token** : longue duree, utilise pour obtenir un nouveau access token

La plupart des endpoints proteges utilisent le header :
```
Authorization: Bearer <access_token>
```

---

## Meta

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | Non | Metadata API (status: running) |
| GET | `/health` | Non | Health check |

```bash
curl https://appli-v2.onrender.com/health
# {"status":"ok"}
```

---

## Auth (`/auth`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/auth/register` | Non | Creer un compte (avec validation email) |
| POST | `/auth/register-v2` | Non | Creer un compte (V2, meme logique) |
| POST | `/auth/login` | Non | Se connecter (retourne access + refresh token) |
| POST | `/auth/demo-login` | Non | Connexion au compte demo sans credentials |
| POST | `/auth/refresh` | Bearer (refresh) | Rafraichir les tokens |
| GET | `/auth/me` | Bearer | Profil de l'utilisateur connecte |
| POST | `/auth/verify-email` | Non | Verifier l'email avec un token |
| POST | `/auth/resend-verification` | Bearer | Renvoyer l'email de verification |
| POST | `/auth/reset-password` | Non | Demander un reset de mot de passe |
| POST | `/auth/reset-password-confirm` | Non | Confirmer le reset avec token + nouveau mot de passe |
| POST | `/auth/logout` | Bearer (refresh) | Revoquer le refresh token |

### POST `/auth/register-v2`

**Body** :
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "MyPassword123"
}
```

**Reponse** `201` :
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Erreurs** : `400` (validation), `409` (username_taken, email_taken)

**Regles mot de passe** : min 8 caracteres, 1 minuscule, 1 majuscule, 1 chiffre, pas de mots de passe courants.

```bash
curl -X POST https://appli-v2.onrender.com/auth/register-v2 \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"MyPassword123"}'
```

### POST `/auth/login`

**Body** :
```json
{
  "username": "john_doe",
  "password": "MyPassword123"
}
```

**Reponse** `200` : `TokenPair` (access_token, refresh_token, token_type)

**Erreurs** : `401` (invalid_credentials), `429` (too_many_attempts -- rate limiting)

```bash
curl -X POST https://appli-v2.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"DemoPassword123"}'
```

### POST `/auth/demo-login`

Aucun body requis. Retourne des tokens pour le compte demo.

```bash
curl -X POST https://appli-v2.onrender.com/auth/demo-login
```

### GET `/auth/me`

```bash
curl https://appli-v2.onrender.com/auth/me \
  -H "Authorization: Bearer <access_token>"
```

**Reponse** `200` :
```json
{
  "id": "demo",
  "username": "demo",
  "email": "demo@gorillax.local",
  "created_at": "2026-02-01T00:00:00",
  "consent_to_public_share": true,
  "avatar_url": null,
  "bio": "Compte de demonstration",
  "objective": "Decouvrir Gorillax",
  "email_verified": true,
  "experience_level": null,
  "training_frequency": null,
  "equipment_available": null,
  "location": null,
  "height": null,
  "weight": null,
  "birth_date": null,
  "gender": null,
  "profile_completed": false
}
```

### POST `/auth/refresh`

Header : `Authorization: Bearer <refresh_token>`

```bash
curl -X POST https://appli-v2.onrender.com/auth/refresh \
  -H "Authorization: Bearer <refresh_token>"
```

### POST `/auth/logout`

Header : `Authorization: Bearer <refresh_token>`

Reponse : `204 No Content`

---

## Exercises (`/exercises`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/exercises` | Non | Liste tous les exercices |
| GET | `/exercises/{exercise_id}` | Non | Detail d'un exercice |
| POST | `/exercises` | Bearer | Creer un exercice |
| POST | `/exercises/bulk` | Bearer | Creer plusieurs exercices |
| POST | `/exercises/import` | Bearer | Importer depuis une URL (Google Drive, JSON) |

### GET `/exercises`

```bash
curl https://appli-v2.onrender.com/exercises
```

**Reponse** `200` : Liste de `ExerciseRead`
```json
[
  {
    "id": "abc123",
    "name": "Bench Press",
    "muscle_group": "pectorals",
    "equipment": "barbell",
    "description": "...",
    "image_url": null,
    "source_type": "local",
    "source_value": null,
    "created_at": null
  }
]
```

### POST `/exercises/import`

**Body** :
```json
{
  "url": "https://drive.google.com/...",
  "force": false
}
```

```bash
curl -X POST https://appli-v2.onrender.com/exercises/import \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/exercises.json","force":false}'
```

---

## Feed (`/feed`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/feed` | Bearer | Feed social (posts des utilisateurs suivis + les siens) |
| POST | `/feed/follow/{followed_id}` | Bearer | Suivre un utilisateur |
| DELETE | `/feed/follow/{followed_id}` | Bearer | Ne plus suivre un utilisateur |

### GET `/feed`

**Query params** :
- `limit` (int, 1-50, default 10)
- `cursor` (string ISO 8601, pagination)

```bash
curl "https://appli-v2.onrender.com/feed?limit=5" \
  -H "Authorization: Bearer <token>"
```

**Reponse** `200` :
```json
{
  "items": [
    {
      "share_id": "sh_abc123",
      "owner_id": "user1",
      "owner_username": "FitGirl_Marie",
      "workout_title": "Push Day",
      "exercise_count": 4,
      "set_count": 15,
      "caption": "Super seance !",
      "color": null,
      "image_url": null,
      "created_at": "2026-03-06T10:00:00",
      "like_count": 5,
      "comment_count": 2,
      "comments": [
        {"id": "c1", "username": "Tom", "content": "GG !"}
      ]
    }
  ],
  "next_cursor": "2026-03-05T10:00:00"
}
```

---

## Likes & Comments (`/likes`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/likes/{share_id}` | Bearer | Toggle like sur un share |
| GET | `/likes/{share_id}/status` | Bearer | Statut de like pour l'utilisateur connecte |
| GET | `/likes/{share_id}/count` | Non | Nombre de likes d'un share |
| POST | `/likes/{share_id}/comments` | Bearer | Ajouter un commentaire |
| GET | `/likes/{share_id}/comments` | Non | Liste des commentaires (limit=20) |
| DELETE | `/likes/{share_id}/comments/{comment_id}` | Bearer | Supprimer un commentaire (auteur only) |
| POST | `/likes/comment/{comment_id}/like` | Bearer | Toggle like sur un commentaire |
| GET | `/likes/comment/{comment_id}/like` | Bearer | Statut de like d'un commentaire |

### POST `/likes/{share_id}`

**Body** :
```json
{"user_id": "user1"}
```

**Reponse** `200` :
```json
{"liked": true, "like_count": 6}
```

```bash
curl -X POST https://appli-v2.onrender.com/likes/sh_abc123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user1"}'
```

### POST `/likes/{share_id}/comments`

**Body** :
```json
{"user_id": "user1", "content": "Super seance !"}
```

---

## Share (`/share`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/share/workouts/{workout_id}` | Bearer | Partager un workout sur le feed |

### POST `/share/workouts/{workout_id}`

**Body** :
```json
{
  "user_id": "user1",
  "caption": "Belle seance aujourd'hui !",
  "color": "#FF5733",
  "image_base64": "data:image/jpeg;base64,..."
}
```

**Reponse** `201` : `ShareResponse`

```bash
curl -X POST https://appli-v2.onrender.com/share/workouts/workout-123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user1","caption":"Push day termine !"}'
```

---

## Shared Workouts (`/workouts/shared`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/workouts/shared/{share_id}` | Non | Detail d'un workout partage (snapshot exercices + sets) |

```bash
curl https://appli-v2.onrender.com/workouts/shared/sh_abc123
```

---

## Profile (`/profile`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/profile/{user_id}` | Non | Profil complet (stats, followers, posts, etc.) |
| PUT | `/profile/{user_id}` | Bearer | Mettre a jour son profil (bio, avatar, objective) |
| GET | `/profile/{user_id}/posts` | Non | Posts d'un utilisateur |
| POST | `/profile/{user_id}/follow` | Bearer | Suivre un utilisateur (+ notification) |
| DELETE | `/profile/{user_id}/follow` | Bearer | Ne plus suivre |
| GET | `/profile/{user_id}/followers` | Non | Liste des followers |
| GET | `/profile/{user_id}/following` | Non | Liste des following |
| POST | `/profile/{user_id}/avatar` | Bearer | Upload avatar (base64) |
| DELETE | `/profile/{user_id}/avatar` | Bearer | Supprimer l'avatar |

### GET `/profile/{user_id}`

**Query params** : `current_user_id` (optionnel, pour savoir si on suit ce profil)

```bash
curl "https://appli-v2.onrender.com/profile/demo?current_user_id=user1"
```

**Reponse** `200` :
```json
{
  "id": "demo",
  "username": "demo",
  "avatar_url": null,
  "bio": "Compte demo",
  "objective": "Decouvrir",
  "posts_count": 5,
  "followers_count": 12,
  "following_count": 3,
  "total_likes": 45,
  "is_following": false,
  "is_own_profile": false,
  "created_at": "2026-02-01T00:00:00"
}
```

---

## Users (`/users`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/users/profile` | Bearer | Creer/mettre a jour le profil |
| GET | `/users/profile/status` | Bearer | Statut de completion du profil |
| GET | `/users/profile/{user_id}` | Non | Profil utilisateur (format leger) |
| PUT | `/users/profile/{user_id}` | Bearer | Mettre a jour le profil (username, bio, avatar, objective) |
| POST | `/users/profile/setup/step1` | Bearer | Setup profil - etape 1 (infos de base) |
| POST | `/users/profile/setup/step2` | Bearer | Setup profil - etape 2 (objectifs fitness) |
| POST | `/users/profile/setup/step3` | Bearer | Setup profil - etape 3 (preferences, marque profil complet) |
| POST | `/users/profile/complete` | Bearer | Setup profil en une seule requete |

### POST `/users/profile/complete`

**Body** :
```json
{
  "bio": "Passione de fitness",
  "location": "Paris",
  "height": 180,
  "weight": 75.5,
  "gender": "male",
  "objective": "muscle_gain",
  "experience_level": "intermediate",
  "training_frequency": 4,
  "equipment_available": ["Halteres", "Barre olympique"],
  "consent_to_public_share": true
}
```

---

## Users Stats (`/users`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/users/{user_id}/stats` | Non | Stats completes (volume, sessions, streak, progression) |
| GET | `/users/{user_id}/stats/summary` | Non | Stats simplifiees (pour affichage rapide) |

```bash
curl https://appli-v2.onrender.com/users/demo/stats
```

---

## Programs (`/programs`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/programs` | Bearer | Liste des programmes de l'utilisateur |
| POST | `/programs` | Bearer | Creer un programme avec sessions/sets |
| GET | `/programs/{program_id}` | Bearer | Detail d'un programme |
| POST | `/programs/generate` | Bearer | Generer un programme intelligent (basé sur le profil) |
| POST | `/programs/{program_id}/save` | Bearer | Sauvegarder (creer les workouts associes) |

### POST `/programs/generate`

**Body** :
```json
{
  "title": "Mon programme",
  "objective": "Hypertrophie",
  "duration_weeks": 4,
  "frequency": 4,
  "exercises_per_session": 5,
  "niveau": "Intermediaire",
  "methode_preferee": "ppl"
}
```

```bash
curl -X POST https://appli-v2.onrender.com/programs/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"PPL 4 semaines","frequency":4,"duration_weeks":4}'
```

---

## Explore (`/explore`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/explore` | Optionnel | Page Explore (trending + suggestions) |
| GET | `/explore/trending` | Non | Posts les plus populaires (par likes) |
| GET | `/explore/suggested-users` | Optionnel | Suggestions d'utilisateurs a suivre |
| GET | `/explore/search` | Non | Recherche utilisateurs et posts |

### GET `/explore/search`

**Query params** :
- `q` (string, requis) : terme de recherche
- `limit` (int, 1-50, default 20)

```bash
curl "https://appli-v2.onrender.com/explore/search?q=push+day&limit=10"
```

---

## Notifications (`/notifications`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/notifications` | Bearer | Liste des notifications (limit=50) |
| POST | `/notifications/read-all` | Bearer | Marquer toutes les notifications comme lues |
| POST | `/notifications/{notification_id}/read` | Bearer | Marquer une notification comme lue |
| DELETE | `/notifications/{notification_id}` | Bearer | Supprimer une notification |

```bash
curl https://appli-v2.onrender.com/notifications \
  -H "Authorization: Bearer <token>"
```

**Reponse** `200` :
```json
{
  "notifications": [
    {
      "id": "n1",
      "type": "like",
      "actor_id": "user2",
      "actor_username": "FitGirl_Marie",
      "reference_id": "sh_abc123",
      "message": "FitGirl_Marie a aime ta seance",
      "read": false,
      "created_at": "2026-03-06T10:00:00"
    }
  ],
  "unread_count": 3
}
```

---

## Leaderboard (`/leaderboard`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/leaderboard/volume` | Non | Classement par volume total (kg x reps) |
| GET | `/leaderboard/sessions` | Non | Classement par nombre de seances |
| GET | `/leaderboard/likes` | Non | Classement par likes recus |
| GET | `/leaderboard/followers` | Non | Classement par nombre de followers |

**Query params communs** :
- `period` : `week`, `month`, `all` (default `week`) -- volume et sessions uniquement
- `current_user_id` (optionnel) : pour recuperer son propre rang
- `limit` (int, 1-100, default 20)

```bash
curl "https://appli-v2.onrender.com/leaderboard/volume?period=week&limit=10"
```

---

## Stories (`/stories`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/stories` | Non | Liste des stories (limit=10) |

```bash
curl https://appli-v2.onrender.com/stories
```

---

## Messaging (`/messaging`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/messaging/conversations` | Bearer | Liste des conversations |
| POST | `/messaging/conversations` | Bearer | Creer ou recuperer une conversation |
| GET | `/messaging/conversations/{id}/messages` | Bearer | Messages d'une conversation |
| POST | `/messaging/conversations/{id}/messages` | Bearer | Envoyer un message |
| POST | `/messaging/conversations/{id}/read` | Bearer | Marquer les messages comme lus |
| DELETE | `/messaging/conversations/{id}` | Bearer | Supprimer une conversation |
| GET | `/messaging/unread-count` | Bearer | Nombre total de messages non lus |
| POST | `/messaging/send` | Bearer | Envoyer un message direct (cree la conversation si besoin) |

### POST `/messaging/send`

**Body** :
```json
{
  "recipient_id": "user2",
  "content": "Salut, belle seance !"
}
```

```bash
curl -X POST https://appli-v2.onrender.com/messaging/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"recipient_id":"user2","content":"Hey !"}'
```

### POST `/messaging/conversations`

**Body** :
```json
{"participant_id": "user2"}
```

### POST `/messaging/conversations/{id}/messages`

**Body** :
```json
{"content": "Salut !"}
```

---

## Sync (`/sync`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/sync/push` | Bearer | Pousser des mutations (offline-first) |
| GET | `/sync/pull` | Bearer | Recuperer les changements depuis un timestamp |

### POST `/sync/push`

**Body** :
```json
{
  "mutations": [
    {
      "queue_id": 1,
      "action": "create-workout",
      "payload": {
        "client_id": "local-123",
        "title": "Push Day",
        "status": "draft"
      },
      "created_at": 1709712000000
    }
  ]
}
```

**Actions supportees** :
- `create-workout`, `update-title`, `complete-workout`, `delete-workout`
- `add-exercise`, `update-exercise-plan`, `remove-exercise`
- `add-set`, `update-set`, `remove-set`

### GET `/sync/pull`

**Query params** :
- `since` (int, timestamp ms, default 0)

```bash
curl "https://appli-v2.onrender.com/sync/pull?since=0" \
  -H "Authorization: Bearer <token>"
```

---

## Wallet (`/wallet`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/wallet/pass-token` | Bearer | Obtenir le token pass actif (ou en creer un) |
| POST | `/wallet/pass-token/renew` | Bearer | Revoquer l'ancien token et en creer un nouveau |
| GET | `/wallet/apple/pass` | Bearer (header ou query) | Telecharger le fichier .pkpass (Apple Wallet) |
| GET | `/wallet/google/pass` | Bearer | URL "Add to Google Wallet" |

### GET `/wallet/apple/pass`

Retourne un fichier `.pkpass` (content-type `application/vnd.apple.pkpass`).

```bash
curl https://appli-v2.onrender.com/wallet/apple/pass \
  -H "Authorization: Bearer <token>" \
  -o gorillax.pkpass
```

**Erreur** `503` : certificats Apple non configures.

---

## Salle (`/salle`)

API consommee par le systeme salle (lecteur QR -> backend salle -> Gorillax).

**Authentification** : `X-API-Key` ou `Authorization: Bearer` avec la cle salle (`SALLE_API_KEY`).

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/salle/resolve-token` | API Key | Resoudre un token pass (QR code) -> identite utilisateur |
| GET | `/salle/users/{user_id}/current-session` | API Key | Seance en cours (pour affichage machine) |
| GET | `/salle/users/{user_id}/profile` | API Key | Profil public (pseudo, objectifs) |

### POST `/salle/resolve-token`

**Body** :
```json
{
  "token": "uuid-du-pass",
  "gym_id": "gym-paris-01"
}
```

**Reponse** `200` :
```json
{
  "user_id": "user1",
  "status": "active",
  "display_name": "john_doe"
}
```

**Erreurs** : `404` (token_unknown, token_revoked), `410` (token_expired)

```bash
curl -X POST https://appli-v2.onrender.com/salle/resolve-token \
  -H "X-API-Key: <SALLE_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"token":"uuid-pass","gym_id":"gym-01"}'
```

---

## Seed (dev uniquement)

> Ces endpoints ne sont disponibles qu'en mode developpement (`ENVIRONMENT != production`).

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/seed/demo` | Non | Creer les donnees de demo (users, workouts, likes, comments, etc.) |
| POST | `/seed/messages` | Non | Creer des conversations de demo |

### POST `/seed/demo`

```bash
curl -X POST https://appli-v2.onrender.com/seed/demo
```

---

## Admin (dev uniquement)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/admin/users` | Non | Liste tous les utilisateurs |
| POST | `/admin/create-demo-users` | Non | Creer les comptes demo et arthur |
| GET | `/admin/debug/schema` | Non | Debug : schema de la base |
| POST | `/admin/debug/test-login` | Non | Debug : tester le login demo |
| POST | `/admin/debug/full-login-test` | Non | Debug : tester le flow complet de login |

---

## Codes d'erreur communs

| Code | Detail | Description |
|------|--------|-------------|
| 400 | Divers | Requete invalide (validation) |
| 401 | `invalid_credentials` | Identifiants incorrects |
| 401 | `missing_token` / `invalid_token` / `token_expired` | Probleme d'authentification |
| 403 | `not_authorized` / `access_denied` | Action non autorisee |
| 404 | `user_not_found` / `share_not_found` / etc. | Ressource introuvable |
| 409 | `username_taken` / `email_taken` | Conflit (doublon) |
| 429 | `too_many_attempts` | Rate limiting |
| 503 | Divers | Service non configure (Wallet, etc.) |
