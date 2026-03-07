import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslations } from '@/hooks/usePreferences';

interface ProfileData {
  // Étape 1: Informations de base
  avatar_url?: string;
  bio?: string;
  location?: string;
  height?: number;
  weight?: number;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Étape 2: Objectifs fitness
  objective?: 'muscle_gain' | 'weight_loss' | 'strength' | 'endurance' | 'general_fitness' | 'sport_specific';
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  training_frequency?: number;
  
  // Étape 3: Préférences
  equipment_available?: string[];
  consent_to_public_share: boolean;
}

const OBJECTIVE_KEYS = [
  { key: 'muscle_gain', translationKey: 'muscleGain' as const, icon: '💪' },
  { key: 'weight_loss', translationKey: 'weightLoss' as const, icon: '🔥' },
  { key: 'strength', translationKey: 'strength' as const, icon: '🏋️' },
  { key: 'endurance', translationKey: 'endurance' as const, icon: '🏃' },
  { key: 'general_fitness', translationKey: 'generalFitness' as const, icon: '✨' },
  { key: 'sport_specific', translationKey: 'sportSpecific' as const, icon: '⚽' },
];

const EXPERIENCE_LEVEL_KEYS = [
  { key: 'beginner', labelKey: 'beginner' as const, descKey: 'beginnerDesc' as const },
  { key: 'intermediate', labelKey: 'intermediate' as const, descKey: 'intermediateDesc' as const },
  { key: 'advanced', labelKey: 'advanced' as const, descKey: 'advancedDesc' as const },
];

const EQUIPMENT_KEYS = [
  'dumbbells' as const,
  'barbell' as const,
  'machines' as const,
  'kettlebells' as const,
  'bands' as const,
  'bodyweight' as const,
  'trx' as const,
  'bench' as const,
  'squat_rack' as const,
  'cardio' as const,
];

