# Migration vers PostgreSQL

## ✅ Modifications effectuées

### 1. Dépendances
- Ajouté `psycopg2-binary>=2.9.9` dans `requirements.txt`

### 2. Configuration base de données (`api/src/api/db.py`)
- Support PostgreSQL et SQLite
- Conversion automatique `postgres://` → `postgresql://` (pour Render)
- Détection du type de base pour les requêtes SQL spécifiques

## 📋 Étapes à suivre sur Render

### 1. Créer la base PostgreSQL
1. Dashboard Render → **New +** → **PostgreSQL**
2. Configuration:
   - Name: `gorillax-db`
   - Database: `gorillax`
   - User: `gorillax_user`
   - Region: Virginia (même que l'API)
   - Plan: **Free**
3. Créer et **noter l'Internal Database URL**

### 2. Configurer l'API
1. Va sur le service **Appli_V2**
2. **Environment** → Add Environment Variable
3. Ajoute:
   ```
   Key: DATABASE_URL
   Value: [Internal Database URL de PostgreSQL]
   ```
4. Save Changes (le service redémarre automatiquement)

### 3. Vérifier le déploiement
1. Attends que le service redémarre (~2 min)
2. Teste: `curl https://appli-v2.onrender.com/health`
3. Les tables seront créées automatiquement au premier démarrage

## 🔄 Migration des données (optionnel)

Si tu veux garder les données de démo:

```bash
# 1. Exporter depuis SQLite
cd api
sqlite3 gorillax.db .dump > backup.sql

# 2. Adapter le SQL pour PostgreSQL (remplacer les types SQLite)
# 3. Importer dans PostgreSQL via Render Shell ou psql
```

Ou plus simple: relancer le script de seed:
```bash
cd api
uv run python scripts/seed_demo.py
```

## 🎯 Avantages PostgreSQL

- ✅ Données persistantes (pas de perte au redémarrage)
- ✅ Interface web pour voir les données
- ✅ Meilleure performance
- ✅ Plus de fonctionnalités SQL
- ✅ Backups automatiques
- ✅ Gratuit sur Render (500 MB)

## 🧪 Test en local

Pour tester avec PostgreSQL en local:

```bash
# 1. Installer PostgreSQL
brew install postgresql  # macOS
# ou apt-get install postgresql  # Linux

# 2. Créer une base locale
createdb gorillax_dev

# 3. Configurer l'URL dans .env
echo "DATABASE_URL=postgresql://localhost/gorillax_dev" >> api/.env

# 4. Lancer l'API
cd api
uv run uvicorn src.api.main:app --reload
```

## 🔙 Rollback (si problème)

Pour revenir à SQLite:
1. Render → Appli_V2 → Environment
2. Supprimer la variable `DATABASE_URL`
3. Save Changes

L'API utilisera automatiquement SQLite.
