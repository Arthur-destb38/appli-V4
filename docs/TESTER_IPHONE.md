# 📱 Guide : Tester l'app sur iPhone

## Méthode 1 : Expo Go (Le plus simple - Développement) ⚡

### Prérequis
- iPhone et Mac sur le même réseau WiFi
- Expo Go installé sur iPhone (App Store)

### Étapes

1. **Lancer le serveur de développement** :
```bash
cd app
pnpm start
# ou
npm start
```

2. **Scanner le QR code** :
   - Sur iPhone, ouvre l'app **Expo Go**
   - Scanne le QR code affiché dans le terminal
   - L'app se charge automatiquement

3. **Avantages** :
   - ✅ Très rapide (pas de build)
   - ✅ Hot reload automatique
   - ✅ Parfait pour tester les changements UI

4. **Limitations** :
   - ⚠️ Certaines fonctionnalités natives peuvent ne pas fonctionner
   - ⚠️ Pas exactement comme un build de production

---

## Méthode 2 : Build de développement avec EAS (Recommandé) 🚀

### Prérequis
- Compte Expo (gratuit)
- EAS CLI installé : `npm install -g eas-cli`
- Compte développeur Apple (99$/an) - **OBLIGATOIRE pour installer sur iPhone**

### Étapes

1. **Se connecter à Expo** :
```bash
cd app
eas login
```

2. **Créer un build de développement** :
```bash
eas build --platform ios --profile development
```

3. **Installer sur iPhone** :
   - Une fois le build terminé, tu recevras un lien
   - Ouvre le lien sur ton iPhone
   - Installe l'app (nécessite un compte développeur Apple)

4. **Lancer l'app** :
   - L'app s'installe comme une app normale
   - Elle se connecte automatiquement au serveur de dev quand tu lances `pnpm start`

5. **Avantages** :
   - ✅ Comportement proche de la production
   - ✅ Toutes les fonctionnalités natives fonctionnent
   - ✅ Hot reload si serveur de dev lancé

---

## Méthode 3 : Build de prévisualisation (Pour tests approfondis) 📦

### Étapes

1. **Créer un build de prévisualisation** :
```bash
cd app
eas build --platform ios --profile preview
```

2. **Installer via TestFlight** (optionnel) :
   - Le build peut être soumis à TestFlight
   - Permet de tester avec plusieurs personnes

3. **Ou installer directement** :
   - Télécharge le fichier `.ipa` depuis EAS
   - Installe via Xcode ou Apple Configurator

---

## Méthode 4 : Build local avec Xcode (Avancé) 🔧

### Prérequis
- Mac avec Xcode installé
- Compte développeur Apple
- iPhone connecté en USB

### Étapes

1. **Générer les fichiers iOS** :
```bash
cd app
npx expo prebuild --platform ios
```

2. **Ouvrir dans Xcode** :
```bash
open ios/gorillaxgym.xcworkspace
```

3. **Configurer le projet** :
   - Sélectionne ton équipe de développement
   - Choisis ton iPhone dans la liste des devices

4. **Build et installer** :
   - Clique sur "Run" (▶️) dans Xcode
   - L'app s'installe directement sur ton iPhone

---

## 🎯 Recommandation pour les tests (Jours 5-7)

### Pour tester rapidement l'UI :
→ **Méthode 1 (Expo Go)** - Le plus rapide

### Pour tester comme en production :
→ **Méthode 2 (EAS Build development)** - Le plus réaliste

### Pour tester avant publication :
→ **Méthode 3 (EAS Build preview)** - Le plus complet

---

## ⚠️ Notes importantes

1. **Compte développeur Apple** :
   - Nécessaire pour installer sur iPhone (sauf Expo Go)
   - Coût : 99$/an
   - Inscription : https://developer.apple.com/programs/

2. **Certificats et provisioning** :
   - EAS gère automatiquement les certificats
   - Pas besoin de configurer manuellement

3. **Réseau** :
   - Pour Expo Go : iPhone et Mac doivent être sur le même WiFi
   - Pour les builds : pas de restriction réseau

4. **API Backend** :
   - Vérifie que l'API est accessible depuis ton iPhone
   - URL actuelle : `https://appli-v2.onrender.com`
   - Pour tester en local, modifie `app/src/utils/api.ts`

---

## 🐛 Dépannage

### Expo Go ne se connecte pas :
- Vérifie que iPhone et Mac sont sur le même WiFi
- Désactive le VPN si activé
- Redémarre le serveur Expo

### Build EAS échoue :
- Vérifie que tu es connecté : `eas whoami`
- Vérifie les logs : `eas build:list`
- Consulte la documentation : https://docs.expo.dev/build/introduction/

### App ne se connecte pas à l'API :
- Vérifie l'URL dans `app/src/utils/api.ts`
- Vérifie que l'API est accessible depuis ton iPhone
- Teste avec `curl` depuis le terminal

---

## 📝 Checklist de test

Quand tu testes sur iPhone, vérifie :

- [ ] L'app se lance sans crash
- [ ] Navigation entre les écrans fonctionne
- [ ] Les boutons répondent (haptic feedback)
- [ ] Les animations sont fluides
- [ ] Le thème clair/sombre fonctionne
- [ ] La connexion à l'API fonctionne
- [ ] La synchronisation des données fonctionne
- [ ] Les fonctionnalités offline fonctionnent
- [ ] Les performances sont bonnes (pas de lag)
- [ ] L'app se comporte bien en mode paysage/portrait

---

**Bon test ! 🦍🚀**

