from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

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
from .routes import admin
from .routes import wallet
from .routes import salle
from .routes import subscriptions
from .routes import marketplace

_IS_PRODUCTION = os.getenv("ENVIRONMENT", "").lower() == "production"
from .seeds import seed_exercises
from .services.exercise_loader import import_exercises_from_url
from sqlmodel import Session, select, func
from .db import get_engine, set_session_user_id
from .models import Exercise, User
from .utils.auth import hash_password


def ensure_demo_user() -> None:
    """Crée ou met à jour le compte démo (demo / DemoPassword123) au démarrage."""
    try:
        engine = get_engine()
        with Session(engine) as session:
            # Chercher par username puis par email (évite UNIQUE constraint si l'email existe déjà)
            demo = session.exec(select(User).where(User.username == "demo")).first()
            if not demo:
                demo = session.exec(select(User).where(User.email == "demo@gorillax.local")).first()
            if demo:
                # RLS : autoriser l'UPDATE en définissant le contexte "utilisateur courant"
                set_session_user_id(session, str(demo.id))
                demo.username = "demo"
                demo.email = "demo@gorillax.local"
                demo.password_hash = hash_password("DemoPassword123")
                demo.email_verified = True
                if getattr(demo, "bio", None) is None or demo.bio == "":
                    demo.bio = "Compte de démonstration 🦍"
                if getattr(demo, "objective", None) is None or demo.objective == "":
                    demo.objective = "Découvrir Gorillax"
                session.add(demo)
                session.commit()
                print("✅ Compte demo mis à jour (username: demo, password: DemoPassword123)")
            else:
                demo_user = User(
                    id="demo",
                    username="demo",
                    email="demo@gorillax.local",
                    password_hash=hash_password("DemoPassword123"),
                    consent_to_public_share=True,
                    bio="Compte de démonstration 🦍",
                    objective="Découvrir Gorillax",
                    email_verified=True,
                )
                session.add(demo_user)
                session.commit()
                print("✅ Compte demo créé (username: demo, password: DemoPassword123)")
    except Exception as e:
        print(f"⚠️  Compte demo non créé (vérifier que la migration auth est appliquée): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    ensure_demo_user()

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

cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
if _IS_PRODUCTION and "*" in cors_origins:
    cors_origins = [
        "https://appli-v2.onrender.com",
        "https://gorillax.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Configurable via CORS_ORIGINS env var
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicit methods
    allow_headers=["Authorization", "Content-Type", "Accept", "X-API-Key"],  # Explicit headers
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
app.include_router(messaging.router)
app.include_router(wallet.router)
app.include_router(salle.router)
app.include_router(subscriptions.router)
app.include_router(marketplace.router)

if not _IS_PRODUCTION:
    app.include_router(seed.router)
    app.include_router(admin.router)


@app.get("/privacy", response_class=HTMLResponse, include_in_schema=False)
def privacy_policy():
    return HTMLResponse(content="""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Politique de confidentialité — Gorillax</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1218; color: #e2e8f0; line-height: 1.7; }
    .container { max-width: 760px; margin: 0 auto; padding: 48px 24px 80px; }
    header { text-align: center; margin-bottom: 48px; }
    .logo { font-size: 40px; margin-bottom: 12px; }
    h1 { font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 8px; }
    .subtitle { color: #94a3b8; font-size: 15px; }
    .badge { display: inline-flex; align-items: center; gap: 8px; background: #10b98115; border: 1px solid #10b98130; color: #10b981; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-top: 16px; }
    .section { background: #1a2035; border: 1px solid #2d3748; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
    .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    h2 { font-size: 17px; font-weight: 700; color: #fff; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.8; }
    ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    ul li { color: #94a3b8; font-size: 14px; padding-left: 20px; position: relative; }
    ul li::before { content: '•'; position: absolute; left: 0; color: #10b981; font-weight: bold; }
    .contact-email { display: inline-flex; align-items: center; gap: 8px; background: #3b82f620; color: #60a5fa; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; margin-top: 12px; text-decoration: none; }
    footer { text-align: center; color: #475569; font-size: 13px; margin-top: 40px; }
    a { color: #60a5fa; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">🦍</div>
      <h1>Politique de confidentialité</h1>
      <p class="subtitle">Gorillax — Application mobile de fitness</p>
      <div class="badge">✓ Aucune donnée vendue à des tiers</div>
    </header>

    <div class="section">
      <div class="section-header">
        <div class="icon" style="background:#6366f120">📱</div>
        <h2>Données collectées</h2>
      </div>
      <ul>
        <li>Adresse email et nom d'utilisateur (création de compte)</li>
        <li>Données d'entraînement : séances, exercices, séries, poids, répétitions</li>
        <li>Données de profil : photo, biographie, objectifs fitness</li>
        <li>Contenu social : posts partagés, likes, commentaires (uniquement si tu choisis de partager)</li>
        <li>Données d'abonnement : statut premium via RevenueCat (aucune donnée bancaire stockée)</li>
      </ul>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="icon" style="background:#10b98120">🎯</div>
        <h2>Utilisation des données</h2>
      </div>
      <ul>
        <li>Fournir les fonctionnalités de l'application (suivi d'entraînement, programmes, feed social)</li>
        <li>Authentifier ton compte et sécuriser l'accès</li>
        <li>Gérer ton abonnement premium</li>
        <li>Améliorer les performances et corriger les bugs</li>
      </ul>
      <p style="margin-top:12px">Nous n'utilisons pas tes données à des fins publicitaires et nous ne les vendons pas à des tiers.</p>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="icon" style="background:#f59e0b20">📡</div>
        <h2>Partage des données</h2>
      </div>
      <ul>
        <li><strong style="color:#e2e8f0">RevenueCat</strong> — gestion des abonnements in-app (iOS/Android)</li>
        <li><strong style="color:#e2e8f0">Supabase / Render</strong> — hébergement sécurisé de la base de données</li>
        <li>Aucune donnée partagée avec des régies publicitaires ou des data brokers</li>
      </ul>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="icon" style="background:#8b5cf620">💾</div>
        <h2>Stockage et sécurité</h2>
      </div>
      <p>Tes données d'entraînement sont d'abord sauvegardées localement sur ton appareil (mode hors ligne), puis synchronisées avec nos serveurs via HTTPS. Les mots de passe sont chiffrés avec bcrypt. Les tokens d'authentification expirent automatiquement.</p>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="icon" style="background:#ef444420">🗑️</div>
        <h2>Tes droits (RGPD)</h2>
      </div>
      <ul>
        <li><strong style="color:#e2e8f0">Accès</strong> : tu peux demander une copie de tes données</li>
        <li><strong style="color:#e2e8f0">Rectification</strong> : tu peux modifier tes données depuis les paramètres de l'app</li>
        <li><strong style="color:#e2e8f0">Suppression</strong> : tu peux demander la suppression complète de ton compte et de tes données</li>
        <li><strong style="color:#e2e8f0">Portabilité</strong> : tu peux demander l'export de tes données</li>
      </ul>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="icon" style="background:#3b82f620">✉️</div>
        <h2>Contact</h2>
      </div>
      <p>Pour toute question relative à tes données personnelles ou pour exercer tes droits :</p>
      <a href="mailto:support@gorillax.dev" class="contact-email">✉ support@gorillax.dev</a>
    </div>

    <footer>
      <p>Dernière mise à jour : mars 2026 · Gorillax — Paris, France</p>
    </footer>
  </div>
</body>
</html>""")


@app.get("/", tags=["meta"], summary="API metadata")
async def read_root() -> dict[str, str]:
    return {"status": "running"}
