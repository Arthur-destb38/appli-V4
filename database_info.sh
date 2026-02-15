#!/bin/bash

echo "📊 INFORMATIONS SUR LA BASE DE DONNÉES"
echo "========================================"
echo ""

# Trouver le fichier de base de données
DB_PATH="api/gorillax.db"

if [ -f "$DB_PATH" ]; then
    echo "✅ Base de données trouvée!"
    echo ""
    echo "📍 Emplacement:"
    echo "   $(pwd)/$DB_PATH"
    echo ""
    echo "📏 Taille:"
    ls -lh "$DB_PATH" | awk '{print "   " $5}'
    echo ""
    echo "📅 Dernière modification:"
    ls -l "$DB_PATH" | awk '{print "   " $6, $7, $8}'
    echo ""
    echo "🔧 Type:"
    echo "   SQLite (fichier local)"
    echo ""
else
    echo "❌ Base de données non trouvée à $DB_PATH"
fi

echo "========================================"
echo ""
echo "💡 COMMENT VOIR LA BASE DE DONNÉES:"
echo "========================================"
echo ""
echo "Option 1: Via Terminal (ligne de commande)"
echo "   cd $(pwd)"
echo "   sqlite3 api/gorillax.db"
echo "   Puis tape: .tables (pour voir les tables)"
echo "   Puis tape: SELECT * FROM user LIMIT 5;"
echo ""
echo "Option 2: Via DB Browser for SQLite (interface graphique)"
echo "   1. Télécharge: https://sqlitebrowser.org/dl/"
echo "   2. Installe l'application"
echo "   3. Ouvre le fichier: $(pwd)/$DB_PATH"
echo ""
echo "Option 3: Via VS Code (extension)"
echo "   1. Installe l'extension 'SQLite Viewer'"
echo "   2. Clique droit sur api/gorillax.db"
echo "   3. Sélectionne 'Open Database'"
echo ""
echo "Option 4: Via les scripts que j'ai créés"
echo "   ./show_database.sh"
echo "   ./list_users.sh"
echo ""
