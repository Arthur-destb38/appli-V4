# 🏗️ Guide : Faire un build EAS pour iOS

## 📋 Prérequis

1. **Compte Expo** (gratuit) : https://expo.dev/signup
2. **Compte développeur Apple** (99$/an) : https://developer.apple.com/programs/
   - ⚠️ **OBLIGATOIRE** pour installer sur iPhone
   - Sans ça, tu ne pourras pas installer le build sur ton iPhone

---

## 🔧 Étape 1 : Installer EAS CLI

```bash
npm install -g eas-cli
```

Vérifie l'installation :
```bash
eas --version
```

---

## 🔐 Étape 2 : Se connecter à Expo

```bash
cd app
eas login
```

Tu seras redirigé vers le navigateur pour te connecter.

Vérifie que tu es connecté :
```bash
eas whoami
```

---

## 📱 Étape 3 : Choisir le type de build

Tu as 3 options selon tes besoins :

### Option A : Build de développement (Recommandé pour tester)

**Avantages** :
- ✅ Se connecte au serveur de dev (hot reload)
- ✅ Plus rapide à générer
- ✅ Parfait pour tester les fonctionnalités

**Commande** :
```bash
cd app
eas build --platform ios --profile development
```

### Option B : Build de prévisualisation

**Avantages** :
- ✅ Build standalone (pas besoin de serveur)
- ✅ Comportement proche de la production
- ✅ Peut être partagé avec d'autres testeurs

**Commande** :
```bash
cd app
eas build --platform ios --profile preview
```

### Option C : Build de production

**Avantages** :
- ✅ Build final pour publication
- ✅ Optimisé pour les stores

**Commande** :
```bash
cd app
eas build --platform ios --profile production
```

---

## 🚀 Étape 4 : Lancer le build

### Pour un build de développement (recommandé pour commencer) :

```bash
cd app
eas build --platform ios --profile development
```

### Ce qui va se passer :

1. **EAS va te poser des questions** :
   - "Would you like to create a new Apple App Store Connect API key?" → **Oui** (première fois)
   - "Would you like to use Expo's managed credentials?" → **Oui** (plus simple)
   - "Would you like to automatically set up credentials?" → **Oui**

2. **Le build va commencer** :
   - Upload du code vers les serveurs EAS
   - Compilation sur les serveurs Apple
   - Durée : **15-30 minutes** environ

3. **Tu recevras un lien** :
   - Soit dans le terminal
   - Soit par email
   - Soit sur https://expo.dev

---

## 📲 Étape 5 : Installer sur iPhone

### Méthode 1 : Via le lien direct

1. Ouvre le lien reçu sur ton iPhone
2. Clique sur "Install"
3. L'app s'installe (nécessite un compte développeur Apple)

### Méthode 2 : Via TestFlight (pour preview/production)

1. Le build est automatiquement soumis à TestFlight
2. Ouvre l'app TestFlight sur ton iPhone
3. Accepte l'invitation
4. Installe l'app

---

## ⚙️ Configuration des credentials Apple

### Première fois uniquement

EAS va te demander de configurer les credentials Apple :

1. **App Store Connect API Key** :
   - Va sur https://appstoreconnect.apple.com
   - Accès utilisateurs → Clés → Générer une clé API
   - Télécharge la clé (.p8)
   - Donne la clé ID et l'issuer ID à EAS

2. **Ou laisse EAS gérer** :
   - Réponds "Yes" à "Would you like Expo to manage your credentials?"
   - EAS va créer les certificats automatiquement

---

## 🔍 Vérifier le statut du build

```bash
eas build:list
```

Ou va sur : https://expo.dev/accounts/[ton-compte]/projects/gorillax-gym/builds

---

## 📝 Profils disponibles dans eas.json

Tu as 3 profils configurés :

### 1. `development`
- **Usage** : Tests avec hot reload
- **Distribution** : Internal
- **Client** : Development client

### 2. `preview`
- **Usage** : Tests standalone
- **Distribution** : Internal
- **Android** : APK (pour Android)

### 3. `production`
- **Usage** : Publication finale
- **Distribution** : Store
- **Auto-increment** : Oui

---

## 🐛 Dépannage

### Erreur : "No Apple credentials found"

**Solution** :
```bash
eas credentials
```

Puis configure les credentials manuellement ou laisse EAS les gérer.

### Erreur : "Bundle identifier already exists"

**Solution** :
- Change le `bundleIdentifier` dans `app.json`
- Ou utilise un compte Apple différent

### Build échoue

**Vérifie** :
1. Les logs : `eas build:view [build-id]`
2. Les credentials : `eas credentials`
3. La configuration : `eas.json` et `app.json`

---

## ⚡ Commandes utiles

```bash
# Voir tous les builds
eas build:list

# Voir les détails d'un build
eas build:view [build-id]

# Annuler un build en cours
eas build:cancel [build-id]

# Voir les credentials
eas credentials

# Voir les informations du projet
eas project:info
```

---

## 🎯 Recommandation pour les tests (Jours 5-7)

### Pour tester rapidement :
→ **Build development** (15-20 min)
- Se connecte au serveur de dev
- Hot reload disponible
- Parfait pour tester l'UI

### Pour tester comme en production :
→ **Build preview** (20-30 min)
- Build standalone
- Comportement proche de la production
- Peut être partagé

### Pour publier :
→ **Build production** (30-45 min)
- Build final optimisé
- Prêt pour App Store

---

## 📚 Ressources

- Documentation EAS : https://docs.expo.dev/build/introduction/
- Guide credentials : https://docs.expo.dev/app-signing/managed-credentials/
- Support Expo : https://expo.dev/support

---

**Bon build ! 🦍🚀**

