

## 🧱 Arborescence projet



gorillax-mvp/
├─ app/   ← 🔥 Frontend (React Native + Expo)
└─ api/   ← ⚙️ Backend (FastAPI)


gorillax-mvp/
├─ README.md
├─ LICENSE
├─ .gitignore
├─ .editorconfig
├─ package.json                  # scripts à la racine (ex: dev, lint)
├─ pnpm-workspace.yaml
├─ .github/
│  └─ workflows/
│     └─ ci.yml                  # lint + tests (app & api)
│
├─ docs/
│  └─ MVP_Plan_Gorillax.md       # ton plan détaillé
│
├─ app/                          # Frontend mobile (Expo React Native)
│  ├─ app.json
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ babel.config.js
│  ├─ .eslintrc.cjs
│  ├─ .prettierrc
│  ├─ assets/
│  │  ├─ icon.png
│  │  └─ splash.png
│  └─ src/
│     ├─ main.tsx                # entry Expo
│     ├─ navigation/
│     │  ├─ index.tsx            # Stack/Tab navigator
│     │  └─ routes.ts            # noms de routes centralisés
│     ├─ screens/
│     │  ├─ HomeScreen.tsx
│     │  ├─ CreateWorkoutScreen.tsx
│     │  ├─ TrackWorkoutScreen.tsx
│     │  ├─ HistoryScreen.tsx
│     │  ├─ ImportFromWebScreen.tsx
│     │  ├─ FeedScreen.tsx
│     │  └─ SharedWorkoutScreen.tsx
│     ├─ components/
│     │  ├─ ExerciseCard.tsx
│     │  ├─ SetRow.tsx
│     │  ├─ Button.tsx
│     │  ├─ Input.tsx
│     │  └─ EmptyState.tsx
│     ├─ data/
│     │  └─ seed_exercises.json  # 15 exos de base
│     ├─ db/
│     │  ├─ client.ts            # Expo SQLite init
│     │  └─ schema.ts            # CREATE TABLE (...), helpers
│     ├─ api/
│     │  ├─ client.ts            # fetch wrapper + React Query
│     │  ├─ exercises.ts
│     │  ├─ workouts.ts
│     │  └─ share.ts
│     ├─ hooks/
│     │  ├─ useWorkouts.ts
│     │  └─ useExercises.ts
│     ├─ theme/
│     │  ├─ colors.ts
│     │  └─ spacing.ts
│     └─ utils/
│        ├─ slug.ts
│        └─ format.ts
│
└─ api/                          # Backend (FastAPI)
   ├─ pyproject.toml             # ou requirements.txt si tu préfères
   ├─ uv.lock
   ├─ .ruff.toml
   ├─ mypy.ini
   ├─ .env.example
   ├─ alembic.ini                # (si tu utilises Alembic)
   ├─ main.py                    # FastAPI app + routers include
   ├─ db.py                      # session + init SQLite
   ├─ models.py                  # SQLModel tables
   ├─ schemas.py                 # Pydantic (I/O)
   ├─ deps.py                    # deps (auth simple, db session)
   ├─ routes/
   │  ├─ health.py               # GET /health, /version
   │  ├─ exercises.py            # CRUD + import-url
   │  ├─ workouts.py             # création/suivi
   │  ├─ share.py                # share_id, feed
   │  └─ follow.py               # follow/unfollow
   ├─ services/
   │  ├─ og_scraper.py           # OpenGraph fetch (titre, image, desc)
   │  └─ dedup.py                # slug, alias, heuristiques
   ├─ migrations/                # (si Alembic)
   └─ tests/
      ├─ test_exercises.py
      ├─ test_workouts.py
      └─ test_share.py


# Front
pnpm create expo@latest app && cd app && pnpm expo start

# Back (recommandé)
# depuis `api/` :
uv venv && uv pip install fastapi uvicorn sqlmodel httpx alembic python-slugify
uv run uvicorn main:app --reload

### Notes supplémentaires
- Alembic : le projet inclut `alembic.ini` et un dossier `migrations/` pour versionner les modifications de schéma.
- Sync : prévoir côté backend des endpoints de synchronisation (ex. POST `/sync/push`, GET `/sync/pull?since=`) ou s'appuyer sur `updated_at` dans les endpoints CRUD.
- Modèle utilisateur : ajouter `consent_to_public_share` (bool) dans `models.py` pour gérer l'opt-in au partage public.