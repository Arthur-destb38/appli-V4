from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routes import exercises
from .routes import feed
from .routes import health
from .routes import programs
from .routes import stories
from .routes import users_stats
from .routes import share
from .routes import likes
from .routes import profile
from .routes import explore
from .routes import notifications
from .routes import leaderboard
from .routes import auth
from .routes import shared_workouts
from .routes import sync
from .routes import users
from .routes import seed
from .routes import messaging
from .seeds import seed_exercises
from .services.exercise_loader import import_exercises_from_url
from sqlmodel import Session, select, func
from .db import get_engine
from .models import Exercise


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    
    # Charger les exercices au démarrage si la base est vide
    engine = get_engine()
    with Session(engine) as session:
        exercise_count = session.exec(select(func.count()).select_from(Exercise)).one()
        
        # Si pas d'exercices, essayer de charger depuis une URL ou utiliser le seed par défaut
        if exercise_count == 0:
            # Vérifier si une URL d'exercices est configurée
            exercises_url = os.getenv("EXERCISES_URL")
            if exercises_url:
                try:
                    result = import_exercises_from_url(session, exercises_url, force=False)
                    print(f"✅ Chargé {result['imported']} exercices depuis {exercises_url}")
                except Exception as e:
                    print(f"⚠️  Erreur lors du chargement depuis {exercises_url}: {e}")
                    print("📦 Utilisation du seed par défaut...")
                    seed_exercises(force=False)
            else:
                # Utiliser le seed par défaut
                inserted = seed_exercises(force=False)
                if inserted > 0:
                    print(f"📦 {inserted} exercices par défaut chargés")
    
    yield


app = FastAPI(title="Gorillax API", version="0.1.0", lifespan=lifespan)

# Configuration CORS pour autoriser les requêtes depuis l'app mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise toutes les origines (app mobile, web, etc.)
    allow_credentials=True,
    allow_methods=["*"],  # Autorise toutes les méthodes (GET, POST, PUT, DELETE, OPTIONS)
    allow_headers=["*"],  # Autorise tous les headers
)

app.include_router(health.router)
app.include_router(exercises.router)
app.include_router(share.router)
app.include_router(feed.router)
app.include_router(shared_workouts.router)
app.include_router(sync.router)
app.include_router(users.router)
app.include_router(programs.router)
app.include_router(stories.router)
app.include_router(users_stats.router)
app.include_router(auth.router)
app.include_router(likes.router)
app.include_router(profile.router)
app.include_router(explore.router)
app.include_router(notifications.router)
app.include_router(leaderboard.router)
app.include_router(seed.router)
app.include_router(messaging.router)


@app.get("/", tags=["meta"], summary="API metadata")
async def read_root() -> dict[str, str]:
    return {"status": "running"}
