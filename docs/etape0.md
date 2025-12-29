

### Étape 0 — Cadre propre (½ journée)

🎯 Objectif général

Cette étape sert à poser les fondations techniques du projet. On ne développe encore aucune fonctionnalité métier : le but est d’assurer que le frontend (app mobile) et le backend (API) soient opérationnels, cohérents et faciles à lancer. Cela permet de gagner du temps ensuite et d’éviter les bugs d’environnement ou les incohérences entre les deux parties du projet.

Concrètement, cette étape crée une structure claire avec deux dossiers :
	•	app/ → contiendra l’application mobile (React Native avec Expo, SQLite, navigation, etc.).
	•	api/ → contiendra le serveur FastAPI (Python) avec la base de données et les endpoints d’API.

À la fin de l’étape, les deux doivent pouvoir démarrer sans erreur.

⸻

🧱 Sous-objectifs détaillés

1. Créer la structure de base du projet

On initialise un dossier principal (gorillax-mvp/) avec deux sous-dossiers : app/ pour la partie mobile et api/ pour la partie backend. Cela permet de séparer clairement les rôles et d’éviter le mélange des codes front et back. Un petit fichier README.md est ajouté à la racine pour décrire le projet.

2. Préparer l’environnement de développement

Chaque partie doit pouvoir s’exécuter avec une simple commande :
	•	L’app Expo se lance avec `pnpm start` (depuis `app/`).
	•	L’API FastAPI se lance avec `uv run uvicorn api.main:app --reload` (depuis `api/`).

Cette organisation rend le projet reproductible : n’importe qui (toi, Codex, ou un futur collaborateur) peut cloner le repo et le lancer immédiatement sans configuration compliquée.

3. Configurer la qualité de code

On installe et configure des outils qui assurent la propreté du code :
	•	ESLint + Prettier pour le code JavaScript/TypeScript (frontend).
	•	Ruff + mypy pour le code Python (backend).

Le but est que le projet soit cohérent, lisible, et que les erreurs de syntaxe soient détectées automatiquement.

4. Créer la base de données initiale

Côté API, une base SQLite vide est créée. Un petit script de “seed” insère 15 exercices par défaut pour permettre de tester les premiers endpoints. Cela servira aussi de jeu de données pour les écrans du front.
Notes migrations :
- Alembic sera initialisé côté `api/` (`alembic init`) et une migration baseline sera créée après la définition des premiers modèles. Utiliser Alembic garantit un historique propre des évolutions de schéma.

5. Vérifier la communication entre les deux blocs

Le backend expose un endpoint /health qui renvoie { "status": "ok" }. Ce point de contrôle permet au frontend ou à un testeur de vérifier si le serveur tourne correctement. C’est une étape simple mais essentielle pour s’assurer que la connexion API est fonctionnelle.

6. Ajouter des scripts de lancement communs

On met en place des scripts à la racine du projet pour exécuter les deux services en parallèle (via `pnpm dev` par exemple). L’objectif : démarrer l’ensemble du projet en une seule commande.

⸻

✅ Critères de validation (Definition of Done)
	•	Le frontend se lance correctement avec pnpm start et affiche l’écran de base Expo.
	•	Le backend démarre sans erreur avec uv run uvicorn api.main:app --reload et répond à GET /health.
	•	Le script de seed crée bien 15 exercices dans la base SQLite.
	•	Les outils de linting (pnpm lint, ruff) ne remontent aucune erreur bloquante.

🧪 Qualité & jalon
	•	Pipeline CI initial (pnpm lint, ruff) configuré et exécuté sur chaque PR.
	•	Validation sur machine “propre” : `pnpm start` et `uv run` must run without setup manuel.
	•	Jalon M0 atteint lorsque ces checks tournent automatiquement et documentés dans README.

⸻

⚡ En résumé

Cette étape ne produit encore rien de “visible” dans l’app, mais elle garantit que :
	•	le projet est propre, cohérent, et facile à lancer,
	•	les bases du code sont solides et validées,
	•	Codex ou tout autre dev peut reprendre le projet sans rien casser.

C’est la mise en place de l’infrastructure, avant d’attaquer le vrai développement des fonctionnalités (création, suivi et partage des séances).
