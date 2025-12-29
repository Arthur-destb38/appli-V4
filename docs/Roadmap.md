# 🦍 MVP Plan — Gorillax Gym  
**Objectif :** une app simple et fluide qui permet de **créer, suivre et partager ses séances**, avec des exercices issus d’un **dataset local** ou du **web**.

---

## 🗓️ Vue d’ensemble

| Semaine | Objectif principal | Livrable |
|----------|--------------------|-----------|
| 1 | Socle + flux séance | Création + suivi d’une séance fonctionnels |
| 2 | Import web + partage | App complète prête à publier (TestFlight) |

---

## 🧪 Stratégie Qualité & Tests

- **CI/CD** : pipeline pnpm/uv qui exécute lint, tests unitaires et intégration à chaque PR + branche main.
- **App (Expo)** : tests unitaires (Jest) sur hooks/utils, tests UI (React Native Testing Library) sur écrans critiques, plus un smoke E2E (Detox/Expo E2E) pour le flux “Créer → Terminer”.
- **API (FastAPI)** : tests unitaires SQLModel/services + tests d’intégration sur routes clés (pytest + HTTPX) avec base SQLite temporaire ; couverture minimale cible 70 %.
- **Contract tests & Sync** : tests de contrat pour `/sync/*`, `/share/*` afin de sécuriser les payloads (pydantic schemas + snapshots).
- **Validation hebdo** : exécution manuelle d’un parcours E2E complet et instrumentation de métriques de sync avant jalon de fin de semaine.

---

## ⚙️ Semaine 1 — Socle & Flux Séance

### Étape 0 — Cadre propre (½ journée)
**Structure :**
- `app/` (Expo React Native)
- `api/` (FastAPI)

**App :**
- Expo, TanStack Query, React Navigation, SQLite  
- ESLint + Prettier

**API :**
- FastAPI + SQLModel + SQLite  
- Ruff + mypy  
- `uv run uvicorn api.main:app --reload`

**DoD :** commandes de base OK, rien ne plante.

#### Détail de l'étape 0
But : poser un socle reproductible et cohérent entre mobile et API pour éviter des ralentissements futurs.

Sous-étapes concrètes :
- Initialiser le monorepo (ou deux dossiers séparés) avec README minimal pour `app/` et `api/`.
- Configurer ESLint + Prettier et les scripts npm/poetry pour lint / typecheck / start.
- Créer une DB SQLite initiale pour dev, et un script `seed` qui insère 15 exercices.
	- Ajouter une commande `dev` pour lancer Expo et `uv run uvicorn api.main:app --reload` en parallèle (ou documentation pour le run).

Contrat & artefacts :
- `app/` doit exposer un fichier `app.json` minimal et un script `pnpm start`.
- `api/` doit exposer `api/main.py` et un endpoint `/health`.

Critères d'acceptation (DoD détaillé) :
- `pnpm lint` et `ruff` passent sans erreurs bloquantes.
- `pnpm start` lance l'app Expo, `uv run uvicorn api.main:app --reload` démarre l'API, seed crée 15 exos.

Tests rapides :
- Lancer le seed et vérifier `SELECT COUNT(*) FROM exercise` > 0.

---

### Étape 1 — Schéma minimal (DB locale + API)
**Tables :**
- `Exercise(id, name, muscle_group, equipment, description, image_url, source_type, source_value, created_at)`
- `ExerciseAlias(id, exercise_id, name)`
- `Workout(id, title, created_at)`
- `WorkoutExercise(id, workout_id, exercise_id, order_index)`
- `WorkoutSet(id, workout_exercise_id, reps, weight, rpe, done_at)`

**DoD :** seed 15 exos de base insérés.

#### Détail de l'étape 1
But : définir un schéma simple, extensible et suffisant pour les flows d'entraînement et d'import.

Sous-étapes concrètes :
- Implémenter les modèles SQLModel/ORM pour chaque table listée.
- Ajouter migrations légères (si utilisons alembic ou un script sql simple).
- Exposer endpoints CRUD basiques : `GET /exercises`, `POST /exercises`, `GET /exercises/{id}`.
- Seed automatique pour dev + script `reset-db`.

Notes techniques :
- Migrations : utiliser Alembic pour versionner les changements de schéma (script `alembic init` + migration baseline).

