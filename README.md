# Gorillax

Application mobile de fitness avec fonctionnalités sociales. L'idée : combiner le suivi d'entraînement avec un réseau social pour garder la motivation.

**Projet M2 MoSEF** — Arthur Destribats & Niama El Kamal — Paris 1, Décembre 2025

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

- Python 3.10 ou plus
- Node.js 20
- pnpm (`npm install -g pnpm` si t'as pas)
- L'app Expo Go sur ton tel

### Installation

```bash
git clone https://github.com/Arthur-destb38/appli_V3.git
cd appli_V3
./deploy.sh
```
### ou peut etre essayer 

```bash
git clone https://github.com/Arthur-destb38/appli_V3.git
cd appli_V3
chmod +x deploy.sh   # Si nécessaire
./deploy.sh
```


Le script fait tout : il installe les dépendances, lance l'API, charge les données de démo, et démarre l'app. À la fin tu scannes le QR code avec Expo Go et c'est bon. Ou alors plus simple tu cliques sur le lien : http://localhost:xxxx.

> Le tel et l'ordi doivent être sur le même WiFi si tu utilises ExpoGo.

### Options utiles

```bash
./deploy.sh --api-only   # Juste l'API
./deploy.sh --app-only   # Juste l'app (utilise l'API cloud)
./deploy.sh --tunnel     # Si le QR code marche pas, ça passe par internet
```

---

## Comment c'est construit

**Frontend** : React Native avec Expo. On utilise TypeScript pour éviter les bugs débiles. La navigation c'est Expo Router (file-based). Pour le offline, y'a une base SQLite locale qui sync avec le serveur.

**Backend** : FastAPI en Python. C'est rapide, ça génère la doc Swagger automatiquement, et c'est agréable à coder. La BDD c'est SQLite avec SQLModel comme ORM.

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

- Création de programmes (PPL, Full Body, etc.)
- Base de 130+ exercices
- Suivi des séances en temps réel (poids, reps, temps de repos)
- Historique et graphiques de progression
- Tout marche offline, ça sync quand t'as du réseau

### Côté social

- Feed avec les séances des autres
- Likes et commentaires
- Profils avec stats, bio, avatar
- Système de followers
- Classements (qui a fait le plus de volume, etc.)
- Notifications

---

## L'API

En prod : https://appli-v2.onrender.com

La doc Swagger est là : https://appli-v2.onrender.com/docs

Quelques endpoints :

```
POST /auth/register     - Créer un compte
POST /auth/login        - Se connecter
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
V2/
├── deploy.sh           # Le script qui fait tout
├── api/                # Le backend Python
│   ├── src/api/        # Code source (routes, models, etc.)
│   └── scripts/        # Scripts utilitaires
└── app/                # L'app React Native
    ├── app/            # Les écrans (Expo Router)
    └── src/            # Composants, hooks, services
```

---

## Réponse aux consignes

On devait faire une app mobile avec API. Voilà ce qu'on a fait :

- **App fonctionnelle** : Oui, y'a 20+ écrans, ça marche sur iOS/Android/Web
- **API REST** : FastAPI avec tous les endpoints documentés
- **Base de données** : SQLite côté serveur et côté client et pour les programmes, on prend une base de données sur google drive
- **Auth** : JWT tokens
- **Mode offline** : SQLite local + sync
- **Déploiement** : Script bash automatisé + API sur Render
- **Données de démo** : 10 utilisateurs fictifs avec des séances, likes, commentaires


---

## Si ça marche pas

**Port occupé** : `lsof -ti:8000 | xargs kill -9`

**L'app se connecte pas** : Vérifie que t'es sur le même WiFi

**QR code marche pas** : Essaie `./deploy.sh --tunnel`

**Erreur pnpm** : `npm install -g pnpm`

Pour relancer juste l'API :
```bash
cd api
source .venv/bin/activate
uvicorn src.api.main:app --reload --port 8000
```

Pour relancer juste l'app :
```bash
cd app
pnpm start
```

---

## Liens

- API : https://appli-v2.onrender.com
- Doc Swagger : https://appli-v2.onrender.com/docs
- GitHub : https://github.com/Arthur-destb38/appli_V3

---

Projet M2 MoSEF — Paris 1 — 2025
