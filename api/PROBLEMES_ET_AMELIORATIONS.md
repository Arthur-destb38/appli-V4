# 🔴 Problèmes Critiques et Améliorations

## 🚨 CRITIQUE - Sécurité

### 1. **Utilisation de `eval()` dans l'authentification** ⚠️ VULNÉRABILITÉ MAJEURE
**Fichier**: `src/api/utils/auth.py:32`

```python
payload = eval(decoded)  # ❌ DANGEREUX !
```

**Problème**: `eval()` permet l'exécution de code arbitraire. Un attaquant pourrait injecter du code malveillant dans les tokens.

**Solution**: Utiliser `json.loads()` ou `ast.literal_eval()`:
```python
import json
payload = json.loads(decoded)
```

### 2. **Secret JWT par défaut faible**
**Fichier**: `src/api/utils/auth.py:11`

```python
return os.getenv("AUTH_SECRET", "dev-secret-change-me").encode()
```

**Problème**: Secret par défaut connu et faible.

**Solution**: 
- Exiger `AUTH_SECRET` en production (lever une exception si absent)
- Générer un secret fort au premier démarrage
- Documenter dans le README

### 3. **CORS trop permissif**
**Fichier**: `src/api/main.py:67`

```python
allow_origins=["*"]  # ❌ Autorise toutes les origines
```

**Problème**: En production, cela permet à n'importe quel site de faire des requêtes.

**Solution**: 
```python
allow_origins=os.getenv("CORS_ORIGINS", "*").split(",")  # Dev uniquement
# En prod: allow_origins=["https://votre-app.com"]
```

### 4. **Pas d'authentification sur la plupart des endpoints**
**Problème**: Seul `/auth/me` utilise `Depends(_get_current_user)`. Tous les autres endpoints sont publics.

**Endpoints non protégés**:
- `/feed/*` - Peut créer des utilisateurs
- `/share/*` - Peut partager n'importe quoi
- `/likes/*` - Peut liker/commenter sans auth
- `/users/*` - Peut modifier n'importe quel profil
- `/programs/*` - Peut créer/modifier des programmes
- `/sync/*` - Synchronisation sans vérification

**Solution**: Ajouter `Depends(_get_current_user)` aux endpoints sensibles.

## 🐛 Bugs

### 5. **Type mismatch: `program_id` devrait être `str`**
**Fichier**: `src/api/routes/programs.py:136`

```python
def get_program(program_id: int, session: Session = ...):  # ❌ int
```

**Problème**: Le modèle `Program` utilise `id: str` (UUID), mais la route attend un `int`.

**Solution**:
```python
def get_program(program_id: str, session: Session = ...):  # ✅ str
```

### 6. **Type mismatch: `workout_id` dans `_fetch_workout_snapshot`**
**Fichier**: `src/api/routes/share.py:21`

```python
def _fetch_workout_snapshot(session: Session, workout_id: int) -> dict:  # ❌ int
```

**Problème**: `Workout.id` est un `str` (UUID).

**Solution**:
```python
def _fetch_workout_snapshot(session: Session, workout_id: str) -> dict:  # ✅ str
```

### 7. **Gestion d'erreur manquante pour `datetime.fromisoformat`**
**Fichier**: `src/api/routes/feed.py:77`

```python
parsed_cursor = datetime.fromisoformat(cursor)  # ❌ Peut lever ValueError
```

**Problème**: Si `cursor` est mal formaté, l'API crash.

**Solution**:
```python
try:
    parsed_cursor = datetime.fromisoformat(cursor)
except ValueError:
    raise HTTPException(status_code=400, detail="Invalid cursor format")
```

## ⚡ Performance

### 8. **Requêtes N+1 dans le feed**
**Fichier**: `src/api/routes/feed.py:88-99`

**Problème**: Pour chaque share, on fait 3 requêtes séparées (commentaires, count commentaires, count likes).

**Solution**: Utiliser des jointures et `func.count()`:
```python
from sqlalchemy import func
from sqlmodel import select

# Une seule requête avec jointures
shares_with_counts = session.exec(
    select(
        Share,
        func.count(Like.id).label('like_count'),
        func.count(Comment.id).label('comment_count')
    )
    .outerjoin(Like, Like.share_id == Share.share_id)
    .outerjoin(Comment, Comment.share_id == Share.share_id)
    .group_by(Share.share_id)
    .order_by(Share.created_at.desc())
    .limit(limit + 1)
).all()
```

