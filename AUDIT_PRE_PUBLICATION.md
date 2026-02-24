# Audit Pré-Publication — Gorillax v1.0.0

> Dernière mise à jour : 4 février 2026
> Objectif : Tout vérifier avant soumission App Store & Google Play Store

---

## Vue d'ensemble

| Domaine | Statut | Détails |
|---------|--------|---------|
| Backend (API) | 🟡 En cours | 80+ endpoints, failles de sécurité à corriger |
| Frontend (App) | 🟡 En cours | 36 écrans, bugs mineurs à corriger |
| Déploiement | 🔴 Incomplet | Variables d'env manquantes, version Python |
| Sécurité | 🔴 À corriger | Endpoints admin exposés, CORS ouvert |
| Build Mobile | 🔴 Non testé | Certificats et keystore à configurer |

---

## ÉTAPE 1 — Corrections critiques Backend

### Sécurité des routes

- [x] **Protéger les routes `/admin/*`** — Routes désactivées en production (`ENVIRONMENT=production`). Disponibles uniquement en dev.
- [x] **Protéger les routes `/seed/*`** — Routes désactivées en production (`ENVIRONMENT=production`). Disponibles uniquement en dev.
- [x] **Ajouter l'authentification sur la création d'exercices** — `POST /exercises`, `POST /exercises/bulk`, `POST /exercises/import` exigent maintenant un token JWT valide.

### Configuration

- [x] **Corriger le CORS** — En production (`ENVIRONMENT=production`), CORS restreint aux domaines `appli-v2.onrender.com` et `gorillax.app`. Configurable via `CORS_ORIGINS`.
- [x] **Fixer la version Python** — `render.yaml` aligné sur `3.12` pour correspondre à `pyproject.toml` (`>=3.12`).
- [x] **Ajouter `psycopg2-binary`** dans `pyproject.toml` — Ajouté `psycopg2-binary>=2.9.9` aux dépendances.

### Code

- [x] **Supprimer les debug prints** — 7 `print(f"DEBUG: ...")` supprimés de `users.py`.
- [x] **Supprimer les IDs hardcodés** — Supprimé le traitement spécial `demo`/`guest-user` dans `feed.py`. Tous les utilisateurs suivent la même logique.
- [x] **Corriger le TODO dans `leaderboard.py`** — Commentaire TODO supprimé.
- [x] **Corriger `follower.username` → `current_user.username`** dans `profile.py` ligne 216 (NameError qui causait un 500).

### Robustesse

- [x] **Ajouter des try/except avec rollback** autour des `session.commit()` dans : `auth.py` (register, register-v2, login), `sync.py` (push_mutations), `messaging.py` (send_message), `programs.py` (save_program).
- [x] **Ajouter la validation d'existence** — Vérifié : `profile.py`, `feed.py` et `likes.py` vérifient déjà l'existence de l'utilisateur/share avant follow/like/comment.
- [x] **Standardiser les fonctions d'authentification** — Unifié dans `utils/dependencies.py` avec `get_current_user` et `get_current_user_optional`. Supprimé 7 copies locales dans feed, share, notifications, messaging, likes, programs, exercises. Tous les fichiers importent maintenant la même source.

---

## ÉTAPE 2 — Corrections critiques Frontend

### Bloquants

- [x] **Corriger le bug de hooks dans `login.tsx`** — Les `useState` étaient après un `return <Redirect>` conditionnel, ce qui violait les règles des hooks React.
- [x] **Mettre `USE_LOCAL_API = false`** dans `app/src/utils/api.ts` — Commité et poussé, l'app pointe maintenant vers l'API Render.
- [x] **Ajouter des Error Boundaries React** — Composant `ErrorBoundary` créé dans `src/components/ErrorBoundary.tsx`, wrappé autour de `AuthProvider` dans `_layout.tsx`.

### Nettoyage

