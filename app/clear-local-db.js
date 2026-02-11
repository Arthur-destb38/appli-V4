#!/usr/bin/env node

/**
 * Script pour nettoyer la base de données locale SQLite
 * Utile après avoir ajouté la colonne user_id
 */

const fs = require('fs');
const path = require('path');

// Chemins possibles de la base de données
const possiblePaths = [
  path.join(__dirname, '.expo', 'gorillax.db'),
  path.join(__dirname, 'gorillax.db'),
];

let deleted = false;

possiblePaths.forEach((dbPath) => {
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log(`✅ Base de données supprimée: ${dbPath}`);
      deleted = true;
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression: ${error.message}`);
    }
  }
});

if (!deleted) {
  console.log('ℹ️  Aucune base de données locale trouvée (normal si jamais lancé)');
}

console.log('\n📱 Relancez l\'app pour créer une nouvelle base avec user_id');
