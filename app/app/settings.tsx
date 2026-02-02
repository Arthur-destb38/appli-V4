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
import { useAuth } from '@/hooks/useAuth';
import { apiCall } from '@/utils/api';

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

const EXPERIENCE_LEVELS = [
  { key: 'beginner', label: 'Débutant', description: 'Moins de 6 mois' },
  { key: 'intermediate', label: 'Intermédiaire', description: '6 mois - 2 ans' },
  { key: 'advanced', label: 'Avancé', description: 'Plus de 2 ans' },
];

const OBJECTIVES = [
  { key: 'muscle_gain', label: 'Prise de masse', icon: '💪' },
  { key: 'weight_loss', label: 'Perte de poids', icon: '🔥' },
  { key: 'strength', label: 'Force', icon: '🏋️' },
  { key: 'endurance', label: 'Endurance', icon: '🏃' },
  { key: 'general_fitness', label: 'Forme générale', icon: '✨' },
  { key: 'sport_specific', label: 'Sport spécifique', icon: '⚽' },
];

const EQUIPMENT_OPTIONS = [
  'Haltères',
  'Barre olympique', 
  'Machines',
  'Kettlebells',
  'Élastiques',
  'Poids du corps',
  'TRX',
  'Banc',
  'Rack à squat',
  'Cardio (tapis, vélo...)',
];

const GENDER_OPTIONS = [
  { key: 'male', label: 'Homme', icon: 'male' },
  { key: 'female', label: 'Femme', icon: 'female' },
  { key: 'other', label: 'Autre', icon: 'transgender' },
  { key: 'prefer_not_to_say', label: 'Préfère ne pas dire', icon: 'help-circle' },
];

export default function SettingsScreen() {
  const { theme } = useAppTheme();
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // États pour les données du profil
  const [profileData, setProfileData] = useState<ProfileSetupData>({
    consent_to_public_share: false,
  });
  
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
      Alert.alert('Erreur', 'Le nom d\'utilisateur ne peut pas être vide');
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
      Alert.alert('✅ Informations mises à jour !');
    } catch (error: any) {
      if (error.code === 'username_taken') {
        Alert.alert('Erreur', 'Ce nom d\'utilisateur est déjà pris');
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder les informations');
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
        Alert.alert('✅ Profil complet sauvegardé !');
        await refresh();
      } else {
        throw new Error('Erreur sauvegarde');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil complet');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Es-tu sûr de vouloir te déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Erreur déconnexion:', error);
              router.replace('/login');
            }
          },
        },
      ]
    );
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
          Chargement des paramètres...
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
          <Text style={styles.headerTitle}>Paramètres</Text>
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
                  Informations de base
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
                    Nom d'utilisateur
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Ton pseudo"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Bio
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Parle de toi..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Objectif principal
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
                          {obj.label}
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
                        <Text style={styles.saveButtonText}>Sauvegarder</Text>
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
                  Informations personnelles
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
                    Localisation
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={profileData.location || ''}
                    onChangeText={(text) => updateField('location', text)}
                    placeholder="Paris, France"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      Taille (cm)
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                      value={profileData.height?.toString() || ''}
                      onChangeText={(text) => updateField('height', parseInt(text) || undefined)}
                      placeholder="175"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      Poids (kg)
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                      value={profileData.weight?.toString() || ''}
                      onChangeText={(text) => updateField('weight', parseFloat(text) || undefined)}
                      placeholder="70"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Genre
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
                          {gender.label}
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
                  Objectifs fitness
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
                    Niveau d'expérience
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
                          {level.label}
                        </Text>
                        <Text
                          style={[
                            styles.levelDescription,
                            { color: theme.colors.textSecondary },
                            profileData.experience_level === level.key && { color: theme.colors.accent },
                          ]}
                        >
                          {level.description}
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
                    Fréquence d'entraînement (fois par semaine)
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
                    Équipement disponible
                  </Text>
                  <View style={styles.equipmentGrid}>
                    {EQUIPMENT_OPTIONS.map((equipment) => {
                      const isSelected = profileData.equipment_available?.includes(equipment);
                      return (
                        <TouchableOpacity
                          key={equipment}
                          style={[
                            styles.equipmentChip,
                            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                            isSelected && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
                          ]}
                          onPress={() => {
                            const current = profileData.equipment_available || [];
                            if (isSelected) {
                              updateField('equipment_available', current.filter(e => e !== equipment));
                            } else {
                              updateField('equipment_available', [...current, equipment]);
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
                            {equipment}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
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
                  Préférences
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
                        Partage public
                      </Text>
                      <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                        Autoriser le partage de tes séances publiquement
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
                        <Text style={styles.saveButtonText}>Sauvegarder le profil complet</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: '#ef4444' + '20' }]}>
                  <Ionicons name="exit" size={20} color="#ef4444" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Actions
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
                  Se déconnecter
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Version */}
          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
              Gorillax v1.0.0
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
});