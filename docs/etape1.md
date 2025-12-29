


### Étape 1 — Schéma minimal (DB locale + API)

🎯 Objectif général

Cette étape vise à concevoir la base de données et les premières routes API qui serviront de fondation pour tout le reste du projet. L’idée est de structurer les tables, d’assurer la cohérence des relations entre elles et de pouvoir interagir avec ces données via quelques endpoints simples. Cela permet de valider que le backend est prêt à stocker et restituer des données réelles.

Le schéma doit être simple mais extensible, afin de couvrir deux besoins clés :
	1.	le suivi d’entraînement (workouts, séries, répétitions, charges),
	2.	l’importation et la gestion d’exercices (dataset local et web).

⸻

🧱 Structure des données à mettre en place

Table	Description	Champs principaux
Exercise	Répertorie tous les exercices disponibles (locaux ou web).	id, name, muscle_group, equipment, description, image_url, source_type, source_value, created_at
ExerciseAlias	Gère les synonymes d’un même exercice (ex. « développé couché » = « bench press »).	id, exercise_id, name
Workout	Représente une séance d’entraînement complète.	id, title, created_at
WorkoutExercise	Lie une séance à ses exercices, dans un ordre précis.	id, workout_id, exercise_id, order_index
WorkoutSet	Enregistre les séries effectuées (répétitions, poids, ressenti).	id, workout_exercise_id, reps, weight, rpe, done_at

L’ensemble permet de relier un exercice à une séance, puis à des séries précises, tout en conservant la possibilité d’ajouter facilement de nouveaux champs ou d’étendre le modèle plus tard.

⸻

⚙️ Sous-étapes concrètes

1. Implémenter les modèles SQLModel

Chaque table doit être définie sous forme de modèle SQLModel (le module ORM de FastAPI). Ces modèles assurent à la fois :
	•	la création automatique des tables SQLite via metadata.create_all() ;
	•	la validation des données (grâce à Pydantic) ;
	•	la cohérence entre les objets Python et les enregistrements en base.

2. Créer la base initiale et le script de seed

On génère une première base SQLite avec :
	•	15 exercices insérés par défaut (dataset de départ pour les tests et le front) ;
	•	un petit script seed.py qui permet de la régénérer à tout moment ;
	•	un script reset-db qui vide et recrée la base proprement (utile pendant le dev).

3. Mettre en place les routes CRUD (API)

Les premières routes doivent permettre de :
	•	Lister tous les exercices (GET /exercises),
	•	Créer un nouvel exercice (POST /exercises),
	•	Récupérer un exercice précis (GET /exercises/{id}).

L’objectif n’est pas encore de gérer les workouts complets, mais simplement de valider que la lecture et l’écriture fonctionnent côté API.

4. Gérer les migrations

Pour garder une trace des changements de schéma, on ajoute Alembic, un outil de migration :
	•	initialisation avec alembic init migrations ;
	•	création d’une première version (alembic revision --autogenerate -m 'baseline').

Même si le projet reste léger, ce réflexe évite de casser la base lorsque le modèle évoluera plus tard (notamment à partir des étapes 4 et 5).

⸻

🧩 Notes techniques
	•	Chaque modèle aura un champ created_at (type datetime) pour suivre les ajouts.
	•	Les champs slug (basés sur name + muscle_group) peuvent être ajoutés plus tard pour éviter les doublons d’exercices.
	•	Les relations (ForeignKey) doivent être explicites entre Workout → WorkoutExercise → WorkoutSet.

⸻

✅ Critères de validation (Definition of Done)
	•	Les modèles SQLModel sont définis et la base SQLite se crée sans erreur.
	•	Le script seed insère exactement 15 exercices vérifiables dans la table exercise.
	•	Les endpoints /exercises, /exercises/{id} et POST /exercises répondent correctement.
	•	Les outils de lint et de typage (ruff, mypy) passent sans erreur critique.

🧪 Qualité & jalon
	•	Tests d’intégration pytest (HTTPX) couvrant GET/POST /exercises et validation du seed.
	•	Couverture minimale 70 % sur le module API avant de passer à l’étape 2.
	•	Jalon M1 : migration Alembic baseline + seed automatisé + suite de tests intégrée à la CI.

⸻

🔍 Tests rapides à effectuer
	1.	Lancer le seed puis exécuter : SELECT COUNT(*) FROM exercise; → résultat attendu : 15.
	2.	Appeler GET /exercises → retour JSON contenant la liste des exercices.
	3.	Tester POST /exercises avec un nouvel exo → vérifier qu’il est bien inséré.
	4.	Appeler GET /exercises/{id} sur un id connu → le JSON retourné correspond bien à la base.

⸻

⚡ En résumé

Cette étape transforme ton backend d’une simple structure vide en une API fonctionnelle avec une vraie base de données.
Tu peux désormais :
	•	manipuler des données réelles,
	•	tester les flux d’ajout et de lecture,
	•	et offrir au frontend un premier point d’accès concret (la liste des exercices).

C’est la colonne vertébrale du projet, sur laquelle toutes les prochaines étapes (création de séances, historique, partage) vont s’appuyer.
