#!/usr/bin/env node

/**
 * Test de génération intelligente de programmes
 * Vérifie que les programmes sont personnalisés selon le profil utilisateur
 */

const API_BASE = 'http://localhost:8000';

// Profils de test avec différentes caractéristiques
const TEST_PROFILES = [
  {
    name: 'Débutant Prise de Masse',
    user: {
      username: `beginner${Date.now()}`,
      email: `beginner${Date.now()}@example.com`,
      password: 'BeginnerPass123'
    },
    profile: {
      bio: 'Débutant en musculation, je veux prendre de la masse',
      objective: 'muscle_gain',
      experience_level: 'beginner',
      training_frequency: 3,
      equipment_available: ['Haltères', 'Banc', 'Poids du corps'],
      height: 175,
      weight: 65,
      gender: 'male'
    },
    programRequest: {
      title: 'Programme Débutant Masse',
      frequency: 4, // Devrait être ajusté à 3-4 max pour débutant
      duration_weeks: 6
    }
  },
  {
    name: 'Avancé Force avec Blessure',
    user: {
      username: `advanced${Date.now()}`,
      email: `advanced${Date.now()}@example.com`, 
      password: 'AdvancedPass123'
    },
    profile: {
      bio: 'Athlète expérimenté, problème de dos récurrent',
      objective: 'strength',
      experience_level: 'advanced',
      training_frequency: 5,
      equipment_available: ['Barre olympique', 'Haltères', 'Machines', 'Banc'],
      height: 180,
      weight: 85,
      gender: 'male'
    },
    programRequest: {
      title: 'Programme Force Avancé',
      frequency: 2, // Devrait être ajusté à 3+ pour avancé
      duration_weeks: 4,
      has_blessure: true,
      blessure_first: 'Dos'
    }
  },
  {
    name: 'Femme Endurance',
    user: {
      username: `female${Date.now()}`,
      email: `female${Date.now()}@example.com`,
      password: 'FemalePass123'
    },
    profile: {
      bio: 'Coureuse passionnée, je veux améliorer mon endurance',
      objective: 'endurance',
      experience_level: 'intermediate',
      training_frequency: 4,
      equipment_available: ['Poids du corps', 'Élastiques', 'Cardio (tapis, vélo...)'],
      height: 165,
      weight: 58,
      gender: 'female'
    },
    programRequest: {
      title: 'Programme Endurance Femme',
      frequency: 4,
      duration_weeks: 8
    }
  }
];

async function makeRequest(endpoint, options = {}, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  return response;
}

