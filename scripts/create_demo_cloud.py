#!/usr/bin/env python3
"""Créer les comptes demo directement dans PostgreSQL sur Render."""

import os
import sys

# Ajouter le chemin de l'API
sys.path.insert(0, 'api/src')

from sqlmodel import Session, create_engine
from api.models import User, Workout
from api.utils.auth import hash_password
from datetime import datetime, timezone

# URL de la base PostgreSQL sur Render
# Tu dois la récupérer depuis Render Dashboard
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL non définie")
    print("📝 Récupère l'URL depuis Render Dashboard:")
    print("   1. Va sur https://dashboard.render.com")
    print("   2. Clique sur ta base PostgreSQL")
    print("   3. Copie 'Internal Database URL'")
    print("   4. Export: export DATABASE_URL='postgresql://...'")
    sys.exit(1)

# Connexion à PostgreSQL
print(f"🔗 Connexion à PostgreSQL...")
engine = create_engine(DATABASE_URL)
session = Session(engine)

try:
    # Créer le compte demo
    print("👤 Création du compte demo...")
    demo = User(
        id='demo-permanent',
        username='demo',
        email='demo@gorillax.app',
        password_hash=hash_password('DemoPassword123'),
        created_at=datetime.now(timezone.utc),
        email_verified=True,
        profile_completed=True
    )
    session.add(demo)
    
    # Créer le compte arthur
    print("👤 Création du compte arthur...")
    arthur = User(
        id='test-user-002',
        username='arthur',
        email='arthur@gorillax.app',
        password_hash=hash_password('Test123456'),
        created_at=datetime.now(timezone.utc),
        email_verified=True,
        profile_completed=True
    )
    session.add(arthur)
    
    session.commit()
    
    # Créer des workouts de test
    print("📝 Création des workouts de test...")
    
    demo_workout1 = Workout(
        user_id='demo-permanent',
        title='Séance Demo Cloud 1',
        status='completed',
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    session.add(demo_workout1)
    
    demo_workout2 = Workout(
        user_id='demo-permanent',
        title='Séance Demo Cloud 2',
        status='draft',
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    session.add(demo_workout2)
    
    arthur_workout1 = Workout(
        user_id='test-user-002',
        title='Séance Arthur Cloud 1',
        status='completed',
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    session.add(arthur_workout1)
    
    arthur_workout2 = Workout(
        user_id='test-user-002',
        title='Séance Arthur Cloud 2',
        status='draft',
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    session.add(arthur_workout2)
    
    session.commit()
    
    print("✅ Comptes créés avec succès!")
    print("")
    print("📱 Tu peux maintenant te connecter avec:")
    print("   - demo / DemoPassword123")
    print("   - arthur / Test123456")
    
except Exception as e:
    print(f"❌ Erreur: {e}")
    session.rollback()
finally:
    session.close()
