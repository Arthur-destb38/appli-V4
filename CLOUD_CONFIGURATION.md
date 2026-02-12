# ☁️ Configuration Cloud - Gorillax

## ✅ Configuration Effectuée

### 1. App Mobile
- **API URL**: `https://appli-v2.onrender.com` (cloud)
- **Configuration**: `USE_LOCAL_API = false` dans `app/src/utils/api.ts`
- **Status**: ✅ Configuré pour utiliser le cloud

### 2. API Backend
- **URL Production**: https://appli-v2.onrender.com
- **Base de données**: PostgreSQL (Render)
- **Status**: ✅ Déployé avec isolation des utilisateurs

### 3. Isolation des Utilisateurs
- **Backend**: ✅ Filtrage par `user_id` dans `/sync/pull` et `/sync/push`
- **Frontend**: ✅ Nettoyage complet des données locales au logout
- **Status**: ✅ Fonctionnel

## 📊 État Actuel

### Base de données Cloud (PostgreSQL)
- **Utilisateurs**: 0
- **Workouts**: 0
- **Status**: Vide (prêt pour les nouveaux utilisateurs)

### Base de données Local (SQLite)
- **Utilisateurs**: 167 (tests)
- **Workouts**: Nombreux
- **Status**: Conservé pour les tests locaux

## 🔄 Basculer entre Local et Cloud

### Pour utiliser le CLOUD (production)
```typescript
// app/src/utils/api.ts
const USE_LOCAL_API = false;
```

### Pour utiliser le LOCAL (développement)
```typescript
// app/src/utils/api.ts
const USE_LOCAL_API = true;
```

## 🚀 Prochaines Étapes

### 1. Tester l'inscription sur le cloud
Dans l'app:
1. Ferme complètement l'app
2. Rouvre l'app
3. Crée un nouveau compte
4. Les données seront sur le cloud PostgreSQL

### 2. Vérifier les utilisateurs cloud
```bash
curl https://appli-v2.onrender.com/admin/users
```

### 3. Comptes de test
Tu peux créer des comptes de test directement dans l'app maintenant.

## ⚠️ Notes Importantes

### Envoi d'emails
L'inscription nécessite une vérification d'email. Si l'envoi d'email n'est pas configuré sur Render:
- Les utilisateurs peuvent s'inscrire
- Mais ils ne recevront pas d'email de vérification
- Ils peuvent quand même se connecter

### Configuration Email (optionnel)
Pour activer l'envoi d'emails sur Render, configure ces variables d'environnement:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`

## 🔍 Vérification

### API Cloud
```bash
curl https://appli-v2.onrender.com/health
# Devrait retourner: {"status":"ok"}
```

### Utilisateurs Cloud
```bash
curl https://appli-v2.onrender.com/admin/users
# Devrait retourner la liste des utilisateurs
```

## 📱 Utilisation

Maintenant quand tu utilises l'app:
- ✅ Les données sont stockées sur le cloud (PostgreSQL)
- ✅ Accessibles de n'importe où
- ✅ Partagées entre tous les appareils d'un même utilisateur
- ✅ Isolation complète entre utilisateurs

## 🎉 Résultat

L'app est maintenant configurée pour utiliser le cloud! Les nouveaux utilisateurs qui s'inscrivent auront leurs données sur PostgreSQL (Render).