### 9. **Chargement de tous les utilisateurs en mémoire**
**Fichier**: `src/api/routes/explore.py:143,165`

```python
users = session.exec(select(User)).all()  # ❌ Charge TOUS les users
shares = session.exec(select(Share)).all()  # ❌ Charge TOUS les shares
```

**Problème**: Avec beaucoup d'utilisateurs/shares, cela consomme beaucoup de mémoire.

**Solution**: Filtrer directement en SQL:
```python
# Pour la recherche
users = session.exec(
    select(User)
    .where(
        (User.username.ilike(f"%{query}%")) |
        (User.bio.ilike(f"%{query}%") if User.bio else False)
    )
    .limit(limit)
).all()
```

### 10. **Comptage inefficace dans explore.py**
**Fichier**: `src/api/routes/explore.py:52-62`

**Problème**: Charge 100 shares puis compte les likes un par un.

**Solution**: Utiliser une sous-requête ou une jointure avec `func.count()`.

## 🔧 Améliorations

### 11. **Validation des emails manquante**
**Fichier**: `src/api/routes/users.py:38`

```python
email=f"{payload.id}@temp.local",  # ❌ Email invalide
```

**Solution**: Valider les emails avec Pydantic ou regex.

### 12. **Pas de limite sur la longueur des commentaires dans le modèle**
**Fichier**: `src/api/models.py:136`

```python
content: str  # ❌ Pas de limite
```

**Solution**: Ajouter une validation:
```python
content: str = Field(max_length=500)
```

### 13. **Gestion des erreurs trop générique**
**Fichier**: `src/api/routes/auth.py:37`

```python
except Exception:  # ❌ Trop large
    raise HTTPException(...)
```

**Solution**: Capturer des exceptions spécifiques:
```python
except (ValueError, KeyError) as e:
    raise HTTPException(status_code=401, detail="invalid_token")
```

### 14. **Pas de validation sur `user_id` dans les requêtes**
**Problème**: Les `user_id` passés en query params ne sont pas validés (format UUID, existence, etc.).

**Solution**: Créer un validator Pydantic ou un dependency.

### 15. **Refresh tokens jamais nettoyés**
**Problème**: Les refresh tokens expirés restent en base.

**Solution**: Ajouter un job de nettoyage périodique ou un middleware.

### 16. **Pas de rate limiting**
**Problème**: Pas de protection contre le spam/brute force.

**Solution**: Ajouter `slowapi` ou `fastapi-limiter`.

### 17. **Logs insuffisants**
**Problème**: Pas de logging pour les actions importantes (login, partage, etc.).

**Solution**: Ajouter `logging` pour les événements critiques.

### 18. **Pas de validation sur les slugs d'exercices**
**Fichier**: `src/api/utils/slug.py`

**Problème**: Si deux exercices ont le même nom et groupe musculaire, le slug sera identique mais l'unicité n'est pas garantie.

**Solution**: Vérifier l'unicité avant insertion ou ajouter un index unique.

### 19. **Transaction manquante dans certains endpoints**
**Problème**: Certaines opérations multi-étapes ne sont pas dans une transaction.

**Solution**: Utiliser `session.begin()` pour garantir l'atomicité.

### 20. **Pas de pagination sur certains endpoints**
**Fichier**: `src/api/routes/explore.py`, `src/api/routes/users.py`

**Problème**: Certains endpoints retournent toutes les données.

**Solution**: Ajouter pagination avec `limit` et `offset` ou cursor-based.

## 📝 TODO identifiés

1. **`src/api/routes/leaderboard.py:85`**: `change=0,  # TODO: calculer le changement`

## 🎯 Priorités

### 🔴 URGENT (Sécurité)
1. Remplacer `eval()` par `json.loads()`
2. Exiger `AUTH_SECRET` en production
3. Restreindre CORS en production
4. Ajouter authentification aux endpoints sensibles

### 🟠 IMPORTANT (Bugs)
5. Corriger les types `int` → `str` pour les IDs
6. Ajouter gestion d'erreurs pour `fromisoformat`

### 🟡 RECOMMANDÉ (Performance)
7. Optimiser les requêtes N+1
8. Filtrer en SQL au lieu de charger tout en mémoire

### 🟢 AMÉLIORATIONS
9. Validation des emails
10. Rate limiting
11. Logging
12. Nettoyage des tokens expirés

