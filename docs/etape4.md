

### Étape 4 — Import d’exercices depuis un lien (web)

🎯 Objectif général

Permettre à l’utilisateur d’ajouter un nouvel exercice à sa bibliothèque en collant une URL (YouTube, article de blog, page d’une base d’exos). Le système récupère automatiquement titre / image / description via les méta-données web (OpenGraph / meta tags), propose une prévisualisation éditable, puis enregistre l’exercice avec sa source pour transparence.

En pratique : coller une URL → prévisualiser → compléter 2 champs → enregistrer. ≤ 3 actions au total.

⸻

🖼️ UX (côté app)
	1.	Écran “Importer depuis le web”

	•	Champ URL + bouton Importer
	•	Validation de base (format https://…)
	•	État d’erreur clair si l’URL est invalide

	2.	Prévisualisation

	•	Affiche titre, image, description récupérés
	•	Champs éditables par l’utilisateur :
	•	name (nom de l’exercice)
	•	muscle_group (menu déroulant contrôlé)
	•	equipment (liste contrôlée; ex : barbell, dumbbell, machine, poids du corps)
	•	Bouton Enregistrer dans ma bibliothèque

	3.	Confirmation

	•	Toast/haptique léger « Exercice ajouté »
	•	Proposition d’ajouter directement à la séance en cours (si une séance brouillon existe)

États UI à prévoir
	•	loading (pendant le fetch des métadonnées)
	•	empty (avant import)
	•	error (échec parsing / réseau)
	•	success (enregistrement OK)

⸻

⚙️ Côté API (flux minimal et robuste)

Endpoints
	•	POST /exercises/import-url → reçoit { url }, renvoie un payload éditable avec les champs proposés :
	•	name (à partir de og:title ou <title>)
	•	image_url (à partir de og:image, sinon null)
	•	description (à partir de og:description / meta description, tronquée à 500 char)
	•	éventuellement suggested_muscle_group / suggested_equipment (facultatif)
	•	POST /exercises → enregistre l’exercice définitif avec :
	•	source_type = "url"
	•	source_value = <l’URL originale>
	•	name, muscle_group, equipment, description, image_url

Fallbacks (quand OpenGraph est incomplet)
	•	name : utiliser <title> si og:title manquant
	•	image_url : si manquant → placeholder local (image par défaut)
	•	description : préférer og:description, sinon meta description, sinon vide

Dédoublonnage (anti-repétitions)
	•	Générer un slug à partir de name + muscle_group (ex: developpe-couche_chest)
	•	Contrainte : slug unique dans la table Exercise
	•	Si le slug existe déjà → l’API retourne un drapeau already_exists: true et l’app propose « utiliser l’existant »
	•	Gestion des synonymes via ExerciseAlias (ex: « DC », « bench press »)

Règles de sécurité & robustesse
	•	Rate-limit: 5 imports/min/user (éviter l’abus / bots)
	•	Validation URL (https?://)
	•	Taille description tronquée à 500 caractères
	•	Timeout réseau raisonnable (ex: 4–5s) + messages d’erreur clairs
	•	Logs côté API (URL demandée, succès/échec, cause)

⸻

🧩 Données enregistrées (modèle Exercise)

Champs pertinents au MVP :
id, name, muscle_group, equipment, description, image_url, source_type, source_value, slug, created_at

Transparence : garder source_value (URL) permet d’afficher la provenance de l’exercice dans la fiche et lors du partage de séance.

⸻

🔗 Intégration avec le dataset local
	•	L’import web ne remplace pas le catalogue local : les deux alimentent la même table Exercise.
	•	Le filtre par source (Local / Web) peut être utile dans l’écran Catalogue pour retrouver plus vite les exercices importés.

⸻

🗓️ Sous-sprints recommandés

**Sprint 4A — UI import & validations**
	•	Mettre en place l’écran Import, les états loading/error et les validations d’URL.
	•	Tests : RTL couvrant succès, URL invalide et timeout simulé.

**Sprint 4B — Service d’extraction**
	•	Développer `og_scraper`, gérer les fallbacks et brancher `/exercises/import-url`.
	•	Tests : unitaires avec fixtures HTML, intégration pytest sur l’endpoint avec dataset simulé.

**Sprint 4C — Déduplication & offline**
	•	Générer les slugs, gérer `already_exists` et ajouter la file d’attente offline d’imports.
	•	Tests : contrat sur la réponse API, scénario e2e (Detox ou smoke) validant l’import offline → sync.

⸻

✅ Definition of Done (DoD)
	•	Coller une URL publique, obtenir une prévisualisation éditable, compléter muscle_group + equipment et enregistrer en ≤ 3 actions.
	•	En cas d’URL invalide, d’OpenGraph manquant ou de réseau indisponible, l’app affiche un message clair et ne plante pas.
	•	Si un doublon est détecté (slug existant), l’app propose d’utiliser l’exercice déjà présent.
	•	Jalon M3 atteint : couverture extraction ≥ 80 %, suites de tests (unit, intégration, RTL) exécutées dans la CI.

⸻

🔍 Tests rapides
	1.	URL valide : coller une URL de blog d’exo → la prévisualisation affiche au moins le titre et potentiellement une image.
	2.	OpenGraph incomplet : coller une URL pauvre en métadonnées → fallback <title> + placeholder image.
	3.	Doublon : importer un exercice déjà existant (même name + muscle_group) → proposition « utiliser l’existant ».
	4.	Erreur réseau : simuler un timeout → écran d’erreur non bloquant, retour possible.
	5.	Enregistrement : après validation, l’exercice apparaît dans le catalogue et peut être ajouté à une séance.

⸻

⚠️ Points d’attention
	•	Ne pas tenter de scraper lourd (headless / rendu JS) au MVP : coût et complexité inutiles.
	•	Toujours afficher la source de l’exercice (transparence & crédibilité).
	•	Ne pas rendre la sync obligatoire : l’ajout doit fonctionner offline (l’URL sera traitée dès que le réseau est disponible si on file d’attente les imports).

⸻

💡 Résumé opérationnel
	•	Simplicité d’usage : copier-coller un lien suffit.
	•	Qualité : fallback propres, déduplication, états d’erreur nets.
	•	Traçabilité : source URL conservée et visible.

Cette étape ajoute une porte d’entrée ouverte sur tout le web, sans alourdir l’app ni casser l’offline-first. Parfait pour enrichir la bibliothèque d’exercices au rythme des utilisateurs.
