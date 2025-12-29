


### Étape 5 — Partage & Followers



🎯 Objectif général

Introduire une dimension sociale au projet : permettre aux utilisateurs de partager leurs séances terminées et de suivre d’autres utilisateurs pour s’inspirer. L’idée est de garder un modèle simple : chaque partage est une copie statique (snapshot) d’une séance, sans synchronisation complexe entre utilisateurs. Cela évite les dépendances en temps réel et garde le système léger.

En un mot : inspiration, pas interaction. On s’inspire d’une séance, on la duplique, on repart s’entraîner.

⸻

🧩 Concept général

Philosophie MVP
	•	Partager = rendre publique une séance terminée, sous forme d’un JSON figé (snapshot).
	•	Feed = un fil simple listant les séances partagées par les comptes suivis.
	•	Follow = suivre un pseudo pour voir ses séances dans son feed.

Aucune messagerie, commentaire ou notation dans le MVP : uniquement un système d’abonnement inspirant et non intrusif.

⸻

⚙️ Côté API — structure minimale

Endpoints principaux
	•	POST /share/workouts/{id} → crée un objet partagé (retourne share_id unique et opaque)
	•	GET /feed → renvoie les dernières séances partagées par les utilisateurs suivis
	•	POST /follow/{user_id} → suit un autre utilisateur (relation many-to-many locale)
	•	GET /workouts/shared/{share_id} → récupère une séance partagée complète (snapshot JSON)

Format du partage (snapshot)

Chaque séance partagée est stockée sous forme d’objet JSON indépendant :

{
  "share_id": "sh_a12b3c4",
  "owner_id": 42,
  "owner_name": "arthur",
  "created_at": "2025-10-28T09:30:00Z",
  "workout_snapshot": {
    "title": "Pecs/Triceps",
    "exercises": [
      {"name": "Développé couché", "sets": [{"reps": 8, "weight": 60}]}
    ]
  }
}

Avantage : aucun risque de cassure si le créateur modifie sa séance après coup. Le snapshot garde la trace complète du contexte d’origine.

Authentification simplifiée (MVP)
	•	Mode pseudo uniquement, sans mot de passe.
	•	Un user_id local stable est généré (UUID) et optionnellement synchronisé côté API.
	•	Possibilité de migrer plus tard vers un vrai système d’auth classique (email/password ou OAuth).

Consentement & confidentialité
	•	Premier partage = affichage d’une fenêtre de consentement :
“J’accepte que mes séances partagées soient visibles publiquement.”
	•	Ajout du champ consent_to_public_share au profil utilisateur.
	•	Aucun partage public possible sans consentement actif.

Synchronisation
	•	Lorsqu’une séance est terminée et que l’utilisateur clique sur Partager, l’app :
	1.	Crée un snapshot JSON localement.
	2.	L’envoie via POST /share/workouts/{id}.
	3.	L’API le stocke en base avec un champ created_at.
	•	Le feed est ensuite alimenté par GET /feed → trié par date de partage.

⸻

🎨 Côté app — UX / UI

1) Partage d’une séance
	•	Bouton « Partager » disponible uniquement sur une séance terminée.
	•	En appuyant :
	•	Message de confirmation + toast « Partagé avec ta communauté ».
	•	Si c’est le premier partage → affichage du consentement obligatoire.

2) Feed minimaliste
	•	But : inspirer, pas distraire.
	•	Chaque carte contient :
	•	Pseudo du créateur
	•	Titre de la séance
	•	Date
	•	Nombre total de séries / exos
	•	Bouton « Dupliquer » pour copier la séance dans sa propre base locale.

3) Duplication d’une séance
	•	En tapant « Dupliquer », l’app :
	•	Télécharge le snapshot via GET /workouts/shared/{share_id}.
	•	Le transforme en nouvelle séance locale (brouillon).
	•	Redirige l’utilisateur vers l’écran de suivi pour qu’il la réalise.

4) Gestion des abonnements
	•	Section simple « Mes abonnements » listant les pseudos suivis.
	•	Bouton « Suivre » visible sur les cartes de partage.
	•	Aucun système d’approbation ou de message (MVP = open follow).

⸻

🔗 Modèle de données simplifié

Table	Champs clés	Description
User	id, username, consent_to_public_share	profil minimal
Follower	follower_id, followed_id	relations de suivi
Share	share_id, owner_id, workout_snapshot, created_at	snapshots partagés

Les snapshots sont stockés en JSON, indépendants des workouts originaux.

⸻

🗓️ Sous-sprints recommandés

**Sprint 5A — Profil & consentement**
	•	Gérer la génération `user_id`, le stockage du consentement et le blocage des partages sans opt-in.
	•	Tests : unitaires sur la persistance du consentement, intégration API garantissant le refus sans accord.

**Sprint 5B — Partage & snapshots**
	•	Implémenter `POST /share/workouts/{id}`, sérialiser les snapshots immuables et gérer la queue offline.
	•	Tests : pytest d’intégration (snapshot JSON), tests de contrat sur la structure partagée, vérification de la file offline.

**Sprint 5C — Feed & duplication**
	•	Construire le feed, suivre/dé-suivre et dupliquer une séance partagée.
	•	Tests : contrat `/feed` & `/workouts/shared/{share_id}`, smoke Detox “Partager → Feed → Dupliquer” avec deux comptes.

⸻

✅ Definition of Done (DoD)
	•	Un utilisateur peut partager une séance terminée → création d’un share_id unique.
	•	Un autre utilisateur peut suivre ce profil et voir la séance dans son feed.
	•	Depuis le feed, il peut dupliquer cette séance en 1 tap → apparition immédiate dans sa DB locale.
	•	Aucun partage public n’est possible sans consentement explicite.
	•	Les endpoints POST /share/workouts/{id} et GET /feed répondent correctement.
	•	Les snapshots sont indépendants et persistés en base (vérifiable).
	•	Jalon M4 atteint : suites de tests (unit, intégration, Detox) au vert, queue offline commune workouts/share observée en CI.

⸻

🔍 Tests rapides
	1.	Créer 2 utilisateurs (Arthur et Julien) en local/dev.
	2.	Arthur termine une séance et clique Partager → share_id généré.
	3.	Julien suit Arthur via POST /follow/{user_id}.
	4.	Julien rafraîchit son feed → la séance apparaît.
	5.	Julien clique « Dupliquer » → la séance est importée en local et visible dans son écran d’accueil.
	6.	Déconnexion / reconnexion → le feed se recharge sans erreur.

⸻

⚠️ Points d’attention
	•	Respecter le consentement : aucun partage sans accord explicite.
	•	Pas de temps réel : pas besoin de sockets ni notifications push au MVP.
	•	Snapshots isolés : un partage reste statique, pas synchronisé avec l’original.
	•	Feed limité : pagination côté API (10–20 éléments max par requête).
	•	Nom d’utilisateur unique pour éviter la confusion dans le feed.

⸻

💡 Résumé opérationnel
	•	Cette étape introduit une dimension communautaire simple et inspirante.
	•	L’utilisateur peut découvrir, suivre et dupliquer des séances sans friction.
	•	Le système reste offline-friendly (les partages s’envoient en file d’attente si pas de réseau).
	•	L’expérience vise à motiver, pas à socialiser.

Avec cette étape, Gorillax devient plus qu’un tracker : un réseau d’entraînement minimaliste centré sur le partage d’expériences réelles.
