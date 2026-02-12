#!/bin/bash

echo "🧪 TEST COMPLET D'INSCRIPTION SUR LE CLOUD"
echo "==========================================="
echo ""

API_URL="https://appli-v2.onrender.com"

# Test 1: Health check
echo "1️⃣  Test de l'API..."
HEALTH=$(curl -s "$API_URL/health")
if [[ $HEALTH == *"ok"* ]]; then
    echo "   ✅ API opérationnelle"
else
    echo "   ❌ API ne répond pas"
    exit 1
fi

# Test 2: Utilisateurs actuels
echo ""
echo "2️⃣  Utilisateurs actuels..."
USERS_BEFORE=$(curl -s "$API_URL/admin/users")
COUNT_BEFORE=$(echo $USERS_BEFORE | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
echo "   📊 Utilisateurs avant: $COUNT_BEFORE"

# Test 3: Inscription avec register
echo ""
echo "3️⃣  Test inscription avec /auth/register..."
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"test_auto","email":"test_auto@example.com","password":"TestAuto123"}')

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

echo "   Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "201" ]; then
    echo "   ✅ Inscription réussie!"
    echo "   Response: $BODY" | head -c 100
else
    echo "   ❌ Échec: $BODY"
fi

# Test 4: Inscription avec register-v2
echo ""
echo "4️⃣  Test inscription avec /auth/register-v2..."
REGISTER_V2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register-v2" \
  -H "Content-Type: application/json" \
  -d '{"username":"test_auto2","email":"test_auto2@example.com","password":"TestAuto123"}')

HTTP_CODE_V2=$(echo "$REGISTER_V2_RESPONSE" | tail -n1)
BODY_V2=$(echo "$REGISTER_V2_RESPONSE" | head -n-1)

echo "   Status: $HTTP_CODE_V2"
if [ "$HTTP_CODE_V2" = "201" ]; then
    echo "   ✅ Inscription réussie!"
    echo "   Response: $BODY_V2" | head -c 100
else
    echo "   ❌ Échec: $BODY_V2"
fi

# Test 5: Vérifier les utilisateurs après
echo ""
echo "5️⃣  Utilisateurs après inscription..."
sleep 2
USERS_AFTER=$(curl -s "$API_URL/admin/users")
COUNT_AFTER=$(echo $USERS_AFTER | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
echo "   📊 Utilisateurs après: $COUNT_AFTER"

if [ "$COUNT_AFTER" -gt "$COUNT_BEFORE" ]; then
    echo "   ✅ Nouveaux utilisateurs créés!"
    echo ""
    echo "   Détails:"
    echo "$USERS_AFTER" | python3 -m json.tool 2>/dev/null | grep -A 3 "username"
else
    echo "   ⚠️  Aucun nouvel utilisateur"
fi

echo ""
echo "==========================================="
echo "📋 RÉSUMÉ"
echo "==========================================="
echo "API Health: ✅"
echo "Register endpoint: $([ "$HTTP_CODE" = "201" ] && echo "✅" || echo "❌ ($HTTP_CODE)")"
echo "Register-v2 endpoint: $([ "$HTTP_CODE_V2" = "201" ] && echo "✅" || echo "❌ ($HTTP_CODE_V2)")"
echo "Utilisateurs: $COUNT_BEFORE → $COUNT_AFTER"
