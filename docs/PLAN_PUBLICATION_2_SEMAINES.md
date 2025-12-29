# 🚀 Plan de Publication - Gorillax Gym
## Objectif : Publier l'app dans 2 semaines

**Date de début** : À définir  
**Date cible de publication** : +14 jours  
**Temps disponible** : **Flexible** - Plus de 2h/jour possible avec assistance IA

---

## ✅ NOUVELLE RÉÉVALUATION (Avec plus d'heures/jour)

**Ce plan inclut la finalisation complète de l'UI/UX** :
- Polish des parcours utilisateur
- Finalisation des boutons et interactions
- Animations et micro-interactions
- États loading/empty/error partout
- Cohérence visuelle globale

**Temps total estimé** :
- **Critique** : ~22h (inclut 8h de finalisation UI + 2h authentification)
- **Important** : ~6h
- **Total** : ~28h

**Avec assistance IA et plus d'heures/jour** :
- **3-4h/jour** = 42-56h disponibles sur 14 jours
- **5h/jour** = 70h disponibles sur 14 jours
- **Marge confortable** pour tout finaliser + buffer

**Verdict** : ✅ **TRÈS FAISABLE** avec plus d'heures/jour !

---

## ✅ État Actuel de l'Application

### Points Positifs ✨

- ✅ **Fonctionnalités principales implémentées** :
  - Création et suivi de séances
  - Base d'exercices (130+)
  - Historique et progression
  - Feed social (partage, likes, commentaires)
  - Programmes d'entraînement
  - Classements

