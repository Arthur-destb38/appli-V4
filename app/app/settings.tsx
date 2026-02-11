import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useDemo } from '../src/contexts/DemoContext';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePreferences, accentColors, heroColors, translations, useTranslations } from '@/hooks/usePreferences';
import { apiCall } from '@/utils/api';
import { updateRemoteProfile } from '@/services/userProfileApi';

interface ProfileSetupData {
  // Informations personnelles
  location?: string;
  height?: number;
  weight?: number;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Objectifs fitness
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  training_frequency?: number;
  equipment_available?: string[];
  
  // Préférences
  consent_to_public_share: boolean;
}

// These will be translated dynamically in the component
const EXPERIENCE_LEVELS = [
  { key: 'beginner', labelKey: 'beginner', descriptionKey: 'beginnerDesc' },
  { key: 'intermediate', labelKey: 'intermediate', descriptionKey: 'intermediateDesc' },
  { key: 'advanced', labelKey: 'advanced', descriptionKey: 'advancedDesc' },
];

const OBJECTIVES = [
  { key: 'muscle_gain', labelKey: 'muscleGain', icon: '💪' },
  { key: 'weight_loss', labelKey: 'weightLoss', icon: '🔥' },
  { key: 'strength', labelKey: 'strength', icon: '🏋️' },
  { key: 'endurance', labelKey: 'endurance', icon: '🏃' },
  { key: 'general_fitness', labelKey: 'generalFitness', icon: '✨' },
  { key: 'sport_specific', labelKey: 'sportSpecific', icon: '⚽' },
];

const EQUIPMENT_OPTIONS_KEYS = [
  'dumbbells',
  'barbell', 
  'machines',
  'kettlebells',
  'bands',
  'bodyweight',
  'trx',
  'bench',
  'squat_rack',
  'cardio',
];

const GENDER_OPTIONS = [
  { key: 'male', labelKey: 'male', icon: 'male' },
  { key: 'female', labelKey: 'female', icon: 'female' },
  { key: 'other', labelKey: 'other', icon: 'transgender' },
  { key: 'prefer_not_to_say', labelKey: 'preferNotToSay', icon: 'help-circle' },
];

