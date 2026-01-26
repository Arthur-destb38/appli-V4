#!/usr/bin/env python3

# Test simple pour vérifier que notre endpoint fonctionne
import requests

def test_simple():
    # Test de base
    response = requests.get("http://localhost:8000/health")
    print(f"Health check: {response.status_code} - {response.json()}")
    
    # Test de connexion
    login_data = {
        "username": "testuser",
        "password": "TestPassword123"
    }
    
    response = requests.post("http://localhost:8000/auth/login", json=login_data)
    if response.status_code == 200:
        token_data = response.json()
        token = token_data["access_token"]
        print(f"✅ Connexion réussie, token: {token[:50]}...")
        
        # Test du profil
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get("http://localhost:8000/auth/me", headers=headers)
        print(f"✅ Profil: {response.json()}")
        
        # Test de l'endpoint users existant
        response = requests.get(f"http://localhost:8000/users/profile/testuser", headers=headers)
        print(f"✅ Users profile: {response.status_code} - {response.json()}")
        
    else:
        print(f"❌ Erreur de connexion: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_simple()