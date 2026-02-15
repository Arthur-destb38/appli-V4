#!/bin/bash

echo "🔑 COMPTES DE TEST AVEC MOTS DE PASSE CONNUS"
echo "=============================================="
echo ""

# Vérifier les comptes connus
sqlite3 api/gorillax.db << 'SQL'
.mode column
.headers on
.width 20 30 15

SELECT 
    username,
    email,
    CASE WHEN email_verified = 1 THEN '✅' ELSE '❌' END as verified
FROM user 
WHERE username IN ('demo', 'arthur', 'athlete-E3F9', 'athlete-3131', 'Camille', 'athlete-100C')
ORDER BY created_at DESC;
SQL

echo ""
echo "=============================================="
echo "📝 IDENTIFIANTS:"
echo "=============================================="
echo ""
echo "1. Demo (si existe):"
echo "   Username: demo"
echo "   Password: DemoPassword123"
echo ""
echo "2. Arthur (si existe):"
echo "   Username: arthur"
echo "   Password: Test123456"
echo ""
echo "3. athlete-E3F9:"
echo "   Username: athlete-E3F9"
echo "   Password: Test123456"
echo ""
echo "4. athlete-3131:"
echo "   Username: athlete-3131"
echo "   Password: DemoPassword123"
echo ""
echo "5. Camille:"
echo "   Username: Camille"
echo "   Password: (inconnu - créé par toi)"
echo ""
echo "6. athlete-100C (Mathilde):"
echo "   Username: athlete-100C"
echo "   Password: (inconnu - créé par toi)"
echo ""