Contrat DB/API :
- JSON Exercise shape : { id, name, muscle_group, equipment, description, image_url, source_type, source_value, created_at }
- Pagination simple pour `GET /exercises?page=&limit=`.

Critères d'acceptation :
- Les endpoints CRUD répondent et renvoient les champs attendus.
- Le seed crée exactement 15 exercices vérifiables.

Tests rapides :
- Appeler `GET /exercises` et vérifier la présence de 15 éléments.

---

### Jalons intermédiaires critiques (Semaine 1)
- **M0 — Socle outillé (fin Étape 0)** : CI pnpm/uv opérationnelle, commandes `pnpm start` / `uv run` validées sur poste vierge.
- **M1 — API prête pour le mobile (fin Étape 1)** : schéma versionné (Alembic), seed automatisé et tests d’intégration `/exercises` au vert pour débloquer le travail app.
- **M2 — Contrats de sync verrouillés (milieu Étape 2)** : queue offline + contrat `/sync/push`/`/sync/pull` mockés, tests de contrat ajoutés avant d’attaquer l’historique.

---

### Étape 2 — App : flux “Créer → Lancer → Terminer”
**Écrans :**
1. **Accueil** (liste des séances + bouton “Créer”)
2. **Création** (ajout d’exos depuis dataset)
3. **Suivi** (liste séries, +/– poids/rép, valider série)

**Raccourcis :**
- Appui long = série validée  
- Auto-remplir la dernière charge

**DoD :** créer une séance, saisir 5 séries, redémarrer → données intactes.

#### Détail de l'étape 2
But : permettre à l'utilisateur de composer une séance rapidement, la lancer et enregistrer les résultats sans friction.

Sous-étapes concrètes :
- Écran Création : sélectionner un titre, ajouter des exercices depuis le dataset local (search/filter).
- Écran Suivi : chronologie des exercices → pour chaque série: reps, poids, RPE, bouton `done`.
 - Persistance : écrire les Workout / WorkoutExercise / WorkoutSet dans SQLite mobile et synchroniser automatiquement (push & pull) vers l'API. Prévoir une file d'attente offline pour les pushes et une stratégie de résolution de conflit simple (MVP : last-writer-wins).
- Raccourcis : long-press pour valider, bouton `repeat last` pour pré-remplir poids.

-Contrat UI/DB :
- Local Workout payload : { id, title, created_at, exercises: [{ exercise_id, order_index, sets: [{ reps, weight, rpe, done_at }] }] }
- Sync contract (MVP) : endpoint POST `/sync/push` (client envoie changements avec timestamps), GET `/sync/pull?since=` (client récupère changements); alternative : utiliser les endpoints CRUD avec champs `updated_at`/`created_at` et logique de merge côté client.

#### Sous-sprints (Étape 2)
- **Sprint 2A — Composer la séance** : écrans Accueil/Création, stockage brouillon en SQLite, tests unitaires sur hooks `useWorkouts` et snapshot RTL pour l’écran Création.
- **Sprint 2B — Tracking & raccourcis** : interactions série (repeat last, appui long, haptique), tests UI simulant la validation d’une série, ajout de tests de contrat locaux pour la queue offline.
- **Sprint 2C — Sync & résilience** : mise en place de la file d’attente offline + adaptateurs `/sync/*`, smoke test Detox “Créer → Terminer” exécuté sur CI, instrumentation métriques (succès/échec sync).

Critères d'acceptation :
- Créer & compléter une séance de 5 séries, redémarrer l'app → les données persistées sont intactes.

Tests rapides :
- E2E minimal : créer une séance, ajouter 1 exo + 1 série, fermer et rouvrir l'app, vérifier la présence.

---

### Étape 3 — Historique simple
- Historique par date + détail séance  
- Graphique charge × reps par exercice

**DoD :** retrouver sa dernière perf en 2 clics et voir un graphe.

#### Détail de l'étape 3
But : fournir un historique consultable et une vue rapide de la progression par exercice.

Sous-étapes concrètes :
- Liste des séances triée par date avec filtre (période, exo).
- Page détail séance montrant les séries et métriques.
- Graphique simple (lib : Victory / Recharts / react-native-svg) pour afficher charge×reps sur le temps.

Contrat UI/API :
- `GET /workouts?user_id=&from=&to=` pour fetch si on synchronise.

