import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'pink';
export type HeroColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'pink' | 'gradient';
export type Language = 'fr' | 'en';
export type Units = 'metric' | 'imperial';

export interface UserPreferences {
  accentColor: AccentColor;
  heroColor: HeroColor;
  language: Language;
  units: Units;
}

const defaultPreferences: UserPreferences = {
  accentColor: 'purple',
  heroColor: 'purple',
  language: 'fr',
  units: 'metric',
};

interface PreferencesContextValue {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const STORAGE_KEY = 'user_preferences';

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les préférences au démarrage
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    try {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.warn('Failed to save preference:', error);
    }
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference, isLoading }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
};

// Couleurs d'accent disponibles
export const accentColors = {
  purple: { light: '#6366F1', dark: '#818CF8', name: 'Violet' },
  blue: { light: '#3B82F6', dark: '#60A5FA', name: 'Bleu' },
  green: { light: '#10B981', dark: '#34D399', name: 'Vert' },
  orange: { light: '#F97316', dark: '#FB923C', name: 'Orange' },
  red: { light: '#EF4444', dark: '#F87171', name: 'Rouge' },
  pink: { light: '#EC4899', dark: '#F472B6', name: 'Rose' },
};

// Couleurs pour le HeroSection
export const heroColors = {
  purple: { light: ['#6366f1', '#8b5cf6'], dark: ['#1e1b4b', '#312e81'], name: 'Violet' },
  blue: { light: ['#3b82f6', '#1d4ed8'], dark: ['#1e3a8a', '#1e40af'], name: 'Bleu' },
  green: { light: ['#10b981', '#059669'], dark: ['#064e3b', '#065f46'], name: 'Vert' },
  orange: { light: ['#f97316', '#ea580c'], dark: ['#9a3412', '#c2410c'], name: 'Orange' },
  red: { light: ['#ef4444', '#dc2626'], dark: ['#7f1d1d', '#991b1b'], name: 'Rouge' },
  pink: { light: ['#ec4899', '#db2777'], dark: ['#831843', '#9d174d'], name: 'Rose' },
  gradient: { light: ['#6366f1', '#8b5cf6', '#a855f7'], dark: ['#1e1b4b', '#312e81', '#4c1d95'], name: 'Dégradé' },
};

