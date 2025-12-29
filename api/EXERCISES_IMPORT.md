# Import d'exercices depuis une source externe

Cette fonctionnalité permet de charger des exercices depuis une URL externe (Google Drive, fichier JSON hébergé, etc.).

## Format du fichier JSON

Le fichier JSON doit être un tableau d'objets avec la structure suivante :

```json
[
  {
    "name": "Squat",
    "muscle_group": "quads",
    "equipment": "barbell",
    "description": "Back squat focusing on quads and glutes.",
    "image_url": "https://example.com/image.jpg",  // optionnel
    "source_type": "external",  // optionnel, défaut: "external"
    "source_value": "https://example.com"  // optionnel
  },
  ...
]
```

### Champs requis :
- `name` : Nom de l'exercice
- `muscle_group` : Groupe musculaire (ex: "chest", "back", "legs", "shoulders", "arms", "abs", "quads", "hamstrings", "glutes", "calves")
- `equipment` : Équipement nécessaire (ex: "barbell", "dumbbell", "bodyweight", "machine", "cable")

### Champs optionnels :
- `description` : Description de l'exercice
- `image_url` : URL d'une image de l'exercice
- `source_type` : Type de source (défaut: "external")
- `source_value` : Valeur de la source (défaut: URL du fichier)

## Méthodes d'import

### 1. Via l'API (recommandé)

**Endpoint** : `POST /exercises/import`

**Body** :
```json
{
  "url": "https://drive.google.com/file/d/VOTRE_FILE_ID/view?usp=sharing",
  "force": false
}
```

**Exemple avec curl** :
```bash
curl -X POST "http://localhost:8000/exercises/import" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://drive.google.com/file/d/VOTRE_FILE_ID/view?usp=sharing",
    "force": false
  }'
```

**Exemple avec Swagger** :
1. Ouvrir http://localhost:8000/docs
2. Aller sur `/exercises/import`
3. Cliquer sur "Try it out"
4. Entrer l'URL et cliquer sur "Execute"

### 2. Via variable d'environnement (au démarrage)

Si la base de données est vide au démarrage de l'API, elle chargera automatiquement les exercices depuis l'URL configurée.

**Configuration** :
```bash
export EXERCISES_URL="https://drive.google.com/file/d/VOTRE_FILE_ID/view?usp=sharing"
```

Ou dans un fichier `.env` :
```
EXERCISES_URL=https://drive.google.com/file/d/VOTRE_FILE_ID/view?usp=sharing
```

## Google Drive

### Comment obtenir un lien de partage

1. Uploader votre fichier JSON sur Google Drive
2. Clic droit sur le fichier → "Partager" → "Obtenir le lien"
3. Changer les permissions en "Toute personne disposant du lien"
4. Copier le lien

### Formats de liens supportés

- Lien de partage : `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- Lien direct : `https://drive.google.com/uc?export=download&id=FILE_ID`
- Les deux formats sont automatiquement convertis

### Exemple

Si votre lien Google Drive est :
```
https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view?usp=sharing
```

Vous pouvez l'utiliser directement dans l'API, il sera automatiquement converti en lien de téléchargement.

## Autres sources

### GitHub Gist

1. Créer un Gist avec votre fichier JSON
2. Cliquer sur "Raw" pour obtenir le lien direct
3. Utiliser ce lien dans l'API

Exemple :
```
https://gist.githubusercontent.com/user/gist_id/raw/filename.json
```

### Fichier hébergé

Toute URL pointant vers un fichier JSON valide fonctionne :
- GitHub Raw
- Pastebin (format raw)
- Votre propre serveur
- etc.

## Exemple de fichier complet

Voir `exercises_example.json` dans le répertoire `api/` pour un exemple complet avec 20 exercices.

## Dépannage

### Erreur : "Le JSON doit être un tableau d'exercices"
- Vérifiez que votre fichier JSON commence par `[` et se termine par `]`
- Vérifiez que c'est un tableau, pas un objet

### Erreur : "L'exercice 'X' manque les champs: name"
- Vérifiez que chaque exercice a les champs requis : `name`, `muscle_group`, `equipment`

### Erreur : "Erreur lors de la requête HTTP"
- Vérifiez que le lien est accessible publiquement
- Pour Google Drive, assurez-vous que les permissions sont "Toute personne disposant du lien"
- Vérifiez votre connexion internet

### Aucun exercice importé
- Vérifiez que les exercices n'existent pas déjà (même nom + même groupe musculaire)
- Utilisez `"force": true` pour remplacer les exercices existants

## Notes

- Les exercices avec le même slug (nom + groupe musculaire) ne seront pas dupliqués
- Le champ `force: true` supprime tous les exercices existants avant d'importer
- L'import est idempotent : relancer l'import avec les mêmes données ne créera pas de doublons


