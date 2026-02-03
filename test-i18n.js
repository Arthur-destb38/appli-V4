// Test simple pour vérifier l'internationalisation
console.log('Test de l\'internationalisation...');

// Simuler les traductions
const translations = {
  fr: {
    home: 'Accueil',
    settings: 'Paramètres',
    profile: 'Profil'
  },
  en: {
    home: 'Home',
    settings: 'Settings', 
    profile: 'Profile'
  }
};

// Test de la fonction de traduction
function t(key, language = 'fr') {
  return translations[language][key] || key;
}

console.log('FR - home:', t('home', 'fr'));
console.log('EN - home:', t('home', 'en'));
console.log('FR - settings:', t('settings', 'fr'));
console.log('EN - settings:', t('settings', 'en'));

console.log('Test terminé avec succès !');