export default function SettingsScreen() {
  const { theme, toggleMode } = useAppTheme();
  const { user, logout, updateProfile } = useAuth();
  const { profile, refresh } = useUserProfile();
  const { preferences, updatePreference } = usePreferences();
  const { t } = useTranslations();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // États pour les données du profil
  const [profileData, setProfileData] = useState<ProfileSetupData>({
    consent_to_public_share: false,
  });
  const { startDemo } = useDemo();
  
  // États pour les informations de base
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [objective, setObjective] = useState('');
  
  // États UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Charger les données existantes
  useEffect(() => {
    loadUserData();
  }, [user, profile]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Charger les données de base depuis le profil
      if (profile) {
        setUsername(profile.username || '');
        setBio(profile.bio || '');
        setObjective(profile.objective || '');
        setProfileData(prev => ({
          ...prev,
          consent_to_public_share: profile.consent_to_public_share || false,
        }));
      }

      // Charger les données complètes depuis l'API
      if (user?.id) {
        try {
          const response = await apiCall(`/users/profile/status`);
          if (response.ok) {
            const userData = await response.json();
            setProfileData(prev => ({
              ...prev,
              location: userData.location,
              height: userData.height,
              weight: userData.weight,
              birth_date: userData.birth_date,
              gender: userData.gender,
              experience_level: userData.experience_level,
              training_frequency: userData.training_frequency,
              equipment_available: userData.equipment_available ? JSON.parse(userData.equipment_available) : [],
            }));
          }
    } catch (error) {
          console.log('Données complètes non disponibles, utilisation des données de base');
        }
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof ProfileSetupData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBasicInfo = async () => {
    if (!username.trim()) {
      Alert.alert(t('error'), t('usernameRequired'));
      return;
    }

    setSaving(true);
    try {
      await updateRemoteProfile(user?.id || profile?.id || '', {
        username: username.trim(),
        bio: bio.trim() || undefined,
        objective: objective.trim() || undefined,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refresh();
      Alert.alert(t('profileSaved'));
    } catch (error: any) {
      if (error.code === 'username_taken') {
        Alert.alert(t('error'), t('usernameTaken'));
      } else {
        Alert.alert(t('error'), t('cannotSaveInfo'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompleteProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        ...profileData,
        equipment_available: JSON.stringify(profileData.equipment_available || []),
      };

      const response = await apiCall('/users/profile/complete', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert(t('profileCompleteSaved'));
        await refresh();
      } else {
        throw new Error('Erreur sauvegarde');
      }
    } catch (error) {
      Alert.alert(t('error'), t('cannotSaveProfile'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        await logout();
        router.replace('/login');
      } catch (error) {
        console.error('Erreur déconnexion:', error);
        router.replace('/login');
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(t('logoutConfirm'))) {
        await doLogout();
      }
    } else {
      Alert.alert(
        t('logout'),
        t('logoutConfirm'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('logoutButton'), style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  const toggleSection = (section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
  return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          {t('loadingSettings')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={theme.mode === 'dark' ? ['#1e1b4b', '#312e81'] : ['#6366f1', '#8b5cf6']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings')}</Text>
          <View style={styles.headerSpacer} />
            </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Informations de base */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('basic')}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: '#6366f1' + '20' }]}>
                  <Ionicons name="person" size={20} color="#6366f1" />
          </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('basicInfo')}
              </Text>
            </View>
              <Ionicons
                name={expandedSection === 'basic' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'basic' && (
              <View style={styles.sectionContent}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('username')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder={t('yourUsername')}
                    placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('bio')}
              </Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder={t('tellAboutYou')}
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
            </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('mainGoal')}
                  </Text>
                  <View style={styles.objectivesGrid}>
                    {OBJECTIVES.map((obj) => (
                      <TouchableOpacity
                        key={obj.key}
                        style={[
                          styles.objectiveCard,
                          { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                          objective === obj.key && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
                        ]}
                        onPress={() => setObjective(obj.key)}
                      >
                        <Text style={styles.objectiveIcon}>{obj.icon}</Text>
                        <Text
                          style={[
                            styles.objectiveText,
                            { color: theme.colors.textPrimary },
                            objective === obj.key && { color: theme.colors.accent },
                          ]}
                        >
                          {t(obj.labelKey as any)}
                        </Text>
                      </TouchableOpacity>
                    ))}
          </View>
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveBasicInfo}
                  disabled={saving}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.saveButtonGradient}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.saveButtonText}>{t('save')}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Informations personnelles */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('personal')}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: '#10b981' + '20' }]}>
                  <Ionicons name="body" size={20} color="#10b981" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('personalInfo')}
              </Text>
            </View>
              <Ionicons
                name={expandedSection === 'personal' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'personal' && (
              <View style={styles.sectionContent}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('location')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={profileData.location || ''}
                    onChangeText={(text) => updateField('location', text)}
                    placeholder={t('locationPlaceholder')}
                    placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      {t('height')} ({t('cm')})
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                      value={profileData.height?.toString() || ''}
                      onChangeText={(text) => updateField('height', parseInt(text) || undefined)}
                      placeholder={t('heightPlaceholder')}
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                    />
            </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      {t('weight')} ({t('kg')})
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                      value={profileData.weight?.toString() || ''}
                      onChangeText={(text) => updateField('weight', parseFloat(text) || undefined)}
                      placeholder={t('weightPlaceholder')}
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
            />
          </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('gender')}
                  </Text>
                  <View style={styles.genderGrid}>
                    {GENDER_OPTIONS.map((gender) => (
                      <TouchableOpacity
                        key={gender.key}
                        style={[
                          styles.genderCard,
                          { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                          profileData.gender === gender.key && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
                        ]}
                        onPress={() => updateField('gender', gender.key)}
                      >
                        <Ionicons
                          name={gender.icon as any}
                          size={20}
                          color={profileData.gender === gender.key ? theme.colors.accent : theme.colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.genderText,
                            { color: theme.colors.textPrimary },
                            profileData.gender === gender.key && { color: theme.colors.accent },
                          ]}
                        >
                          {t(gender.labelKey as any)}
              </Text>
                      </TouchableOpacity>
                    ))}
            </View>
                </View>
              </View>
            )}
          </View>

          {/* Objectifs fitness */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('fitness')}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b' + '20' }]}>
                  <Ionicons name="fitness" size={20} color="#f59e0b" />
          </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('fitnessGoals')}
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'fitness' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'fitness' && (
              <View style={styles.sectionContent}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('experienceLevel')}
                  </Text>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level.key}
                      style={[
                        styles.levelCard,
                        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                        profileData.experience_level === level.key && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
                      ]}
                      onPress={() => updateField('experience_level', level.key)}
                    >
                      <View style={styles.levelContent}>
                        <Text
                          style={[
                            styles.levelTitle,
                            { color: theme.colors.textPrimary },
                            profileData.experience_level === level.key && { color: theme.colors.accent },
                          ]}
                        >
                          {t(level.labelKey as any)}
                        </Text>
                        <Text
                          style={[
                            styles.levelDescription,
                            { color: theme.colors.textSecondary },
                            profileData.experience_level === level.key && { color: theme.colors.accent },
                          ]}
                        >
                          {t(level.descriptionKey as any)}
                        </Text>
                      </View>
                      {profileData.experience_level === level.key && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('trainingFrequency')}
                  </Text>
                  <View style={styles.frequencyContainer}>
                    {[1, 2, 3, 4, 5, 6, 7].map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.frequencyButton,
                          { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                          profileData.training_frequency === freq && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
                        ]}
                        onPress={() => updateField('training_frequency', freq)}
                      >
                        <Text
                          style={[
                            styles.frequencyText,
                            { color: theme.colors.textPrimary },
                            profileData.training_frequency === freq && { color: '#fff' },
                          ]}
                        >
                          {freq}
            </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('availableEquipment')}
                  </Text>
                  <View style={styles.equipmentGrid}>
                    {EQUIPMENT_OPTIONS_KEYS.map((equipmentKey) => {
                      const equipmentName = t(equipmentKey as any);
                      const isSelected = profileData.equipment_available?.includes(equipmentName);
                      return (
                        <TouchableOpacity
                          key={equipmentKey}
                          style={[
                            styles.equipmentChip,
                            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                            isSelected && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
                          ]}
                          onPress={() => {
                            const current = profileData.equipment_available || [];
                            if (isSelected) {
                              updateField('equipment_available', current.filter(e => e !== equipmentName));
                            } else {
                              updateField('equipment_available', [...current, equipmentName]);
                            }
                          }}
                        >
                          <Text
              style={[
                              styles.equipmentText,
                              { color: theme.colors.textPrimary },
                              isSelected && { color: theme.colors.accent },
                            ]}
                          >
                            {equipmentName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
              </View>
              </View>
            </View>
            )}
          </View>

          {/* Apparence */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('appearance')}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: '#6366f1' + '20' }]}>
                  <Ionicons name="color-palette" size={20} color="#6366f1" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('appearance')}
            </Text>
              </View>
              <Ionicons
                name={expandedSection === 'appearance' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'appearance' && (
              <View style={styles.sectionContent}>
                <View style={styles.switchContainer}>
                  <View style={styles.switchTextContainer}>
                    <Text style={[styles.switchTitle, { color: theme.colors.textPrimary }]}>
                      {t('darkMode')}
                    </Text>
                    <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                      {t('darkModeDescription')}
                    </Text>
                  </View>
                  <Switch
                    value={theme.mode === 'dark'}
                    onValueChange={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      toggleMode();
                    }}
                    trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.accent }}
                    thumbColor={theme.mode === 'dark' ? '#FFFFFF' : '#FFFFFF'}
                  />
                </View>

                {/* Couleur d'accent */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('accentColor')}
                  </Text>
                  <View style={styles.colorGrid}>
                    {Object.entries(accentColors).map(([key, color]) => (
                  <Pressable
                        key={key}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color[theme.mode] },
                          preferences.accentColor === key && styles.colorOptionSelected,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          updatePreference('accentColor', key as any);
                        }}
                      >
                        {preferences.accentColor === key && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                  </Pressable>
                    ))}
                  </View>
                </View>

                {/* Couleur du header */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('heroColor')}
                  </Text>
                  <View style={styles.colorGrid}>
                    {Object.entries(heroColors).map(([key, color]) => (
                  <Pressable
                        key={key}
                        style={[
                          styles.heroColorOption,
                          preferences.heroColor === key && styles.colorOptionSelected,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          updatePreference('heroColor', key as any);
                        }}
                      >
                        <View style={[
                          styles.heroColorPreview,
                          { backgroundColor: (color[theme.mode] as any)[0] || color[theme.mode] }
                        ]} />
                        {preferences.heroColor === key && (
                          <View style={styles.heroColorCheck}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                  </Pressable>
                    ))}
                </View>
              </View>
              </View>
            )}
          </View>

          {/* Langue et région */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('language')}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: '#10b981' + '20' }]}>
                  <Ionicons name="language" size={20} color="#10b981" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('languageAndRegion')}
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'language' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'language' && (
              <View style={styles.sectionContent}>
                {/* Langue */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('language')}
                  </Text>
                  <View style={styles.languageGrid}>
                  <Pressable
                      style={[
                        styles.languageOption,
                        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                        preferences.language === 'fr' && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        updatePreference('language', 'fr');
                      }}
                    >
                      <Text style={styles.languageFlag}>🇫🇷</Text>
                      <Text style={[
                        styles.languageText,
                        { color: theme.colors.textPrimary },
                        preferences.language === 'fr' && { color: theme.colors.accent },
                      ]}>
                        Français
                      </Text>
                  </Pressable>
                    
                    <Pressable
                      style={[
                        styles.languageOption,
                        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                        preferences.language === 'en' && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        updatePreference('language', 'en');
                      }}
                    >
                      <Text style={styles.languageFlag}>🇺🇸</Text>
                      <Text style={[
                        styles.languageText,
                        { color: theme.colors.textPrimary },
                        preferences.language === 'en' && { color: theme.colors.accent },
                      ]}>
                        English
                  </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Unités */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {t('unitSystem')}
                  </Text>
                  <View style={styles.languageGrid}>
                  <Pressable
                      style={[
                        styles.languageOption,
                        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                        preferences.units === 'metric' && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        updatePreference('units', 'metric');
                      }}
                    >
                      <Text style={styles.languageFlag}>📏</Text>
                      <View>
                        <Text style={[
                          styles.languageText,
                          { color: theme.colors.textPrimary },
                          preferences.units === 'metric' && { color: theme.colors.accent },
                        ]}>
                          {t('metric')}
                        </Text>
                        <Text style={[styles.languageSubtext, { color: theme.colors.textSecondary }]}>
                          kg, cm
                        </Text>
                      </View>
                  </Pressable>
                    
                    <Pressable
                      style={[
                        styles.languageOption,
                        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                        preferences.units === 'imperial' && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        updatePreference('units', 'imperial');
                      }}
                    >
                      <Text style={styles.languageFlag}>📐</Text>
                      <View>
                        <Text style={[
                          styles.languageText,
                          { color: theme.colors.textPrimary },
                          preferences.units === 'imperial' && { color: theme.colors.accent },
                        ]}>
                          {t('imperial')}
                        </Text>
                        <Text style={[styles.languageSubtext, { color: theme.colors.textSecondary }]}>
                          lbs, ft
                        </Text>
                </View>
                    </Pressable>
              </View>
            </View>
              </View>
            )}
              </View>

          {/* Préférences */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('preferences')}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: '#8b5cf6' + '20' }]}>
                  <Ionicons name="settings" size={20} color="#8b5cf6" />
            </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('preferences')}
                </Text>
          </View>
              <Ionicons
                name={expandedSection === 'preferences' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'preferences' && (
              <View style={styles.sectionContent}>
                <View style={styles.switchContainer}>
                  <View style={styles.switchLeft}>
                    <Ionicons name="share-social" size={20} color={theme.colors.textSecondary} />
                    <View style={styles.switchTextContainer}>
                      <Text style={[styles.switchTitle, { color: theme.colors.textPrimary }]}>
                        {t('publicShare')}
                      </Text>
                      <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                        {t('publicShareDesc')}
                      </Text>
        </View>
                  </View>
                  <Switch
                    value={profileData.consent_to_public_share}
                    onValueChange={(value) => updateField('consent_to_public_share', value)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.accent + '40' }}
                    thumbColor={profileData.consent_to_public_share ? theme.colors.accent : theme.colors.textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveCompleteProfile}
                  disabled={saving}
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#a855f7']}
                    style={styles.saveButtonGradient}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="save" size={18} color="#fff" />
                        <Text style={styles.saveButtonText}>{t('saveCompleteProfile')}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Guide d'utilisation */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: '#6366f1' + '20' }]}>
                  <Ionicons name="book" size={20} color="#6366f1" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('guideTitle')}
                </Text>
              </View>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.accent + '15' }]}
                onPress={() => router.push('/guide-utilisation')}
              >
                <Ionicons name="play-circle-outline" size={20} color={theme.colors.accent} />
                <Text style={[styles.actionButtonText, { color: theme.colors.accent }]}>
                  {t('guideUsage')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#10b981' + '15', marginTop: 10 }]}
                onPress={() => { router.replace('/(tabs)' as any); startDemo(); }}
              >
                <Ionicons name="videocam-outline" size={20} color="#10b981" />
                <Text style={[styles.actionButtonText, { color: '#10b981' }]}>
                  {t('demoButton')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: '#ef4444' + '20' }]}>
                  <Ionicons name="exit" size={20} color="#ef4444" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('actions')}
                </Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.error + '15' }]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
                <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                  {t('logout')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Version */}
          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
              {t('version')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  objectivesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  objectiveCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  objectiveIcon: {
    fontSize: 20,
  },
  objectiveText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  genderText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  levelContent: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  levelDescription: {
    fontSize: 13,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  frequencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyText: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  equipmentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 13,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  versionText: {
    fontSize: 12,
  },
  // Nouveaux styles pour la personnalisation
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  heroColorOption: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  heroColorPreview: {
    width: '100%',
    height: '100%',
  },
  heroColorCheck: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  languageGrid: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageText: {
    fontSize: 15,
    fontWeight: '600',
  },
  languageSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
});