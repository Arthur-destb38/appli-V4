

# Étape 2 — App : flux « Créer → Lancer → Terminer »

### 🎯 Objectif général

Mettre en place le **parcours utilisateur central** : l’utilisateur compose une séance (à partir d’exercices existants), la **lance** pour saisir ses séries en temps réel, puis la **termine** et retrouve ses données **persistées**. L’expérience doit être **rapide, claire et offline-first**.

À l’issue de l’étape, sans réseau, un utilisateur doit pouvoir :

1. **Créer** une séance avec un titre et une liste d’exercices,
2. **Suivre** la séance en ajoutant ses séries (reps/poids/RPE) avec interactions rapides,
3. **Terminer** la séance et voir ses données conservées après redémarrage.

---

## 🖼️ Écrans concernés (et intention UX)

### 1) Accueil

* **But** : point d’entrée simple. Affiche les dernières séances (brouillons/terminées) et un bouton « Créer » mis en avant.
* **Contenus** : liste de cartes de séances (titre, date, statut « en cours » ou « terminé »). État vide pédagogique (invitation à créer la première séance).
* **Actions clés** : « Créer » (nouvelle séance) ; reprendre une séance en brouillon si elle existe.

### 2) Création de séance

* **But** : composer rapidement une séance **sans friction**.
* **Contenus** : champ **Titre** (ex. « Pecs/Triceps ») + **Catalogue** d’exercices (dataset local) avec recherche/filtre (muscle, matériel).
* **Interactions** :

  * Ajout/suppression d’exercices (ordre modifiable par glisser-déposer si possible, sinon flèches haut/bas).
  * Sauvegarde automatique dès qu’un exo est ajouté (éviter la perte).
* **UX tips** :

  * Mettre le focus clavier sur le titre dès l’entrée.
  * Afficher un compteur d’exercices (ex. « 3 exercices sélectionnés »).

### 3) Suivi (tracking en séance)

* **But** : **saisie ultra-rapide** pour chaque série.
* **Contenus** : liste des exercices dans l’ordre ; pour chacun, lignes de séries avec champs **reps**, **poids**, **RPE**.
* **Interactions rapides** :

  * **Appui long** sur une ligne = **valider la série** immédiatement.
  * Boutons **+/−** pour ajuster reps/poids (pas de clavier obligatoire).
  * Bouton **« Repeat last »** pour pré-remplir les champs avec la dernière série valide de cet exercice.
  * Auto-focus intelligent : après validation d’une série, focus sur la suivante.
* **Feedback** : léger haptique + check visuel à la validation, et état « série validée » (verrouillable/non éditable selon préférence produit ; MVP : ré-éditable).
* **Fin de séance** : bouton « Terminer la séance » (confirmation légère).

---

## 🧱 Données & persistance (offline-first)

### Modèle local minimal (côté mobile)

* **Workout** : `id, title, created_at, status(brouillon|terminé)`
* **WorkoutExercise** : `workout_id, exercise_id, order_index`
* **WorkoutSet** : `workout_exercise_id, reps, weight, rpe, done_at`

> **Intention** : rester strictement aligné sur l’étape 1 pour éviter toute divergence (noms de champs identiques, types compatibles).

### Règles de persistance

* **Autosave** :

  * à l’ajout/suppression d’un exo,
  * à chaque validation de série,
  * à chaque changement de valeur (reps/poids/RPE).
* **Tolérance aux crashs** : à tout moment, on doit pouvoir redémarrer l’app et retrouver l’état exact de la séance en cours.
* **Statut** :

  * « brouillon » tant que « Terminer » n’a pas été choisi,
  * passe à « terminé » avec timestamp lorsque l’utilisateur confirme la fin.

---

## 🔗 Synchronisation (MVP – option activable)

> Le flux reste 100% fonctionnel sans réseau. La **sync** (si activée) ne doit **jamais** bloquer l’usage local.

### Contrat de sync proposé (simple et robuste)

* **Push** : `POST /sync/push` → le client envoie les changements (workouts/exos/sets) avec `updated_at` et un `client_uuid`.
* **Pull** : `GET /sync/pull?since=TIMESTAMP` → le client récupère les changements plus récents que `since`.
* **Conflits** : stratégie **Last-Writer-Wins (LWW)** au MVP (serveur tranche sur `updated_at`).

