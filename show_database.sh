#!/bin/bash

echo "📊 BASE DE DONNÉES CONNECTÉE À L'APPLICATION"
echo "=============================================="
echo ""
echo "🔧 Configuration: LOCAL"
echo "📍 API: http://192.168.1.138:8000"
echo "💾 Base de données: api/gorillax.db (SQLite)"
echo ""
echo "=============================================="
echo ""

# Utilisateurs
echo "👥 UTILISATEURS (20 derniers)"
echo "------------------------------"
sqlite3 api/gorillax.db << 'SQL'
.mode column
.headers on
.width 20 30 15 10
SELECT 
    username,
    email,
    CASE WHEN email_verified = 1 THEN '✅' ELSE '❌' END as verified,
    datetime(created_at) as created
FROM user 
ORDER BY created_at DESC 
LIMIT 20;
SQL

echo ""
echo "------------------------------"
sqlite3 api/gorillax.db "SELECT COUNT(*) FROM user;" | xargs echo "Total utilisateurs:"
echo ""

# Workouts
echo "📝 SÉANCES (20 dernières)"
echo "------------------------------"
sqlite3 api/gorillax.db << 'SQL'
.mode column
.headers on
.width 20 30 15 20
SELECT 
    user_id,
    title,
    status,
    datetime(created_at) as created
FROM workout 
ORDER BY created_at DESC 
LIMIT 20;
SQL

echo ""
echo "------------------------------"
sqlite3 api/gorillax.db "SELECT COUNT(*) FROM workout;" | xargs echo "Total séances:"
echo ""

# Séances par utilisateur
echo "📊 SÉANCES PAR UTILISATEUR"
echo "------------------------------"
sqlite3 api/gorillax.db << 'SQL'
.mode column
.headers on
.width 25 15
SELECT 
    user_id,
    COUNT(*) as nb_seances
FROM workout 
GROUP BY user_id
ORDER BY nb_seances DESC
LIMIT 10;
SQL

echo ""
echo "=============================================="