- ✅ **Configuration technique prête** :
  - `app.json` configuré (nom, bundle ID, version)
  - `eas.json` configuré pour les builds
  - Pages légales présentes (Privacy Policy, Terms)
  - API déployée sur Render (https://appli-v2.onrender.com)

- ✅ **Bugs critiques corrigés** :
  - `eval()` remplacé par `json.loads()` (sécurité)
  - CORS restreint en production
  - Secret JWT sécurisé
  - Types corrigés (`dict[int]` → `dict[str]`)
  - Types `server_id` corrigés (number → string) ✅
  - Backend sécurisé avec authentification requise ✅
  - `getAuthHeaders()` corrigé pour inclure le token JWT ✅

### Points à Finaliser 🔧

- [x] **Bug corrigé** : Incohérence de types `server_id` (number vs string) ✅
- ⚠️ **Authentification désactivée** : À activer avant publication (voir section 1ter)
- ⚠️ **UI/UX à finaliser** : 
  - Parcours utilisateur à polir (boutons, transitions, feedback)
  - Animations et micro-interactions
  - États loading/empty/error partout
  - Cohérence visuelle globale
  - Polish des écrans principaux
- ⚠️ **Tests** : Tests sur devices réels à effectuer
- ⚠️ **Builds** : Builds de production à générer et tester
- ⚠️ **Assets** : Vérifier icône et splash screen finaux

---

## 📋 Checklist de Publication

### 🔴 CRITIQUE (Obligatoire pour publication) - ~22h

**⚠️ RÉÉVALUATION** : Le temps a été augmenté pour inclure :
- La finalisation UI/UX complète (8h)
- L'activation de l'authentification (2h) - **NOUVEAU**

#### 1. Corrections de Bugs (2h)
- [x] Corriger l'incohérence de types `server_id` (number vs string) ✅ **FAIT**
  - Fichiers concernés :
    - `app/src/types/workout.ts`
    - `app/src/hooks/useWorkouts.tsx`
    - `app/src/services/syncClient.ts`
    - `app/src/db/database.ts`
- [ ] Vérifier et corriger tous les TODOs critiques
- [ ] Tester la synchronisation frontend/backend

#### 1ter. Activation de l'Authentification (2h) 🔒 **CRITIQUE - NOUVEAU**
- [ ] **Activer l'authentification dans le frontend** (`app/src/hooks/useAuth.tsx`)
  - Retirer les commentaires "AUTH DÉSACTIVÉE TEMPORAIREMENT"
  - Implémenter la vraie logique d'authentification
  - Utiliser `SecureStore` pour stocker les tokens
  - Gérer le refresh token automatique
- [ ] **Vérifier que `getAuthHeaders()` fonctionne** ✅ **DÉJÀ FAIT**
  - Le token JWT est maintenant inclus dans les headers
- [ ] **Tester l'authentification complète** :
  - Inscription d'un nouvel utilisateur
  - Connexion avec email/mot de passe
  - Vérifier que le token est stocké et envoyé
  - Tester la synchronisation avec authentification
- [ ] **Vérifier la sécurité** :
  - Chaque utilisateur ne voit que ses workouts
  - Impossible de modifier les workouts d'autres utilisateurs
  - La synchronisation fonctionne entre devices du même utilisateur

**⚠️ IMPORTANT** : Sans authentification activée, la synchronisation ne fonctionnera pas (erreurs 401). C'est **obligatoire** pour la publication.

#### 1bis. Finalisation UI/UX Complète (8h) ⚠️ **NOUVEAU - PRIORITÉ**
- [ ] **Écran Accueil (Home)** - 1h
  - [ ] Polir les boutons et interactions
  - [ ] Ajouter animations de transition
  - [ ] Vérifier états loading/empty/error
  - [ ] Uniformiser les espacements et marges
  
- [ ] **Écran Création de Séance** - 1.5h
  - [ ] Finaliser l'UI de sélection d'exercices
  - [ ] Polir les boutons d'ajout/suppression
  - [ ] Ajouter feedback haptique
  - [ ] Améliorer la recherche et filtres
  - [ ] États vides et erreurs
  
- [ ] **Écran Suivi de Séance (Track)** - 2h
  - [ ] Finaliser les boutons +/- pour reps/poids
  - [ ] Polir l'interaction "appui long = valider"
  - [ ] Ajouter animations de validation
  - [ ] Améliorer le timer de repos
  - [ ] Feedback visuel et haptique partout
  - [ ] Bouton "Repeat last" bien visible
  
- [ ] **Écran Feed Social** - 1h
  - [ ] Polir les cartes de feed
  - [ ] Finaliser boutons like/comment/share
  - [ ] États loading/empty
  - [ ] Animations de scroll
  
- [ ] **Écran Historique** - 1h
  - [ ] Polir les cartes de séances
  - [ ] Finaliser navigation vers détail
  - [ ] Graphiques de progression (si pas fait)
  
- [ ] **Cohérence Globale** - 1.5h
  - [ ] Uniformiser tous les boutons (AppButton partout)
  - [ ] Vérifier les transitions entre écrans
  - [ ] États loading/empty/error sur TOUS les écrans
  - [ ] Vérifier la cohérence des couleurs et espacements
  - [ ] Tester le thème clair/sombre partout
  - [ ] Retours haptiques sur actions clés

#### 2. Tests sur Devices Réels (3h)
- [ ] Tester sur iPhone (iOS)
  - Parcours complet : création → suivi → partage
  - Vérifier les crashs
  - Tester la persistance offline
- [ ] Tester sur Android
  - Même parcours
  - Vérifier les performances
- [ ] Tester les builds de production (pas seulement dev)

#### 3. Builds de Production (4h)
- [ ] Configurer EAS Build
  ```bash
  cd app
  eas build:configure
  ```
- [ ] Générer build iOS
  ```bash
  eas build --platform ios --profile production
  ```
- [ ] Générer build Android
  ```bash
  eas build --platform android --profile production
  ```
- [ ] Tester les builds sur devices physiques
- [ ] Vérifier la taille des builds (< 200 Mo iOS, < 150 Mo Android)

#### 4. Vérification Parcours Utilisateur (2h)
**Note** : Cette étape inclut maintenant la validation du polish UI fait à l'étape 1bis.
- [ ] Parcours complet sans crash :
  - Créer une séance
  - Ajouter des exercices
  - Suivre la séance (saisir séries)
  - Terminer la séance
  - Partager la séance
  - Voir le feed
  - Consulter l'historique
- [ ] Test de crash : kill app → rouvrir → données intactes
- [ ] Test offline : fonctionnalités sans réseau

#### 5. Assets Finaux (1h)
- [ ] Vérifier l'icône (1024×1024, format correct)
- [ ] Vérifier le splash screen
- [ ] Vérifier la cohérence visuelle

---

### 🟠 IMPORTANT (Recommandé) - ~6h

**Note** : Réduit car le polish UI est maintenant dans la section critique.

#### 6. Amélioration Gestion d'Erreurs (1h)
- [ ] Ajouter des messages d'erreur clairs (si pas fait dans UI)
- [ ] Gérer les cas d'erreur réseau
- [ ] Tester les cas limites

#### 7. Tests E2E Basiques (2h)
- [ ] Créer des tests E2E pour le parcours principal
- [ ] Tester la synchronisation
- [ ] Tester le partage
- [ ] Automatiser les tests critiques

#### 8. Optimisations Performance (2h)
- [ ] Vérifier les performances sur devices réels
- [ ] Optimiser les requêtes API (éviter N+1)
- [ ] Optimiser le rendu des listes
- [ ] Vérifier la taille du bundle

#### 9. Documentation Publication (1h)
- [ ] Préparer la description pour les stores
- [ ] Préparer les screenshots
- [ ] Préparer les métadonnées (catégories, mots-clés)
- [ ] Vérifier la Privacy Policy (déjà présente ✅)

---

### 🟢 OPTIONNEL (Si temps disponible) - ~8h

- [ ] Améliorations UX mineures
- [ ] Tests supplémentaires
- [ ] Features bonus
- [ ] Optimisations avancées

---

## 📅 Planning Détaillé (Flexible - 3-5h/jour recommandé)

### Semaine 1 (Objectif : Finaliser UI critique + Bugs)

**Recommandation** : 3-4h/jour = 21-28h disponibles

#### Jour 1-2 (6-8h) : Corrections & Authentification & Début UI
- **30min** : Bug `server_id` ✅ **DÉJÀ FAIT**
- **2h** : **Activer l'authentification** 🔒 **PRIORITÉ**
  - Activer dans `useAuth.tsx` à faire à la fin 
  - Tester inscription/connexion 
  - Vérifier synchronisation avec auth 
- **1h** : Vérifier tous les TODOs critiques 
- **2.5-4.5h** : **Finalisation UI** - Écran Accueil (polish boutons, animations, états)
  - Polish complet des interactions
  - Animations de transition
  - États loading/empty/error
  - Uniformisation espacements

#### Jour 3-4 (6-8h) : UI - Écrans Principaux
- **3-4h** : **Finalisation UI** - Écran Création de Séance (polish complet)
  - UI de sélection d'exercices
  - Boutons d'ajout/suppression
  - Feedback haptique
  - Recherche et filtres améliorés
- **3-4h** : **Finalisation UI** - Écran Suivi de Séance (boutons, animations, feedback)
  - Boutons +/- pour reps/poids
  - Interaction "appui long = valider"
  - Animations de validation
  - Timer de repos amélioré
  - Feedback visuel et haptique

#### Jour 5-7 (9-12h) : UI - Finitions & Tests
- **4-6h** : **Finalisation UI** - Écran Feed + Historique + Cohérence globale
  - Polish cartes de feed
  - Boutons like/comment/share
  - Historique et graphiques
  - Cohérence globale (boutons, espacements, couleurs)
- **2-3h** : Tests sur iPhone (parcours complet avec nouvelle UI)
- **1-2h** : Tests sur Android
- **2h** : Configuration EAS Build + premiers tests de build

---

### Semaine 2 (Objectif : Builds + Publication)

**Recommandation** : 3-4h/jour = 21-28h disponibles

#### Jour 8-10 (9-12h) : Builds & Tests Finaux
- **3-4h** : Générer et tester builds de production (iOS + Android)
  - Builds de production
  - Tests sur devices réels
  - Vérification taille des builds
  - Tests de toutes les fonctionnalités
- **2-3h** : Tests approfondis sur devices réels
  - Parcours complet
  - Test offline
  - Test de synchronisation
  - Performance
- **2h** : Corrections des bugs trouvés
- **2h** : Optimisations performance + gestion d'erreurs
  - Optimisations de rendu
  - Gestion d'erreurs réseau
  - Amélioration des messages d'erreur

#### Jour 11-12 (6-8h) : Préparation Publication
- **2h** : Tests E2E basiques
  - Automatisation des tests critiques
  - Validation des parcours
- **2h** : Documentation publication
  - Description pour les stores
  - Préparation des screenshots
  - Métadonnées (catégories, mots-clés)
- **1-2h** : Vérification assets finaux
  - Icône (1024×1024)
  - Splash screen
  - Cohérence visuelle
- **1-2h** : Finalisation et polish final
  - Dernières corrections UI
  - Vérification de cohérence

#### Jour 13-14 (6-8h) : Soumission & Buffer
- **2h** : Soumettre sur TestFlight (iOS)
  - Création du build
  - Soumission
  - Configuration des testeurs
- **2h** : Soumettre sur Google Play Internal Testing (Android)
  - Création du build
  - Soumission
  - Configuration du canal interne
- **2h** : Corrections suite aux retours de test
  - Corrections rapides si besoin
  - Nouveaux builds si nécessaire
- **2h** : Buffer pour imprévus
  - Délais de build
  - Problèmes de signature
  - Retours de review

---

## 🎯 Stratégie de Publication

### Phase 1 : TestFlight / Internal Testing (Semaine 2)
- Soumettre d'abord en **TestFlight** (iOS) et **Internal Testing** (Android)
- Inviter un petit groupe de testeurs (amis, collègues)
- Collecter les retours pendant 2-3 jours

### Phase 2 : Publication Publique (Après validation)
- Une fois les retours intégrés, soumettre pour review publique
- **Délai de review** : 1-7 jours (Apple), 1-3 jours (Google)

---

## ⚠️ Risques Identifiés

### Risques Techniques
1. **Découverte de bugs majeurs en test** → Buffer de 4h prévu
2. **Problèmes de build/signature** → Tester tôt (Jour 3-4)
3. **Problèmes de performance** → Optimisations prévues (Jour 5-7)

### Risques Process
1. **Délais de review des stores** → Soumettre dès que possible
2. **Rejet pour non-conformité** → Vérifier les guidelines avant soumission
3. **Problèmes de Privacy Policy** → Déjà présente, vérifier qu'elle est complète

---

## 📝 Checklist Pré-Soumission

### iOS (App Store)
- [ ] Build de production généré et testé
- [ ] Privacy Policy accessible dans l'app
- [ ] Consentement utilisateur implémenté
- [ ] Description de l'app préparée
- [ ] Screenshots préparés (toutes les tailles)
- [ ] Catégorie et mots-clés définis
- [ ] Compte développeur Apple actif (99$/an)
- [ ] Vérifier les guidelines Apple

### Android (Google Play)
- [ ] Build de production généré et testé
- [ ] Privacy Policy accessible dans l'app
- [ ] Consentement utilisateur implémenté
- [ ] Description de l'app préparée
- [ ] Screenshots préparés
- [ ] Icône haute résolution (512×512)
- [ ] Compte développeur Google actif (25$ unique)
- [ ] Vérifier les guidelines Google

---

## 🛠️ Commandes Utiles

### Générer un Build de Production

```bash
# iOS
cd app
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# Les deux
eas build --platform all --profile production
```

### Tester Localement

```bash
# Lancer l'app en mode développement
./deploy.sh

# Lancer uniquement l'API
./deploy.sh --api-only

# Lancer uniquement l'app
./deploy.sh --app-only
```

### Vérifier les Erreurs

```bash
# Linter frontend
cd app
pnpm lint

# Linter backend
cd api
ruff check src/
mypy src/
```

---

## 📊 Métriques de Succès

### Avant Publication
- ✅ Aucun crash sur parcours principal
- ✅ Tous les bugs critiques corrigés
- ✅ Builds de production fonctionnels
- ✅ Tests sur devices réels OK
- ✅ Privacy Policy complète

### Après Publication
- 📈 Nombre de téléchargements
- ⭐ Note moyenne (objectif : >4.0)
- 🐛 Bugs remontés par les utilisateurs
- 💬 Retours utilisateurs

---

## 🎯 Conclusion

**Faisabilité** : ✅ **OUI, TRÈS FAISABLE avec plus d'heures/jour !**

**AVEC ASSISTANCE IA ET PLUS D'HEURES/JOUR** :

### Temps Disponible (Options)
- **3h/jour** = 42h disponibles → **Marge confortable** ✅
- **4h/jour** = 56h disponibles → **Très confortable** ✅✅
- **5h/jour** = 70h disponibles → **Luxe** ✅✅✅

### Stratégie Recommandée

1. **Semaine 1** : 3-4h/jour
   - Focus sur UI critique (Accueil, Création, Suivi)
   - Polish complet avec assistance IA
   - Tests réguliers

2. **Semaine 2** : 3-4h/jour
   - UI secondaire + Builds
   - Tests approfondis
   - Publication

3. **Avantages avec plus d'heures** :
   - ✅ Temps pour bien finaliser l'UI
   - ✅ Tests plus approfondis
   - ✅ Buffer confortable pour imprévus
   - ✅ Moins de stress, meilleure qualité

### ⚡ Optimisations avec Assistance IA

Avec mon aide, on peut :
- ✅ Générer du code UI rapidement
- ✅ Corriger les bugs ensemble
- ✅ Optimiser le code existant
- ✅ Créer les composants réutilisables
- ✅ Tester et itérer rapidement

**Recommandation** : **3-4h/jour** = parfait équilibre entre qualité et délai

### Prochaines Étapes Immédiates

**Avec 3-4h/jour, on peut être plus ambitieux :**

1. **Aujourd'hui (3-4h)** : 
   - Bug `server_id` ✅ **DÉJÀ FAIT** (30min économisés)
   - **Activer l'authentification** 🔒 (2h) - **PRIORITÉ ABSOLUE**
     - Activer dans `useAuth.tsx`
     - Tester inscription/connexion
     - Vérifier que la sync fonctionne avec auth
   - **Polish UI - Écran Accueil** (1-2h)
     - Boutons et interactions
     - Animations
     - États loading/empty/error
   - Tests rapides (30min)

2. **Demain (3-4h)** : 
   - **Finalisation UI - Écran Création** (3h)
     - Polish complet
     - Feedback haptique
     - Recherche améliorée
   - Tests (1h)

3. **Jour 3 (3-4h)** : 
   - **Finalisation UI - Écran Suivi** (3h) - **PRIORITÉ MAXIMALE**
     - Boutons +/- 
     - Appui long = valider
     - Animations
     - Timer amélioré
   - Tests (1h)

**On peut avancer beaucoup plus vite ensemble ! 🚀**

---

## 📞 Support & Ressources

- **Documentation Expo** : https://docs.expo.dev/
- **Documentation EAS** : https://docs.expo.dev/build/introduction/
- **App Store Guidelines** : https://developer.apple.com/app-store/review/guidelines/
- **Google Play Guidelines** : https://play.google.com/about/developer-content-policy/

---

**Bonne chance pour la publication ! 🦍🚀**

