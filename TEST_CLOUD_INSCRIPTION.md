# 📱 Test d'Inscription sur le Cloud

## ⚠️ Problème Détecté

L'inscription via l'API cloud échoue avec une erreur 500. C'est probablement lié à l'envoi d'email qui n'est pas configuré sur Render.

## ✅ Solution: Tester directement dans l'app

### Étapes pour tester:

1. **Ferme complètement l'app** (swipe up)

2. **Rouvre l'app**

3. **Clique sur "S'inscrire"**

4. **Crée un compte avec:**
   - Username: `test_cloud`
   - Email: `test@example.com`
   - Password: `TestCloud123`

5. **Si ça fonctionne:**
   - Tu seras connecté automatiquement
   - Les données seront sur le cloud
   - Vérifie avec: `curl https://appli-v2.onrender.com/admin/users`

6. **Si ça ne fonctionne pas:**
   - L'erreur sera affichée dans l'app
   - On devra configurer l'envoi d'email sur Render

## 🔧 Configuration Email (si nécessaire)

Sur Render, ajoute ces variables d'environnement:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ton-email@gmail.com
SMTP_PASSWORD=ton-mot-de-passe-app
FROM_EMAIL=noreply@gorillax.app
```

## 📊 Vérifier les Utilisateurs Cloud

```bash
curl https://appli-v2.onrender.com/admin/users | python3 -m json.tool
```

## 🎯 État Actuel

- ✅ API Cloud: Opérationnelle
- ✅ App: Configurée pour le cloud
- ❌ Inscription: Échoue (erreur email)
- ⏳ Solution: Tester dans l'app ou configurer l'email

## 💡 Alternative Temporaire

Pour tester sans email, on peut:
1. Revenir au local (`USE_LOCAL_API = true`)
2. Créer des comptes en local
3. Tester l'isolation des utilisateurs
4. Puis configurer l'email sur Render pour la production