// Textes de langue
export const translations = {
  fr: {
    // Navigation
    home: 'Accueil',
    explore: 'Explorer',
    feed: 'Feed',
    messages: 'Messages',
    profile: 'Profil',
    menu: 'Menu',
    
    // Stats et données
    lastWorkout: 'Dernière séance',
    thisWeek: 'Cette semaine',
    sessions: 'séances',
    completed: 'terminées',
    streak: 'Streak',
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    daysAgo: 'Il y a {days}j',
    getBackToIt: 'Reprends !',
    itsBeenAWhile: 'Ça fait un moment...',
    goalReached: 'Objectif atteint ! 🎯',
    newRecord: 'Nouveau record ! 🔥',
    personalRecord: 'Record personnel',
    progression: 'Progression',
    level: 'Niveau',
    
    // Sections principales
    quickActions: 'Actions rapides',
    myWorkouts: 'Mes séances',
    lastCreatedWorkout: 'Dernière séance créée',
    draftInProgress: 'Brouillon en cours',
    lastCompletedWorkout: 'Dernière séance terminée',
    completedSession: 'Séance complétée',
    
    // États vides
    noWorkoutInProgress: 'Aucune séance en cours',
    createFirstWorkout: 'Crée ta première séance pour commencer',
    noCompletedWorkout: 'Aucune séance terminée',
    completeWorkoutToSee: 'Termine une séance pour la voir apparaître ici',
    
    // Actions
    createWorkout: 'Créer une séance',
    newWorkout: 'Nouvelle séance',
    newProgram: 'Nouveau programme',
    drafts: 'Brouillons',
    seeAll: 'Voir les',
    
    // Settings
    settings: 'Paramètres',
    appearance: 'Apparence',
    languageAndRegion: 'Langue et région',
    preferences: 'Préférences',
    language: 'Langue',
    units: 'Unités',
    unitSystem: 'Système d\'unités',
    accentColor: 'Couleur d\'accent',
    heroColor: 'Couleur de l\'en-tête',
    darkMode: 'Mode sombre',
    darkModeDescription: 'Interface sombre pour tes yeux',
    french: 'Français',
    english: 'English',
    metric: 'Métrique',
    imperial: 'Impérial',
    
    // Informations
    basicInfo: 'Informations de base',
    personalInfo: 'Informations personnelles',
    fitnessGoals: 'Objectifs fitness',
    username: 'Nom d\'utilisateur',
    bio: 'Bio',
    mainGoal: 'Objectif principal',
    location: 'Localisation',
    height: 'Taille',
    weight: 'Poids',
    
    // Navigation drawer
    history: 'Historique',
    objectives: 'Objectifs',
    parameters: 'Paramètres',
    
    // Unités
    kg: 'kg',
    lbs: 'lbs',
    cm: 'cm',
    ft: 'ft',
    
    // Messages d'état
    loading: 'Chargement...',
    loadingSettings: 'Chargement des paramètres...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    error: 'Erreur',
    
    // Greetings and motivational messages
    goodMorning: 'Bonjour',
    goodAfternoon: 'Bon après-midi',
    goodEvening: 'Bonsoir',
    consecutiveDays: 'jours consécutifs',
    daysInARow: 'jours de suite',
    readyForWorkout: 'Prêt pour ta séance ?',
    letsGo: 'C\'est parti !',
    goalReached: 'Objectif atteint ! 🎯',
    
    // Experience levels
    beginner: 'Débutant',
    beginnerDesc: 'Moins de 6 mois',
    intermediate: 'Intermédiaire',
    intermediateDesc: '6 mois - 2 ans',
    advanced: 'Avancé',
    advancedDesc: 'Plus de 2 ans',
    
    // Objectives
    muscleGain: 'Prise de masse',
    weightLoss: 'Perte de poids',
    strength: 'Force',
    endurance: 'Endurance',
    generalFitness: 'Forme générale',
    sportSpecific: 'Sport spécifique',
    
    // Equipment
    dumbbells: 'Haltères',
    barbell: 'Barre olympique',
    machines: 'Machines',
    kettlebells: 'Kettlebells',
    bands: 'Élastiques',
    bodyweight: 'Poids du corps',
    trx: 'TRX',
    bench: 'Banc',
    squat_rack: 'Rack à squat',
    cardio: 'Cardio (tapis, vélo...)',
    
    // Gender
    male: 'Homme',
    female: 'Femme',
    other: 'Autre',
    preferNotToSay: 'Préfère ne pas dire',
    
    // Form labels and descriptions
    yourUsername: 'Ton pseudo',
    tellAboutYou: 'Parle de toi...',
    mainGoal: 'Objectif principal',
    locationPlaceholder: 'Paris, France',
    heightCm: 'Taille (cm)',
    weightKg: 'Poids (kg)',
    heightPlaceholder: '175',
    weightPlaceholder: '70',
    gender: 'Genre',
    experienceLevel: 'Niveau d\'expérience',
    trainingFrequency: 'Fréquence d\'entraînement (fois par semaine)',
    availableEquipment: 'Équipement disponible',
    publicShare: 'Partage public',
    publicShareDesc: 'Autoriser le partage de tes séances publiquement',
    saveCompleteProfile: 'Sauvegarder le profil complet',
    actions: 'Actions',
    logout: 'Se déconnecter',
    logoutConfirm: 'Es-tu sûr de vouloir te déconnecter ?',
    logoutButton: 'Déconnexion',
    version: 'Gorillax v1.0.0',
    
    // Error messages
    usernameRequired: 'Le nom d\'utilisateur ne peut pas être vide',
    usernameTaken: 'Ce nom d\'utilisateur est déjà pris',
    cannotSaveInfo: 'Impossible de sauvegarder les informations',
    cannotSaveProfile: 'Impossible de sauvegarder le profil complet',
    profileSaved: '✅ Informations mises à jour !',
    profileCompleteSaved: '✅ Profil complet sauvegardé !',
    goalError: 'L\'objectif doit être entre 1 et 14 séances par semaine.',
    cannotSaveGoal: 'Impossible de sauvegarder l\'objectif.',
    weeklyGoal: 'Objectif hebdomadaire',
    howManySessionsPerWeek: 'Combien de séances veux-tu faire par semaine ?',
  },
  en: {
    // Navigation
    home: 'Home',
    explore: 'Explore',
    feed: 'Feed',
    messages: 'Messages',
    profile: 'Profile',
    menu: 'Menu',
    
    // Stats et données
    lastWorkout: 'Last workout',
    thisWeek: 'This week',
    sessions: 'sessions',
    completed: 'completed',
    streak: 'Streak',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: '{days}d ago',
    getBackToIt: 'Get back to it!',
    itsBeenAWhile: 'It\'s been a while...',
    goalReached: 'Goal reached! 🎯',
    newRecord: 'New record! 🔥',
    personalRecord: 'Personal record',
    progression: 'Progression',
    level: 'Level',
    
    // Sections principales
    quickActions: 'Quick actions',
    myWorkouts: 'My workouts',
    lastCreatedWorkout: 'Last created workout',
    draftInProgress: 'Draft in progress',
    lastCompletedWorkout: 'Last completed workout',
    completedSession: 'Completed session',
    
    // États vides
    noWorkoutInProgress: 'No workout in progress',
    createFirstWorkout: 'Create your first workout to get started',
    noCompletedWorkout: 'No completed workout',
    completeWorkoutToSee: 'Complete a workout to see it here',
    
    // Actions
    createWorkout: 'Create workout',
    newWorkout: 'New workout',
    newProgram: 'New program',
    drafts: 'Drafts',
    seeAll: 'See all',
    
    // Settings
    settings: 'Settings',
    appearance: 'Appearance',
    languageAndRegion: 'Language & Region',
    preferences: 'Preferences',
    language: 'Language',
    units: 'Units',
    unitSystem: 'Unit system',
    accentColor: 'Accent color',
    heroColor: 'Header color',
    darkMode: 'Dark mode',
    darkModeDescription: 'Dark interface for your eyes',
    french: 'Français',
    english: 'English',
    metric: 'Metric',
    imperial: 'Imperial',
    
    // Informations
    basicInfo: 'Basic information',
    personalInfo: 'Personal information',
    fitnessGoals: 'Fitness goals',
    username: 'Username',
    bio: 'Bio',
    mainGoal: 'Main goal',
    location: 'Location',
    height: 'Height',
    weight: 'Weight',
    
    // Navigation drawer
    history: 'History',
    objectives: 'Objectives',
    parameters: 'Settings',
    
    // Unités
    kg: 'kg',
    lbs: 'lbs',
    cm: 'cm',
    ft: 'ft',
    
    // Messages d'état
    loading: 'Loading...',
    loadingSettings: 'Loading settings...',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    error: 'Error',
    
    // Greetings and motivational messages
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    consecutiveDays: 'consecutive days',
    daysInARow: 'days in a row',
    readyForWorkout: 'Ready for your workout?',
    letsGo: 'Let\'s go!',
    goalReached: 'Goal reached! 🎯',
    
    // Experience levels
    beginner: 'Beginner',
    beginnerDesc: 'Less than 6 months',
    intermediate: 'Intermediate',
    intermediateDesc: '6 months - 2 years',
    advanced: 'Advanced',
    advancedDesc: 'More than 2 years',
    
    // Objectives
    muscleGain: 'Muscle gain',
    weightLoss: 'Weight loss',
    strength: 'Strength',
    endurance: 'Endurance',
    generalFitness: 'General fitness',
    sportSpecific: 'Sport specific',
    
    // Equipment
    dumbbells: 'Dumbbells',
    barbell: 'Olympic barbell',
    machines: 'Machines',
    kettlebells: 'Kettlebells',
    bands: 'Resistance bands',
    bodyweight: 'Bodyweight',
    trx: 'TRX',
    bench: 'Bench',
    squat_rack: 'Squat rack',
    cardio: 'Cardio (treadmill, bike...)',
    
    // Gender
    male: 'Male',
    female: 'Female',
    other: 'Other',
    preferNotToSay: 'Prefer not to say',
    
    // Form labels and descriptions
    yourUsername: 'Your username',
    tellAboutYou: 'Tell us about yourself...',
    mainGoal: 'Main goal',
    locationPlaceholder: 'Paris, France',
    heightCm: 'Height (cm)',
    weightKg: 'Weight (kg)',
    heightPlaceholder: '175',
    weightPlaceholder: '70',
    gender: 'Gender',
    experienceLevel: 'Experience level',
    trainingFrequency: 'Training frequency (times per week)',
    availableEquipment: 'Available equipment',
    publicShare: 'Public sharing',
    publicShareDesc: 'Allow public sharing of your workouts',
    saveCompleteProfile: 'Save complete profile',
    actions: 'Actions',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to logout?',
    logoutButton: 'Logout',
    version: 'Gorillax v1.0.0',
    
    // Error messages
    usernameRequired: 'Username cannot be empty',
    usernameTaken: 'This username is already taken',
    cannotSaveInfo: 'Unable to save information',
    cannotSaveProfile: 'Unable to save complete profile',
    profileSaved: '✅ Information updated!',
    profileCompleteSaved: '✅ Complete profile saved!',
    goalError: 'Goal must be between 1 and 14 sessions per week.',
    cannotSaveGoal: 'Unable to save goal.',
    weeklyGoal: 'Weekly goal',
    howManySessionsPerWeek: 'How many sessions do you want to do per week?',
  },
};

// Hook pour utiliser les traductions
export const useTranslations = () => {
  const [isReady, setIsReady] = useState(false);
  const context = useContext(PreferencesContext);
  
  useEffect(() => {
    if (context && !context.isLoading) {
      setIsReady(true);
    }
  }, [context]);
  
  const t = (key: keyof typeof translations.fr, params?: Record<string, string | number>) => {
    // Si le contexte n'est pas prêt, retourner la clé
    if (!context || !isReady) {
      return key as string;
    }
    
    try {
      const { preferences } = context;
      let text = translations[preferences.language]?.[key] || key as string;
      
      // Remplacer les paramètres dans le texte (ex: {days} -> 3)
      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          text = text.replace(`{${param}}`, String(value));
        });
      }
      
      return text;
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return key as string;
    }
  };
  
  return { 
    t, 
    language: context?.preferences?.language || 'fr', 
    isLoading: !isReady 
  };
};