### File d’attente offline

* Les mutations (création série, modif reps, etc.) sont **rangées en file** si pas de réseau.
* Dès retour du réseau : flush progressif (ordre FIFO), avec retry simple (ex. 3 tentatives).
* **Indicateur UI** : badge discret « à synchroniser » si la file n’est pas vide.

> Alternative MVP : pas de `/sync/*` dédié, on s’appuie sur les endpoints CRUD avec champs `created_at` / `updated_at` et filtrage par date côté client (plus simple à coder, moins propre si beaucoup d’objets).

---

## 🎛️ Raccourcis & ergonomie (réduire la friction)

* **Appui long = valider série** (raccourci majeur pour éviter le clavier).
* **Repeat last** (pré-remplit les valeurs de la série précédente de l’exercice).
* **Boutons +/−** pour reps/poids (pas de saisie clavier obligatoire).
* **Focus automatique** sur le prochain champ pertinent après validation.
* **Haptique** léger à chaque validation.

> **Objectif mesurable** : temps médian pour saisir une série **≤ 3 s**.

---

## 🗓️ Sous-sprints recommandés

### Sprint 2A — Composer la séance
* Objectif : bâtir les écrans Accueil + Création et persister les brouillons en SQLite.
* Qualité : tests Jest sur les hooks `useWorkouts`, snapshots RTL sur l’écran Création, vérification des états empty/loading.

### Sprint 2B — Tracking & raccourcis
* Objectif : interactions de suivi (repeat last, appui long, haptique) et feedbacks temps réel.
* Qualité : tests RTL pour la validation d’une série, tests unitaires sur la logique de pré-remplissage, mocks pour les retours haptiques.

### Sprint 2C — Sync & résilience
* Objectif : file d’attente offline, adaptateurs `/sync/push` & `/sync/pull`, instrumentation des métriques de sync.
* Qualité : tests de contrat (pydantic) sur les payloads, smoke Detox “Créer → Terminer”, suivi des retries offline dans la CI.

---

## ✅ Definition of Done (DoD)

* Créer une séance, ajouter au moins **un exercice** et **5 séries**, puis **terminer** la séance.
* Redémarrer l’app (kill process) → **toutes les données** (séries, ordre, statut) sont présentes et correctes.
* (Si sync activée) Activer/désactiver le réseau pendant la séance **n’empêche** aucune action et les données se synchronisent **après coup**.
* Jalon M2 validé : contrats `/sync/*` mockés, queue offline testée, suites CI (Jest + Detox smoke) au vert.

---

## 🔍 Tests rapides (scénarios E2E)

1. **Création minimale** :

   * Depuis Accueil → « Créer », titre « Pecs/Triceps », ajouter 2 exos, sauvegarde auto.
2. **Saisie express** :

   * Suivi → ajouter 5 séries sur le 1er exo uniquement via +/− et appui long.
3. **Crash test** :

   * Forcer la fermeture de l’app puis relancer → la séance réapparaît identique (statut « brouillon »).
4. **Terminaison** :

   * Appuyer sur « Terminer » → statut passe à « terminé », un timestamp est visible au détail séance.
5. **Offline** :

   * Couper le réseau, saisir 2 séries, rallumer le réseau → les données restent localement ; si la sync est active, elles partent au prochain flush.

---

## ⚠️ Points d’attention (antipatterns à éviter)

* **Clavier omniprésent** : forcer la saisie clavier pour reps/poids ralentit tout. Privilégier **+/−** et **repeat last**.
* **Sauvegarde « à la fin »** : risque de perte de données. Toujours **autosave**.
* **Sync bloquante** : ne jamais empêcher la saisie faute de réseau.
* **Écrans surchargés** : rester minimal (3 écrans, labels clairs, contrastes suffisants).

---

## 🧭 Résumé opérationnel

* Trois écrans simples, lisibles, et **focus sur l’action**.
* Données locales **cohérentes** et résistantes aux crashs.
* Sync **optionnelle** et non bloquante (MVP).
* Interactions **rapides** (≤ 3 s par série) pour une sensation de fluidité immédiate.

> Cette étape livre le **cœur** du produit. Si elle est agréable et solide, tout le reste (import web, partage, feed) devient un bonus apprécié plutôt qu’un béquillage nécessaire.