- [x] **Supprimer les `console.log`** — Nettoyé dans `login.tsx`, `register.tsx`, `useAuth.tsx`, `authApi.ts`, `api.ts`, `profile.tsx`, `profile-setup-simple.tsx`.
- [x] **Supprimer les credentials de démo hardcodées** — Bouton "Connexion Demo" supprimé de `login.tsx`, bouton "Inscription Rapide" supprimé de `register.tsx`.
- [x] **Vérifier les loading/empty states** — Vérifié tous les écrans (tabs). `feed`, `index`, `messages`, `explore` ont des loading/empty states. `profile` est statique (menu). OK.

---

## ÉTAPE 3 — Sécurité

- [~] **Rate limiting** — Infrastructure en place (`rate_limit.py`, modèle `LoginAttempt`, `record_login_attempt` actif). Le blocage `is_rate_limited()` est temporairement désactivé dans les endpoints auth (à réactiver avant publication finale).
- [x] **Configurer le CORS** avec les domaines exacts autorisés (pas `*`). Fait dans `main.py` + `CORS_ORIGINS` configuré sur Render.
- [x] **`AUTH_SECRET` sécurisé** — Présent sur Render. Le code vérifie min 32 chars et rejette les valeurs par défaut.
- [x] **`.env` non commité** — Vérifié via `git log`. Jamais ajouté au repo. `.gitignore` couvre `.env`, `.env.*`, `api/.env`.
- [ ] **Envisager le stockage externe des images** — Actuellement les images sont en base64 dans la DB. Fonctionne pour le lancement, mais à migrer vers Supabase Storage ou S3 pour la scalabilité (post-v1).

---

## ÉTAPE 4 — Déploiement Render + Supabase

### Variables d'environnement Render

- [x] **`DATABASE_URL`** — Configuré sur Render, connecté à Supabase PostgreSQL. Vérifié : les requêtes fonctionnent.
- [x] **`AUTH_SECRET`** — Présent sur Render, min 32 chars, valeur non par défaut.
- [x] **`CORS_ORIGINS`** — Configuré avec `appli-v2.onrender.com,gorillax.app`. Pas de `*` en production.
- [x] **`ENVIRONMENT`** — Mis à `production`. Routes `/admin` et `/seed` désactivées (retournent 404).
- [x] **`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`** — Non configuré. L'email est désactivé gracieusement (`is_email_enabled()` retourne `false`, le register fonctionne quand même). À configurer si la vérification email doit être active.
- [x] **`FRONTEND_URL`** — Non configuré (fallback `localhost:3000`). À mettre à jour quand l'app mobile sera publiée (les liens email ne sont pas critiques pour le lancement mobile).

### Vérifications

- [x] **Tester le health check** — `{"status":"ok"}` ✅
- [x] **Tester l'authentification** — Login demo OK, `/auth/me` retourne le bon user ✅
- [x] **Tester la synchronisation** — `sync/pull` retourne `server_time` + `events`, `sync/push` traite les mutations ✅
- [x] **Vérifier les migrations** — Modèles `Share` (avec `caption`, `color`, `image_url`) et `WorkoutExercise` (avec `client_id`) présents. Endpoints `/exercises`, `/feed` fonctionnels ✅

---

## ÉTAPE 5 — Build Mobile (EAS / Expo)

### Pré-requis

- [ ] **Compte Apple Developer** (99$/an) — Nécessaire pour l'App Store.
- [ ] **Compte Google Play Console** (25$ une fois) — Nécessaire pour le Play Store.
- [ ] **Installer EAS CLI** — `npm install -g eas-cli` puis `eas login`.

### Configuration `app.json`

- [ ] **Vérifier le bundle identifier** — `com.gorillax.gym` (doit être unique sur les stores).
- [ ] **Vérifier la version** — `1.0.0` + `versionCode: 1` (Android). Incrémenter à chaque release.
- [ ] **Vérifier l'icône** — 1024x1024px, pas de transparence pour iOS.
- [ ] **Vérifier le splash screen** — Adapté à toutes les tailles d'écran.
- [ ] **Vérifier les permissions** — Caméra, galerie photos, notifications (déclarées correctement).
- [ ] **Vérifier `extra.apiUrl`** — Doit pointer vers `https://appli-v2.onrender.com`.

