# Gorillax 🦍

Application mobile de fitness avec fonctionnalités sociales. L'idée : combiner le suivi d'entraînement avec un réseau social pour garder la motivation.

**Projet M2 MoSEF** — Arthur Destribats & Niama El Kamal — Paris 1, Février 2026

---

## Le projet en bref

80% des gens abandonnent la salle après 3 mois. Pourquoi ? Pas de suivi, pas de motivation, personne pour te pousser. 

Gorillax essaie de résoudre ça en mélangeant deux trucs :
- Une app de tracking classique (séances, exercices, progression)
- Un feed social à la Instagram où tu partages tes séances

En gros, c'est un peu le Strava de la muscu.

---

## Lancer le projet

### Ce qu'il te faut

- Python 3.10+ (avec `uv` pour la gestion des dépendances)
- Node.js 20+
- pnpm (`npm install -g pnpm` si t'as pas)
- L'app Expo Go sur ton tel (ou un navigateur web)

### Installation rapide

```bash
git clone https://github.com/Arthur-destb38/appli-V4.git
cd appli_V3
chmod +x deploy.sh   # Si nécessaire
./deploy.sh
```

Le script fait tout : il installe les dépendances, lance l'API, charge les données de démo, et démarre l'app. À la fin tu scannes le QR code avec Expo Go ou tu ouvres http://localhost:8081 dans ton navigateur.

> Le tel et l'ordi doivent être sur le même WiFi si tu utilises Expo Go.

### Compte de démonstration

Pour tester rapidement sans créer de compte :
- **Username** : `demo`
- **Password** : `DemoPassword123`

Ou clique sur le bouton "🧪 Connexion Demo" sur la page de login.

### Options utiles

```bash
./deploy.sh --api-only   # Juste l'API
./deploy.sh --app-only   # Juste l'app (utilise l'API cloud)
./deploy.sh --tunnel     # Si le QR code marche pas, ça passe par internet
```

---

## Comment c'est construit

**Frontend** : React Native avec Expo. On utilise TypeScript pour éviter les bugs débiles. La navigation c'est Expo Router (file-based). Pour le offline, y'a une base SQLite locale qui sync avec le serveur.

**Backend** : FastAPI en Python. C'est rapide, ça génère la doc Swagger automatiquement. La BDD c'est SQLite avec SQLModel comme ORM.

**Déploiement** : L'API tourne sur Render (gratuit). Le code est sur GitHub. Les exercices sont chargés depuis un JSON sur Google Drive.

```
Frontend (React Native)
        ↓
    REST API
        ↓
Backend (FastAPI)
        ↓
    SQLite
```

---

## Ce que ça fait

### Côté fitness

- **Programmes personnalisés** : PPL, Full Body, Upper/Lower, etc.
- **Base de 130+ exercices** : Avec groupes musculaires, équipement, difficulté
- **Suivi en temps réel** : Poids, reps, RPE, temps de repos
- **Historique et progression** : Graphiques par exercice, volume total, PR
- **Mode offline** : Tout marche sans connexion, sync automatique

### Côté social

- **Feed** : Vois les séances de tes amis en temps réel
- **Interactions** : Likes, commentaires, partages
- **Profils** : Stats, bio, avatar, objectifs
- **Followers** : Suis tes potes ou des athlètes inspirants
- **Classements** : Volume, fréquence, séries, records
- **Notifications** : Likes, commentaires, nouveaux followers

### Authentification

- **Inscription sécurisée** : Validation email, mot de passe fort
- **Connexion** : JWT tokens avec refresh
- **Configuration du profil** : 4 étapes (bio, niveau, objectif, fréquence)
- **Mode démo** : Compte de test pré-configuré

---

## L'API

En prod : https://appli-v2.onrender.com

La doc Swagger est là : https://appli-v2.onrender.com/docs

Quelques endpoints :

```
POST /auth/register-v2  - Créer un compte (avec validation)
POST /auth/login        - Se connecter
POST /auth/logout       - Se déconnecter
GET  /auth/me           - Profil utilisateur
POST /auth/refresh      - Rafraîchir le token

GET  /exercises         - Liste des exercices
GET  /feed              - Le feed social
POST /likes/{id}        - Liker un post
GET  /profile/{id}      - Voir un profil
GET  /leaderboard/volume - Classement par volume
```

Pour tester :
```bash
curl https://appli-v2.onrender.com/health
curl "https://appli-v2.onrender.com/feed?user_id=guest-user&limit=5"
```

> L'API sur Render se met en veille après 15 min d'inactivité. Le premier appel peut prendre 30 secondes.

---

## Structure des dossiers

```
appli_V3/
├── deploy.sh           # Le script qui fait tout
├── api/                # Le backend Python
│   ├── src/api/        # Code source
│   │   ├── routes/     # Endpoints (auth, feed, users, etc.)
│   │   ├── models.py   # Modèles SQLModel
│   │   ├── services/   # Logique métier
│   │   └── utils/      # Auth, validation, rate limiting
│   ├── scripts/        # Scripts utilitaires (seed, reset, etc.)
│   └── migrations/     # Migrations Alembic
└── app/                # L'app React Native
    ├── app/            # Les écrans (Expo Router)
    │   ├── (tabs)/     # Navigation principale
    │   ├── login.tsx   # Connexion
    │   ├── register.tsx # Inscription
    │   └── profile-setup-simple.tsx # Config profil
    └── src/            
        ├── components/ # Composants réutilisables
        ├── hooks/      # useAuth, useWorkouts, etc.
        ├── services/   # API calls
        └── db/         # SQLite local + sync
```

---

## Réponse aux consignes

On devait faire une app mobile avec API. Voilà ce qu'on a fait :

- **App fonctionnelle** : 30+ écrans, fonctionne sur iOS/Android/Web
- **API REST** : FastAPI avec tous les endpoints documentés (Swagger)
- **Base de données** : SQLite côté serveur et côté client
- **Auth sécurisée** : JWT tokens, validation email, rate limiting
- **Mode offline** : SQLite local + sync automatique
- **Déploiement** : Script bash automatisé + API sur Render
- **Données de démo** : 10 utilisateurs fictifs avec séances, likes, commentaires
- **UI/UX moderne** : Thème dark/light, animations, gradients
- **Internationalisation** : FR/EN avec système de traductions

---

## Fonctionnalités avancées

### Sécurité
- Mots de passe hashés avec salt
- Rate limiting sur les endpoints sensibles
- Validation stricte des inputs
- Protection CSRF
- Tokens JWT avec expiration

### Performance
- Lazy loading des images
- Pagination du feed
- Cache des exercices
- Sync incrémentale
- Optimistic updates

### Expérience utilisateur
- Onboarding en 4 étapes
- Feedback haptique
- Animations fluides
- Mode offline transparent
- Messages d'erreur clairs

---

## Si ça marche pas

**Port occupé** : `lsof -ti:8000 | xargs kill -9`

**L'app se connecte pas** : Vérifie que t'es sur le même WiFi, ou utilise `--tunnel`

**QR code marche pas** : Essaie `./deploy.sh --tunnel` ou ouvre http://localhost:8081 dans ton navigateur

**Erreur pnpm** : `npm install -g pnpm`

**Erreur uv** : Installe uv avec `curl -LsSf https://astral.sh/uv/install.sh | sh`

Pour relancer juste l'API :
```bash
cd api
uv run uvicorn src.api.main:app --reload --port 8000
```

Pour relancer juste l'app :
```bash
cd app
pnpm start
```

Pour réinitialiser la base de données :
```bash
cd api
uv run python scripts/reset_db.py
uv run python scripts/seed_demo.py
```

---

## Liens

- API : https://appli-v2.onrender.com
- Doc Swagger : https://appli-v2.onrender.com/docs
- GitHub : https://github.com/Arthur-destb38/appli_V3

---

Projet M2 MoSEF — Paris 1 — Février 2026