#### Sous-sprints (Étape 3)
- **Sprint 3A — Liste & filtres offline** : implémenter l’historique trié + filtres locaux, tests unitaires sur formatage des séances et tests RTL sur états empty/loading.
- **Sprint 3B — Détail séance & duplication** : écran détail avec duplication locale, tests d’intégration pour la duplication (API mock) + tests contractuels `/workouts` (snapshot).
- **Sprint 3C — Visualisation** : intégration du graphique (Victory ou équivalent), tests de rendu (hooks calcul volume) et capture visuelle de base via storybook screenshot ou snapshot.

Critères d'acceptation :
- Ouvrir une séance depuis l'historique en ≤ 2 actions.
- Graph affiche au moins 3 points pour un exercice avec 3 séances.

Tests rapides :
- Seed 3 séances sur le même exo et vérifier que le graphe montre 3 points.

---

## 🌐 Semaine 2 — Import Web + Partage + UX

### Étape 4 — Import d’exo depuis un lien (web)
**UX :**
- Champ URL → “Importer”
- Prévisualisation (titre, image, description)
- Champs à compléter : `muscle_group`, `equipment`

**API :**
- `POST /exercises/import-url { url }`  
- `POST /exercises` (création “web” avec `source_type=url`)

**Déduplication :**
- Slug `(name + muscle_group)`  
- Si doublon → proposer “utiliser l’existant”

**DoD :** coller un lien, valider en ≤ 3 actions.

#### Détail de l'étape 4
But : permettre à l'utilisateur d'ajouter rapidement un exercice depuis une page web (YouTube, blog, exo-db).

Sous-étapes concrètes :
- Front : champ URL + bouton Import → call API `POST /exercises/import-url { url }`.
- API : parser la page (OpenGraph / schema.org) pour pull title, image, description; retourner un payload éditable.
- Front : prévisualisation et champs éditables `muscle_group`, `equipment` et `name`.
- Sauvegarde : `POST /exercises` avec `source_type=url` et `source_value` = original url.

Notes techniques :
- Stratégie MVP : parsing simple via OpenGraph / meta tags; pas de rendu headless pour l'instant (réduira le coût et la complexité).

Contrat API :
- `POST /exercises/import-url` retourne { name, description, image_url, suggested_muscle_group?, suggested_equipment? }.

#### Sous-sprints (Étape 4)
- **Sprint 4A — UI import & validations** : écran Import + états loading/error, tests RTL couvrant les cas invalid URL/timeout.
- **Sprint 4B — Service d’extraction** : implémentation `og_scraper` + tests unitaires (fixtures HTML) et tests d’intégration `/exercises/import-url` sur dataset simulé.
- **Sprint 4C — Déduplication & offline** : génération de slug, tests de contrat sur réponse `already_exists`, file d’attente locale pour imports offline + tests e2e simulés.

Critères d'acceptation :
- Importer une URL publique et obtenir une prévisualisation éditable en ≤ 3 actions.

Tests rapides :
- Utiliser une URL de test (ex : article de blog) et vérifier que l'API retourne title + image.

---

### Étape 5 — Partage & Followers
**Concept :**
- Partager = publier une **séance terminée** (snapshot JSON) visible par ses **followers**

**API :**
- `POST /share/workouts/{id}` → crée un `share_id`
- `GET /feed` → dernières séances des suivis
- `POST /follow/{user_id}`
- `GET /workouts/shared/{share_id}` → séance complète

**App :**
- Bouton “Partager” en fin de séance  
- **Feed** minimal : titre, date, nb de séries, “Dupliquer”

**DoD :** suivre un user, voir ses séances, dupliquer en 1 tap.

#### Détail de l'étape 5
But : créer un réseau minimal où les utilisateurs peuvent s'inspirer des séances des autres.

Sous-étapes concrètes :
- Auth basique (email/username) ou mode pseudo pour MVP.
- Endpoint `POST /share/workouts/{id}` qui génère un `share_id` publique.
- Feed : `GET /feed?user_id=` renvoyant les partages des follows.
- Action `duplicate` côté client qui clone la séance et l'insère dans le local DB.

Décisions prises :
- Auth MVP : pseudo-only (username) sans mot de passe pour simplifier la montée en version. On conserve un `user_id` stable localement et optionnellement lié à l'API.
- Sync : synchronisation mobile automatique vers l'API (push & pull) pour garder l'historique centralisé et permettre le feed en temps réel.
- Partage public : ajouter un champ `consent_to_public_share` sur le profil utilisateur et demander le consentement explicite lors du premier partage public.