export default function ProfileSetupScreen() {
  const { t } = useTranslations();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    consent_to_public_share: false,
  });

  const OBJECTIVES = OBJECTIVE_KEYS.map(o => ({ ...o, label: t(o.translationKey) }));
  const EXPERIENCE_LEVELS = EXPERIENCE_LEVEL_KEYS.map(l => ({ ...l, label: t(l.labelKey), description: t(l.descKey) }));
  const EQUIPMENT_OPTIONS = EQUIPMENT_KEYS.map(k => ({ key: k, label: t(k) }));

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const updateField = (field: keyof ProfileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeSetup = async () => {
    setLoading(true);
    try {
      console.log('=== COMPLETION PROFIL ===');
      console.log('Données du profil:', profileData);
      
      // Pour l'instant, on simule la sauvegarde et on redirige directement
      // L'API backend sera connectée plus tard
      console.log('✅ Profil complété - redirection vers app');
      router.replace('/(tabs)');
      
    } catch (error) {
      console.error('Erreur completion profil:', error);
      console.log('❌ Impossible de sauvegarder le profil');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('tellAboutYourself')}</Text>
      <Text style={styles.stepSubtitle}>{t('personalizeExperience')}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('bioOptional')}</Text>
        <TextInput
          style={styles.textArea}
          placeholder={t('describeBriefly')}
          value={profileData.bio}
          onChangeText={(text) => updateField('bio', text)}
          multiline
          maxLength={150}
        />
        <Text style={styles.charCount}>{profileData.bio?.length || 0}/150</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('locationOptional')}</Text>
        <TextInput
          style={styles.input}
          placeholder="Paris, France"
          value={profileData.location}
          onChangeText={(text) => updateField('location', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>{t('heightCm')}</Text>
          <TextInput
            style={styles.input}
            placeholder="175"
            value={profileData.height?.toString()}
            onChangeText={(text) => updateField('height', parseInt(text) || undefined)}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.label}>{t('weightKg')}</Text>
          <TextInput
            style={styles.input}
            placeholder="70"
            value={profileData.weight?.toString()}
            onChangeText={(text) => updateField('weight', parseFloat(text) || undefined)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('genderOptional')}</Text>
        <View style={styles.optionsRow}>
          {[
            { key: 'male', label: t('male') },
            { key: 'female', label: t('female') },
            { key: 'other', label: t('other') },
            { key: 'prefer_not_to_say', label: t('preferNotToSay') },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionButton,
                profileData.gender === option.key && styles.optionButtonSelected,
              ]}
              onPress={() => updateField('gender', option.key)}
            >
              <Text
                style={[
                  styles.optionText,
                  profileData.gender === option.key && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('fitnessObjectives')}</Text>
      <Text style={styles.stepSubtitle}>{t('adaptedPrograms')}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('mainObjective')}</Text>
        <View style={styles.objectivesGrid}>
          {OBJECTIVES.map((objective) => (
            <TouchableOpacity
              key={objective.key}
              style={[
                styles.objectiveCard,
                profileData.objective === objective.key && styles.objectiveCardSelected,
              ]}
              onPress={() => updateField('objective', objective.key)}
            >
              <Text style={styles.objectiveIcon}>{objective.icon}</Text>
              <Text
                style={[
                  styles.objectiveText,
                  profileData.objective === objective.key && styles.objectiveTextSelected,
                ]}
              >
                {objective.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('experienceLevel')}</Text>
        {EXPERIENCE_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.key}
            style={[
              styles.levelCard,
              profileData.experience_level === level.key && styles.levelCardSelected,
            ]}
            onPress={() => updateField('experience_level', level.key)}
          >
            <View style={styles.levelContent}>
              <Text
                style={[
                  styles.levelTitle,
                  profileData.experience_level === level.key && styles.levelTitleSelected,
                ]}
              >
                {level.label}
              </Text>
              <Text
                style={[
                  styles.levelDescription,
                  profileData.experience_level === level.key && styles.levelDescriptionSelected,
                ]}
              >
                {level.description}
              </Text>
            </View>
            {profileData.experience_level === level.key && (
              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('desiredFrequency')}</Text>
        <View style={styles.frequencyContainer}>
          {[1, 2, 3, 4, 5, 6, 7].map((freq) => (
            <TouchableOpacity
              key={freq}
              style={[
                styles.frequencyButton,
                profileData.training_frequency === freq && styles.frequencyButtonSelected,
              ]}
              onPress={() => updateField('training_frequency', freq)}
            >
              <Text
                style={[
                  styles.frequencyText,
                  profileData.training_frequency === freq && styles.frequencyTextSelected,
                ]}
              >
                {freq}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.frequencyLabel}>{t('timesPerWeek')}</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('preferencesTitle')}</Text>
      <Text style={styles.stepSubtitle}>{t('lastStepPersonalize')}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('availableEquipment')}</Text>
        <View style={styles.equipmentGrid}>
          {EQUIPMENT_OPTIONS.map((equipment) => {
            const isSelected = profileData.equipment_available?.includes(equipment.key);
            return (
              <TouchableOpacity
                key={equipment.key}
                style={[
                  styles.equipmentChip,
                  isSelected && styles.equipmentChipSelected,
                ]}
                onPress={() => {
                  const current = profileData.equipment_available || [];
                  if (isSelected) {
                    updateField('equipment_available', current.filter(e => e !== equipment.key));
                  } else {
                    updateField('equipment_available', [...current, equipment.key]);
                  }
                }}
              >
                <Text
                  style={[
                    styles.equipmentText,
                    isSelected && styles.equipmentTextSelected,
                  ]}
                >
                  {equipment.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => updateField('consent_to_public_share', !profileData.consent_to_public_share)}
        >
          <View style={[styles.checkbox, profileData.consent_to_public_share && styles.checkboxChecked]}>
            {profileData.consent_to_public_share && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            {t('consentPublicShare')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.checkboxDescription}>
          {t('canChangeSettingsLater')}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header avec progress */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{t('stepOf', { current: currentStep, total: totalSteps })}</Text>
          </View>
        </View>

        {/* Contenu */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </ScrollView>

        {/* Footer avec boutons */}
        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                <Text style={styles.backButtonText}>{t('back')}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.nextButton, { flex: currentStep === 1 ? 1 : 0.7 }]}
              onPress={currentStep === totalSteps ? completeSetup : nextStep}
              disabled={loading}
            >
              <Text style={styles.nextButtonText}>
                {loading ? t('saving') : currentStep === totalSteps ? t('finish') : t('next')}
              </Text>
            </TouchableOpacity>
            
            {/* Bouton de test pour la dernière étape */}
            {currentStep === totalSteps && (
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: '#28a745', marginTop: 10, flex: 1 }]}
                onPress={() => {
                  console.log('🧪 Test Terminer cliqué - redirection directe');
                  router.replace('/(tabs)');
                }}
              >
                <Text style={styles.nextButtonText}>{t('testFinish')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {currentStep === 1 && (
            <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.skipButtonText}>{t('skipForNow')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#495057',
  },
  optionTextSelected: {
    color: 'white',
  },
  objectivesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  objectiveCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  objectiveCardSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  objectiveIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  objectiveText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    textAlign: 'center',
  },
  objectiveTextSelected: {
    color: 'white',
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    marginBottom: 8,
  },
  levelCardSelected: {
    backgroundColor: '#f0f8ff',
    borderColor: '#007AFF',
  },
  levelContent: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  levelTitleSelected: {
    color: '#007AFF',
  },
  levelDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  levelDescriptionSelected: {
    color: '#007AFF',
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  frequencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  frequencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  frequencyTextSelected: {
    color: 'white',
  },
  frequencyLabel: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
  },
  equipmentChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  equipmentText: {
    fontSize: 14,
    color: '#495057',
  },
  equipmentTextSelected: {
    color: 'white',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    lineHeight: 22,
  },
  checkboxDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 32,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 0.3,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  skipButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6c757d',
  },
});