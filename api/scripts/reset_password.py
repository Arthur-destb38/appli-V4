#!/usr/bin/env python3
"""
Script pour réinitialiser le mot de passe d'un utilisateur
Usage: python scripts/reset_password.py <username> <new_password>
"""
import sys
import os

# Ajouter le répertoire src au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from api.db import init_db, get_engine
from api.models import User
from api.utils.auth import hash_password
from sqlmodel import Session, select

def reset_password(username: str, new_password: str):
    """Réinitialise le mot de passe d'un utilisateur"""
    init_db()
    engine = get_engine()
    
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        
        if not user:
            print(f"❌ Utilisateur '{username}' non trouvé")
            return False
        
        # Hasher le nouveau mot de passe
        user.password_hash = hash_password(new_password)
        session.add(user)
        session.commit()
        
        print(f"✅ Mot de passe réinitialisé pour '{username}'")
        return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/reset_password.py <username> <new_password>")
        sys.exit(1)
    
    username = sys.argv[1]
    new_password = sys.argv[2]
    
    if len(new_password) < 6:
        print("❌ Le mot de passe doit contenir au moins 6 caractères")
        sys.exit(1)
    
    reset_password(username, new_password)


