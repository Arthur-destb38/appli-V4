#!/usr/bin/env python3
"""Script pour créer un utilisateur directement sur le cloud via l'API."""

import requests
import json

API_URL = "https://appli-v2.onrender.com"

def create_user(username, email, password):
    """Créer un utilisateur via l'API."""
    print(f"🔄 Création de l'utilisateur {username}...")
    
    # Essayer avec register-v2
    response = requests.post(
        f"{API_URL}/auth/register-v2",
        json={
            "username": username,
            "email": email,
            "password": password
        },
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Utilisateur créé avec succès!")
        print(f"   Access Token: {data.get('access_token', 'N/A')[:50]}...")
        return True
    else:
        print(f"❌ Erreur {response.status_code}: {response.text}")
        
        # Essayer avec l'ancien endpoint
        print("🔄 Tentative avec /auth/register...")
        response = requests.post(
            f"{API_URL}/auth/register",
            json={
                "username": username,
                "email": email,
                "password": password
            },
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Utilisateur créé avec succès!")
            print(f"   Access Token: {data.get('access_token', 'N/A')[:50]}...")
            return True
        else:
            print(f"❌ Erreur {response.status_code}: {response.text}")
            return False

def check_users():
    """Vérifier les utilisateurs existants."""
    print("\n📊 Vérification des utilisateurs...")
    response = requests.get(f"{API_URL}/admin/users")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   Total: {data['count']} utilisateurs")
        for user in data['users']:
            print(f"   - {user['username']} ({user['email']})")
    else:
        print(f"❌ Erreur: {response.status_code}")

if __name__ == "__main__":
    print("☁️  CRÉATION D'UTILISATEUR SUR LE CLOUD")
    print("=" * 50)
    print()
    
    # Créer un utilisateur de test
    create_user(
        username="demo_cloud",
        email="demo@cloud.gorillax.app",
        password="CloudDemo123"
    )
    
    # Vérifier les utilisateurs
    check_users()
    
    print()
    print("=" * 50)
    print("✅ Terminé!")
