# 🧪 Guide de Test - Synchronisation Backend/Frontend

## 📋 Vue d'ensemble

Ce guide vous permet de vérifier que la synchronisation fonctionne correctement entre le frontend (React Native) et le backend (FastAPI).

---

## ✅ Tests Automatiques (Backend)

### Lancer les tests backend

```bash
cd api
uv run pytest src/api/tests/test_sync.py -v
```

**Tests existants :**
- ✅ `test_push_creates_workout` - Vérifie la création d'un workout via push
- ✅ `test_push_fallback_event` - Vérifie la création d'un SyncEvent pour les actions non-workout
- ✅ `test_pull_returns_workout_events` - Vérifie que le pull retourne les événements

**Résultat attendu :** Tous les tests passent ✅

---

## 🧪 Tests Manuels - Scénarios Complets

### Prérequis

1. **Backend démarré** :
   ```bash
   cd api
   uv run uvicorn api.main:app --reload
   ```

2. **Frontend démarré** :
   ```bash
   cd app
   pnpm start
   ```

3. **Deux devices/simulateurs** (ou un device + un simulateur) pour tester la synchronisation multi-appareils

---

## 📱 Scénario 1 : Création et Synchronisation Basique

### Objectif
Vérifier qu'un workout créé localement est synchronisé avec le serveur.

### Étapes

1. **Créer un workout dans l'app** :
   - Ouvrir l'app
   - Aller sur "Créer une séance"
   - Donner un titre : "Test Sync - Pull Day"
   - Ajouter 1-2 exercices
   - Sauvegarder

2. **Vérifier localement** :
   - Le workout apparaît dans "Historique"
   - Le workout a un `client_id` (visible dans les logs)

3. **Vérifier la synchronisation** :
   - Attendre quelques secondes (la sync se fait automatiquement)
   - Vérifier dans les logs de l'app : `console.log` devrait montrer "Sync successful"
   - Le workout devrait maintenant avoir un `server_id`

4. **Vérifier côté backend** :
   ```bash
   # Vérifier dans la base de données
   cd api
   uv run python -c "
   from api.db import get_engine
   from api.models import Workout
   from sqlmodel import Session, select
   
   with Session(get_engine()) as session:
       workouts = session.exec(select(Workout)).all()
       print(f'Workouts dans la DB: {len(workouts)}')
       for w in workouts:
           print(f'  - {w.title} (id: {w.id}, client_id: {w.client_id})')
   "
   ```

**✅ Succès si :**
- Le workout apparaît dans la DB backend
- Le `server_id` est présent dans l'app
- Le `client_id` correspond entre app et DB

---

## 📱 Scénario 2 : Synchronisation Bidirectionnelle

### Objectif
Vérifier que les changements du serveur sont récupérés par l'app.

### Étapes

1. **Créer un workout dans l'app (Device A)** :
   - Créer "Test Sync - Device A"
   - Attendre la synchronisation

2. **Vérifier sur Device B** :
   - Ouvrir l'app sur Device B (ou rafraîchir)
   - Le workout "Test Sync - Device A" devrait apparaître
   - Vérifier que le `server_id` est présent

3. **Modifier le workout sur Device B** :
   - Changer le titre en "Test Sync - Device A - Modifié"
   - Attendre la synchronisation

4. **Vérifier sur Device A** :
   - Rafraîchir l'app
   - Le titre devrait être mis à jour

**✅ Succès si :**
- Les changements sont synchronisés dans les deux sens
- Pas de doublons
- Les `server_id` correspondent

---

## 📱 Scénario 3 : Mode Offline

### Objectif
Vérifier que les mutations sont mises en queue quand offline et synchronisées quand online.

### Étapes

1. **Créer un workout en mode offline** :
   - Désactiver le WiFi/Données
   - Créer un workout : "Test Offline"
   - Ajouter des exercices et séries
   - Le workout devrait être créé localement

2. **Vérifier la queue de mutations** :
   - Dans les logs de l'app, vérifier que les mutations sont en queue
   - Le badge "à synchroniser" devrait apparaître (si implémenté)

3. **Réactiver le réseau** :
   - Activer le WiFi/Données
   - Attendre quelques secondes
   - Les mutations devraient être envoyées automatiquement

4. **Vérifier la synchronisation** :
   - Le workout devrait apparaître dans la DB backend
   - Le `server_id` devrait être assigné

**✅ Succès si :**
- Les mutations sont mises en queue en offline
- La synchronisation se fait automatiquement en online
- Aucune perte de données

---

## 📱 Scénario 4 : Conflits et Résolution

### Objectif
Vérifier que les conflits sont gérés correctement (Last-Writer-Wins).

### Étapes

1. **Créer un workout sur Device A** :
   - Créer "Test Conflit"
   - Synchroniser

2. **Modifier simultanément sur Device A et B** :
   - Device A : Changer le titre en "Titre A"
   - Device B : Changer le titre en "Titre B"
   - Synchroniser les deux

3. **Vérifier la résolution** :
   - Le dernier changement (par `updated_at`) devrait gagner
   - Pas de doublons
   - Les deux devices devraient avoir le même titre final

