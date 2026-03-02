# Performance et utilisation en local sur téléphone

## Pourquoi l’app peut ramer

### 1. Réseau (API cloud)
- En **production** l’app appelle `https://appli-v2.onrender.com`. Le serveur Render peut avoir un **cold start** (première requête lente après inactivité) et la latence réseau augmente le temps de chargement.
- **Conseil** : pour tester, utiliser l’API en **local** (voir section « Utilisation en local sur téléphone »).

### 2. Listes longues sans virtualisation
- Plusieurs écrans utilisent **ScrollView** + **`.map()`** pour afficher des listes (explore, profil, messages, bibliothèque). Tous les éléments sont rendus d’un coup, ce qui peut faire ramer sur de longues listes.
- Le **feed** utilise déjà **FlatList** (virtualisation), mais on peut encore optimiser (voir ci‑dessous).

### 3. Re-renders inutiles
- Les cartes du feed (**FeedCard**) se re-rendent à chaque mise à jour du parent. Les mémoïser avec **React.memo** réduit les re-renders.

### 4. Images
- Les images utilisent le composant **Image** natif sans cache dédié. Pour beaucoup d’images (feed, profils), **expo-image** avec cache peut améliorer la fluidité (à envisager si besoin).

### 5. Mode développement
- En **Expo Go** / mode **__DEV__**, les perfs sont plus faibles (logs, debug, rechargement à chaud). Les builds **production** (APK/IPA) sont en général plus fluides.

---

## Modifs déjà faites dans le code

- **FlatList du feed** : `initialNumToRender`, `maxToRenderPerBatch`, `windowSize` pour limiter le nombre d’items rendus.
- **FeedCard** : enveloppé dans **React.memo** pour éviter les re-renders inutiles.
- **API** : prise en charge de **EXPO_PUBLIC_API_URL** pour pointer facilement vers ton backend local depuis le téléphone.

---

## Utilisation en local depuis un téléphone

Pour que l’app sur ton **téléphone** (Expo Go ou build de dev) parle à ton **API qui tourne sur ton Mac/PC** :

### Prérequis
- Le téléphone et l’ordinateur sont sur le **même réseau Wi‑Fi**.
- L’API backend tourne sur ta machine (ex. `uvicorn` sur le port 8000).

### Option 1 : Variable d’environnement (recommandé)

1. Trouve l’**IP locale** de ton ordinateur :
   - Mac : Préférences Système → Réseau, ou en terminal : `ipconfig getifaddr en0` (souvent `192.168.1.x` ou `10.0.0.x`).
   - Windows : `ipconfig` → adresse IPv4.

2. Dans le dossier **`app`**, crée ou édite un fichier **`.env`** (à la racine de `app`, pas à la racine du monorepo) :
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.XX:8000
   ```
   Remplace `192.168.1.XX` par l’IP de ta machine (ex. `192.168.1.45`).

3. Redémarre le serveur Expo pour prendre en compte la variable :
   ```bash
   cd app
   npx expo start
   ```
4. Scanne le QR code avec ton téléphone. L’app utilisera `EXPO_PUBLIC_API_URL` et donc ton API locale.

### Option 2 : Toggle dans le code

Dans **`app/src/utils/api.ts`** :
- Mets **`USE_LOCAL_API = true`**.
- Remplace **`LOCAL_API_IP`** par l’IP de ta machine, par ex. :
  ```ts
  const LOCAL_API_IP = 'http://192.168.1.45:8000';
  ```
- En **production / build**, remets **`USE_LOCAL_API = false`** (ou ne pas committer `true`).

### Important
- **Ne pas** utiliser `localhost` sur le téléphone : le téléphone doit contacter l’IP de ta machine sur le réseau (ex. `192.168.1.45`).
- Si tu changes de réseau Wi‑Fi, l’IP peut changer : mets à jour `EXPO_PUBLIC_API_URL` ou `LOCAL_API_IP`.
- En **build production** (APK/IPA), l’app doit pointer vers l’API cloud : ne pas laisser `USE_LOCAL_API = true` ni une URL locale en prod.
