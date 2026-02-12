#!/bin/bash

echo "📊 LISTE DES UTILISATEURS INSCRITS"
echo "===================================="
echo ""

sqlite3 api/gorillax.db << 'EOF'
.mode column
.headers on
.width 20 20 30 20 10

SELECT 
    username,
    email,
    CASE WHEN email_verified = 1 THEN '✅' ELSE '❌' END as verified,
    CASE WHEN profile_completed = 1 THEN '✅' ELSE '❌' END as completed,
    datetime(created_at) as created
FROM user 
ORDER BY created_at DESC 
LIMIT 20;
EOF

echo ""
echo "===================================="
sqlite3 api/gorillax.db "SELECT COUNT(*) as total FROM user;" | xargs echo "Total utilisateurs:"
