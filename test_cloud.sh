#!/bin/bash

echo "☁️  TEST DE LA CONFIGURATION CLOUD"
echo "===================================="
echo ""

# Test 1: API Health
echo "1️⃣  Test de l'API Cloud..."
HEALTH=$(curl -s https://appli-v2.onrender.com/health)
if [[ $HEALTH == *"ok"* ]]; then
    echo "   ✅ API Cloud opérationnelle"
else
    echo "   ❌ API Cloud ne répond pas"
    exit 1
fi

# Test 2: Utilisateurs
echo ""
echo "2️⃣  Vérification des utilisateurs..."
USERS=$(curl -s https://appli-v2.onrender.com/admin/users)
COUNT=$(echo $USERS | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
echo "   📊 Utilisateurs sur le cloud: $COUNT"

# Test 3: Configuration de l'app
echo ""
echo "3️⃣  Configuration de l'app..."
if grep -q "USE_LOCAL_API = false" app/src/utils/api.ts; then
    echo "   ✅ App configurée pour le CLOUD"
elif grep -q "USE_LOCAL_API = true" app/src/utils/api.ts; then
    echo "   ⚠️  App configurée pour le LOCAL"
else
    echo "   ❓ Configuration non détectée"
fi

echo ""
echo "===================================="
echo "📱 L'app est prête à utiliser le cloud!"
echo ""
echo "Pour tester:"
echo "1. Ferme complètement l'app"
echo "2. Rouvre l'app"
echo "3. Crée un nouveau compte"
echo "4. Les données seront sur le cloud ☁️"
