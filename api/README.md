# Gorillax API

Backend FastAPI pour Gorillax MVP.

## Installation

```bash
uv sync
```

## Lancer l'API (hot reload)

```bash
uv run uvicorn api.main:app --reload
```

## Qualité & tests

```bash
uv run ruff check
uv run mypy src
uv run pytest
```

## Seed des exercices

### Option 1 : Import depuis Google Drive (recommandé)

Les exercices sont automatiquement chargés depuis Google Drive au démarrage si la base est vide.

**Configuration** :
```bash
export EXERCISES_URL="https://drive.google.com/file/d/1tK7OdUg96GSYgNPO08bukqb-gZOmxpHY/view?usp=sharing"
```

Ou crée un fichier `.env` :
```
EXERCISES_URL=https://drive.google.com/file/d/1tK7OdUg96GSYgNPO08bukqb-gZOmxpHY/view?usp=sharing
```

**Import manuel via l'API** :
```bash
curl -X POST "http://localhost:8000/exercises/import" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://drive.google.com/file/d/1tK7OdUg96GSYgNPO08bukqb-gZOmxpHY/view?usp=sharing", "force": false}'
```

### Option 2 : Seed par défaut (16 exercices)

```bash
uv run python scripts/seed.py
```

Voir [EXERCISES_IMPORT.md](./EXERCISES_IMPORT.md) pour plus de détails.

## Reset complet de la base

```bash
uv run python scripts/reset_db.py
```