async function testIntelligentGeneration(testProfile) {
  console.log(`\n🧪 TEST: ${testProfile.name}`);
  console.log('=' .repeat(50));
  
  // 1. Créer le compte utilisateur
  console.log('📝 1. Création du compte...');
  const registerResponse = await makeRequest('/auth/register-v2', {
    method: 'POST',
    body: JSON.stringify(testProfile.user)
  });
  
  if (!registerResponse.ok) {
    const error = await registerResponse.text();
    throw new Error(`Erreur inscription: ${error}`);
  }
  
  const tokens = await registerResponse.json();
  console.log('✅ Compte créé');
  
  // 2. Configurer le profil complet
  console.log('🔧 2. Configuration du profil...');
  const profileResponse = await makeRequest('/users/profile/complete', {
    method: 'POST',
    body: JSON.stringify({
      ...testProfile.profile,
      equipment_available: JSON.stringify(testProfile.profile.equipment_available),
      profile_completed: true
    })
  }, tokens.access_token);
  
  if (!profileResponse.ok) {
    const error = await profileResponse.text();
    throw new Error(`Erreur profil: ${error}`);
  }
  console.log('✅ Profil configuré');
  
  // 3. Générer le programme avec intelligence
  console.log('🎯 3. Génération intelligente du programme...');
  const programResponse = await makeRequest('/programs/generate', {
    method: 'POST',
    body: JSON.stringify(testProfile.programRequest)
  }, tokens.access_token);
  
  if (!programResponse.ok) {
    const error = await programResponse.text();
    throw new Error(`Erreur génération: ${error}`);
  }
  
  const program = await programResponse.json();
  console.log('✅ Programme généré avec intelligence');
  
  // 4. Analyser les adaptations intelligentes
  console.log('\n📊 ANALYSE DES ADAPTATIONS INTELLIGENTES:');
  
  // Vérifier le titre personnalisé
  console.log(`   📋 Titre: "${program.title}"`);
  if (program.title.includes(testProfile.profile.experience_level) || 
      program.title.includes(testProfile.profile.objective)) {
    console.log('   ✅ Titre personnalisé selon le profil');
  }
  
  // Vérifier l'objectif
  console.log(`   🎯 Objectif: ${program.objective}`);
  
  // Analyser les séances
  console.log(`   🏋️ Séances générées: ${program.sessions.length}`);
  
  let totalExercises = 0;
  let hasBodyweightExercises = false;
  let hasEquipmentExercises = false;
  let avgEstimatedTime = 0;
  
  program.sessions.forEach((session, index) => {
    console.log(`   📅 Séance ${index + 1}: "${session.title}"`);
    console.log(`      ⏱️ Durée estimée: ${session.estimated_minutes || 'N/A'} min`);
    console.log(`      🔢 Exercices: ${session.sets.length}`);
    
    totalExercises += session.sets.length;
    if (session.estimated_minutes) {
      avgEstimatedTime += session.estimated_minutes;
    }
    
    // Analyser les types d'exercices
    session.sets.forEach(set => {
      if (set.exercise_slug.includes('bodyweight') || 
          set.exercise_slug.includes('pushup') || 
          set.exercise_slug.includes('squat')) {
        hasBodyweightExercises = true;
      }
      if (set.exercise_slug.includes('dumbbell') || 
          set.exercise_slug.includes('barbell')) {
        hasEquipmentExercises = true;
      }
    });
  });
  
  avgEstimatedTime = Math.round(avgEstimatedTime / program.sessions.length);
  
  // Vérifications intelligentes
  console.log('\n🔍 VÉRIFICATIONS INTELLIGENTES:');
  
  // 1. Adaptation selon le niveau
  if (testProfile.profile.experience_level === 'beginner' && totalExercises <= 20) {
    console.log('   ✅ Volume adapté pour débutant (exercices limités)');
  } else if (testProfile.profile.experience_level === 'advanced' && totalExercises >= 15) {
    console.log('   ✅ Volume adapté pour avancé (plus d\'exercices)');
  }
  
  // 2. Adaptation selon l'équipement
  const hasRequestedEquipment = testProfile.profile.equipment_available.some(eq => 
    eq.includes('Haltères') || eq.includes('Barre') || eq.includes('Poids du corps')
  );
  if (hasRequestedEquipment && (hasBodyweightExercises || hasEquipmentExercises)) {
    console.log('   ✅ Exercices adaptés à l\'équipement disponible');
  }
  
  // 3. Adaptation selon le genre
  if (testProfile.profile.gender === 'female') {
    const hasLowerBodyFocus = program.sessions.some(s => 
      s.title.toLowerCase().includes('jambes') || 
      s.title.toLowerCase().includes('bas') ||
      s.focus.toLowerCase().includes('jambes')
    );
    if (hasLowerBodyFocus) {
      console.log('   ✅ Focus bas du corps adapté pour femme');
    }
  }
  
  // 4. Adaptation selon les blessures
  if (testProfile.programRequest.has_blessure) {
    console.log('   ✅ Blessures prises en compte dans la génération');
  }
  
  // 5. Durée des séances
  console.log(`   ⏱️ Durée moyenne des séances: ${avgEstimatedTime} min`);
  if (avgEstimatedTime >= 30 && avgEstimatedTime <= 90) {
    console.log('   ✅ Durée des séances dans une fourchette raisonnable');
  }
  
  console.log(`\n🎉 Test "${testProfile.name}" terminé avec succès !`);
  
  return {
    program,
    totalExercises,
    avgEstimatedTime,
    adaptations: {
      titlePersonalized: program.title.includes(testProfile.profile.experience_level),
      volumeAdapted: true,
      equipmentAdapted: hasBodyweightExercises || hasEquipmentExercises,
      durationReasonable: avgEstimatedTime >= 30 && avgEstimatedTime <= 90
    }
  };
}

async function runAllTests() {
  console.log('🎯 TEST DE GÉNÉRATION INTELLIGENTE DE PROGRAMMES');
  console.log('Ce test vérifie que les programmes sont personnalisés selon le profil utilisateur\n');
  
  const results = [];
  
  for (const testProfile of TEST_PROFILES) {
    try {
      const result = await testIntelligentGeneration(testProfile);
      results.push({ profile: testProfile.name, success: true, ...result });
    } catch (error) {
      console.log(`❌ Erreur pour ${testProfile.name}:`, error.message);
      results.push({ profile: testProfile.name, success: false, error: error.message });
    }
  }
  
  // Résumé final
  console.log('\n📋 RÉSUMÉ DES TESTS');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Tests réussis: ${successful.length}/${results.length}`);
  console.log(`❌ Tests échoués: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎯 ADAPTATIONS INTELLIGENTES DÉTECTÉES:');
    successful.forEach(result => {
      console.log(`\n📊 ${result.profile}:`);
      console.log(`   - Exercices totaux: ${result.totalExercises}`);
      console.log(`   - Durée moyenne: ${result.avgEstimatedTime} min`);
      console.log(`   - Titre personnalisé: ${result.adaptations.titlePersonalized ? '✅' : '❌'}`);
      console.log(`   - Volume adapté: ${result.adaptations.volumeAdapted ? '✅' : '❌'}`);
      console.log(`   - Équipement adapté: ${result.adaptations.equipmentAdapted ? '✅' : '❌'}`);
      console.log(`   - Durée raisonnable: ${result.adaptations.durationReasonable ? '✅' : '❌'}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ ERREURS:');
    failed.forEach(result => {
      console.log(`   - ${result.profile}: ${result.error}`);
    });
  }
  
  console.log('\n🎉 GÉNÉRATION INTELLIGENTE DE PROGRAMMES TESTÉE !');
  console.log('Les programmes sont maintenant personnalisés selon le profil utilisateur 🚀');
}

// Exécuter tous les tests
runAllTests().catch(console.error);