Contrat API :
- Share object : { share_id, owner_id, workout_snapshot, created_at }

#### Sous-sprints (Étape 5)
- **Sprint 5A — Profil & consentement** : génération `user_id`, stockage consentement (`consent_to_public_share`), tests API/unitaires garantissant le blocage du partage sans accord.
- **Sprint 5B — Partage & snapshots** : endpoint `POST /share/workouts/{id}`, sérialisation snapshot, tests d’intégration pytest + vérification d’immutabilité (snapshot testing).
- **Sprint 5C — Feed & duplication** : `GET /feed`, `GET /workouts/shared/{share_id}`, tests de contrat + smoke Detox “Partager → Feed → Dupliquer” avec deux comptes simulés.

Critères d'acceptation :
- Un utilisateur peut suivre un autre utilisateur, voir ses partages et dupliquer une séance en 1 tap.

Tests rapides :
- Créer 2 users en local/dev, faire follow, partager une séance, vérifier que le follower voit la séance.

---

### Jalons intermédiaires critiques (Semaine 2)
- **M3 — Import web validé (fin Sprint 4B)** : pipeline API avec fixtures HTML au vert, couverture d’extraction ≥ 80 %, UI Import testée sur cas succès/erreur.
- **M4 — Sync & partage raccord (fin Sprint 5B)** : queue offline commune workouts/share, tests de contrat `/sync/*` + `/share/*` exécutés en CI, monitoring des latences API.
- **M5 — Pré-release freeze (avant Étape 6)** : toutes les suites de tests (unitaires, intégration, Detox) passent, backlog de bugs critiques vidé avant habillage et préparation store.

---

### Étape 6 — Habillage & micro-UX
- Thème sombre + accent rouge  
- Icônes Lucide  
- Retour haptique sur actions clés  
- États “loading / empty / error”

**DoD :** UX cohérente et fluide, aucune page brute.

#### Détail de l'étape 6
But : rendre l'app plaisante et rassurante à utiliser au quotidien.

Sous-étapes concrètes :
- Ajouter thème global (light/dark) et tokens de couleur.
- Intégrer Lucide ou react-native-vector-icons et uniformiser tailles/icônes.
- Ajouter animations légères et retours haptiques (expo-haptics).
- Couvrir les cas loading/empty/error avec composants réutilisables.

Critères d'acceptation :
- Changement de thème stable, icônes cohérentes, retours haptiques présents sur actions clés.

Tests rapides :
- Activer thème sombre et vérifier les contrastes; déclencher un loading et voir l'état.

---

### Étape 7 — Pré-release & Publication
- Tests manuels : création / suivi / partage OK  
- Splash screen, icône, bundle name  
- Privacy Policy (page Notion / GitHub Pages)  
- TestFlight (iOS) / Internal testing (Android)

**DoD :** build signé, prêt à soumettre.

#### Détail de l'étape 7
But : préparer la release pour soumission et retours utilisateurs via TestFlight / internal testing.

Sous-étapes concrètes :
- Finaliser assets (icônes, splash), config `app.json`, `bundleIdentifier` / `applicationId`.
- Préparer Privacy Policy + lien dans l'app (consentement affiché avant partage public).
- Déployer l'API FastAPI + DB en prod (URL publique) et pointer l'app dessus pour la partie réseau.
- Générer builds (TestFlight / APK), tester sur device réel, corriger crashs bloquants.
- Soumettre en TestFlight / internal track et collecter feedback.
- **Avant build** : API FastAPI + DB déployées et accessibles (URL prod) pour que le partage réseau fonctionne sur les builds distribués.

Notes légales & privacy :
- Privacy & Data sharing : avant de permettre la publication d'une séance, l'app demandera au user d'accepter la `Privacy Policy` et de confirmer `consent_to_public_share` (opt-in). Le partage public ne sera possible que si ce consentement est actif.

Décision migrations :
- Utiliser Alembic côté API pour gérer les migrations DB et éviter les régressions sur le schéma.

Critères d'acceptation :
- Build iOS/Android générés et installés sur un device, tests manuels couverts.

Tests rapides :
- Installer le build TestFlight et effectuer un parcours complet (create → share).

---