**✅ Succès si :**
- Un seul titre final (le plus récent)
- Pas d'erreurs de synchronisation
- Cohérence entre les devices

---

## 🔍 Vérifications Techniques

### 1. Vérifier les types de données

**Frontend** :
```typescript
// Dans l'app, vérifier que server_id est bien un string
const workout = await fetchWorkouts();
console.log('server_id type:', typeof workout[0].workout.server_id); // devrait être "string"
```

**Backend** :
```python
# Dans la DB, vérifier que les IDs sont des strings (UUIDs)
from api.models import Workout
workout = session.get(Workout, "some-uuid")
print(type(workout.id))  # devrait être <class 'str'>
```

### 2. Vérifier les logs de synchronisation

**Frontend** :
- Ouvrir les DevTools React Native
- Chercher les logs : `"Sync successful"`, `"Failed to push mutations"`, `"Failed to pull changes"`
- Vérifier qu'il n'y a pas d'erreurs de type

**Backend** :
- Vérifier les logs du serveur FastAPI
- Chercher les erreurs 400/500 sur `/sync/push` et `/sync/pull`

### 3. Vérifier la queue de mutations

**Frontend** :
```typescript
// Dans useWorkouts, vérifier la queue
const { pendingMutations } = useWorkouts();
console.log('Mutations en attente:', pendingMutations);
```

**Backend** :
```bash
# Vérifier les SyncEvent dans la DB
uv run python -c "
from api.db import get_engine
from api.models import SyncEvent
from sqlmodel import Session, select

with Session(get_engine()) as session:
    events = session.exec(select(SyncEvent)).all()
    print(f'SyncEvents dans la DB: {len(events)}')
    for e in events:
        print(f'  - {e.action} (id: {e.id}, created_at: {e.created_at})')
"
```

---

## 🐛 Dépannage

### Problème : Les workouts ne se synchronisent pas

**Vérifications :**
1. ✅ Le backend est démarré et accessible
2. ✅ L'URL de l'API est correcte dans `.env` : `EXPO_PUBLIC_API_URL`
3. ✅ L'authentification fonctionne (token JWT valide)
4. ✅ Les logs ne montrent pas d'erreurs réseau

**Solution :**
```bash
# Vérifier la connexion au backend
curl -X GET "http://localhost:8000/health" -H "Authorization: Bearer YOUR_TOKEN"
```

### Problème : Erreur de type `server_id`

**Vérifications :**
1. ✅ `server_id` est bien `string` partout (pas `number`)
2. ✅ Les types TypeScript sont corrects
3. ✅ Le backend retourne bien des UUIDs (strings)

**Solution :**
- Vérifier que tous les fichiers ont été mis à jour (voir corrections précédentes)
- Relancer l'app après les modifications

### Problème : Doublons de workouts

**Vérifications :**
1. ✅ La logique de matching `client_id` / `server_id` fonctionne
2. ✅ Pas de création multiple pour le même `client_id`

**Solution :**
- Vérifier la fonction `applyRemoteEvent` dans `useWorkouts.tsx`
- S'assurer que les workouts sont trouvés par `client_id` ou `server_id`

---

## 📊 Checklist de Validation

Avant de considérer la synchronisation comme fonctionnelle :

- [ ] **Tests backend passent** : `pytest test_sync.py`
- [ ] **Création locale → Serveur** : Un workout créé apparaît dans la DB
- [ ] **Serveur → App** : Un workout créé ailleurs apparaît dans l'app
- [ ] **Modification bidirectionnelle** : Les changements se propagent
- [ ] **Mode offline** : Les mutations sont mises en queue et synchronisées
- [ ] **Types cohérents** : `server_id` est `string` partout
- [ ] **Pas de doublons** : Un workout n'apparaît qu'une fois
- [ ] **Pas d'erreurs** : Aucune erreur dans les logs
- [ ] **Performance** : La sync ne bloque pas l'UI
- [ ] **Résilience** : Les erreurs réseau sont gérées gracieusement

---

## 🚀 Tests E2E Recommandés

Pour une validation complète, exécuter ces scénarios dans l'ordre :

1. ✅ Créer 3 workouts différents
2. ✅ Modifier le titre de chaque workout
3. ✅ Ajouter des exercices et séries
4. ✅ Terminer un workout (status: "completed")
5. ✅ Supprimer un workout
6. ✅ Tester en mode offline (créer, modifier, supprimer)
7. ✅ Réactiver le réseau et vérifier la synchronisation
8. ✅ Tester sur 2 devices simultanément

---

## 📝 Notes

- La synchronisation se fait **automatiquement** toutes les X secondes (vérifier dans `useWorkouts.tsx`)
- Les mutations sont **mises en queue** si le réseau n'est pas disponible
- La stratégie de résolution de conflits est **Last-Writer-Wins** (basé sur `updated_at`)
- Les `server_id` sont des **UUIDs** (strings), pas des nombres

---

**Dernière mise à jour** : Après correction des types `server_id` (number → string)