### Build

- [ ] **Build preview Android** — `eas build --profile preview --platform android`
- [ ] **Build preview iOS** — `eas build --profile preview --platform ios`
- [ ] **Tester sur appareil réel** — Installer le build preview et tester toutes les fonctionnalités.
- [ ] **Build production Android** — `eas build --profile production --platform android`
- [ ] **Build production iOS** — `eas build --profile production --platform ios`

### Certificats

- [ ] **iOS** — Configurer les certificats de signature (EAS peut les gérer automatiquement).
- [ ] **Android** — Configurer le keystore (EAS peut le générer automatiquement). **Sauvegarder le keystore !**

---

## ÉTAPE 6 — Soumission aux Stores

### App Store (iOS)

- [ ] **Créer l'app sur App Store Connect** — `https://appstoreconnect.apple.com`
- [ ] **Screenshots** — 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 11 Pro Max), 5.5" (iPhone 8 Plus). Min 3, max 10 par taille.
- [ ] **Description de l'app** — Titre, sous-titre, description, mots-clés.
- [ ] **Catégorie** — Santé et remise en forme.
- [ ] **Icône 1024x1024** — Sans transparence, coins carrés (Apple les arrondit).
- [ ] **URL politique de confidentialité** — Obligatoire. Héberger une page publique.
- [ ] **URL conditions d'utilisation** — Recommandé.
- [ ] **Classement d'âge** — Remplir le questionnaire Apple.
- [ ] **Soumettre pour review** — `eas submit --platform ios`
- [ ] **Attendre la review Apple** — Généralement 24-48h.

### Google Play Store (Android)

- [ ] **Créer l'app sur Google Play Console** — `https://play.google.com/console`
- [ ] **Screenshots** — Min 2 par type d'appareil (téléphone, tablette si applicable).
- [ ] **Description de l'app** — Titre (30 car.), description courte (80 car.), description longue (4000 car.).
- [ ] **Catégorie** — Santé et remise en forme.
- [ ] **Icône 512x512** — Format PNG.
- [ ] **Feature graphic** — 1024x500px.
- [ ] **Politique de confidentialité** — URL obligatoire.
- [ ] **Questionnaire sur le contenu** — Remplir les déclarations (données collectées, etc.).
- [ ] **Questionnaire Data Safety** — Déclarer les données collectées (email, workouts, etc.).
- [ ] **Soumettre en test interne** puis **test ouvert** puis **production**.
- [ ] **Soumettre pour review** — `eas submit --platform android`
- [ ] **Attendre la review Google** — Généralement quelques heures à quelques jours.

---

## ÉTAPE 7 — Post-publication

- [ ] **Monitoring** — Mettre en place des alertes sur Render (uptime, erreurs 500).
- [ ] **Analytics** — Ajouter un outil d'analytics (ex: Expo Analytics, Mixpanel, PostHog).
- [ ] **Crash reporting** — Ajouter Sentry ou Bugsnag pour capturer les crashes.
- [ ] **Feedback utilisateurs** — Mettre en place un canal de retour (email, formulaire in-app).
- [ ] **Backups** — Vérifier les backups automatiques Supabase.
- [ ] **CI/CD** — Configurer les builds automatiques avec EAS + GitHub Actions.

---

## Résumé des priorités

| Priorité | Tâches | Temps estimé |
|----------|--------|-------------|
| 🔴 P0 | Sécuriser endpoints admin/seed, CORS, USE_LOCAL_API | ~2h |
| 🟠 P1 | Error boundaries, nettoyage console.log, rate limiting | ~3h |
| 🟡 P2 | Config Render (env vars, version Python), tests déploiement | ~2h |
| 🟢 P3 | Build EAS, tests sur appareil, certificats | ~3h |
| 🔵 P4 | Soumission stores, screenshots, descriptions | ~4h |

**Temps total estimé : ~14h de travail**
