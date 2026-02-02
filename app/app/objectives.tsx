import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useAuth } from '@/hooks/useAuth';
import { AppCard } from '@/components/AppCard';

interface Objective {
  id: string;
  title: string;
  description: string;
  type: 'weekly' | 'monthly' | 'target';
  target: number;
  current: number;
  unit: string;
  icon: string;
  color: string;
  completed: boolean;
}

const OBJECTIVE_TEMPLATES = [
  {
    id: 'weekly_sessions',
    title: 'Séances par semaine',
    description: 'Nombre de séances à réaliser chaque semaine',
    type: 'weekly' as const,
    target: 3,
    unit: 'séances',
    icon: 'calendar',
    color: '#6366f1',
  },
  {
    id: 'weekly_volume',
    title: 'Volume hebdomadaire',
    description: 'Poids total soulevé par semaine',
    type: 'weekly' as const,
    target: 5000,
    unit: 'kg',
    icon: 'barbell',
    color: '#8b5cf6',
  },
  {
    id: 'monthly_sessions',
    title: 'Séances par mois',
    description: 'Objectif mensuel de séances',
    type: 'monthly' as const,
    target: 12,
    unit: 'séances',
    icon: 'trophy',
    color: '#10b981',
  },
  {
    id: 'streak_goal',
    title: 'Série de jours',
    description: 'Nombre de jours consécutifs avec une séance',
    type: 'target' as const,
    target: 7,
    unit: 'jours',
    icon: 'flame',
    color: '#f59e0b',
  },
  {
    id: 'pr_squat',
    title: 'Record Squat',
    description: 'Poids maximum au squat',
    type: 'target' as const,
    target: 100,
    unit: 'kg',
    icon: 'trending-up',
    color: '#ef4444',
  },
  {
    id: 'pr_bench',
    title: 'Record Développé couché',
    description: 'Poids maximum au développé couché',
    type: 'target' as const,
    target: 80,
    unit: 'kg',
    icon: 'trending-up',
    color: '#f97316',
  },
];

export default function ObjectivesScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { workouts } = useWorkouts();
  const { user } = useAuth();
  
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [editModal, setEditModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newObjective, setNewObjective] = useState({
    title: '',
    description: '',
    target: '',
    unit: 'kg',
    type: 'target' as const,
    icon: 'star',
    color: '#6366f1',
  });

  // Clé de stockage unique par utilisateur
  const storageKey = `user_objectives_${user?.id || 'anonymous'}`;

  // Charger les objectifs sauvegardés
  useEffect(() => {
    loadObjectives();
  }, []);

  // Calculer les valeurs actuelles
  useEffect(() => {
    if (objectives.length > 0) {
      updateCurrentValues();
    }
  }, [workouts, objectives.length]);

  const loadObjectives = async () => {
    try {
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const savedObjectives = JSON.parse(saved);
        setObjectives(savedObjectives);
      } else {
        // Initialiser avec les templates par défaut pour ce nouvel utilisateur
        const defaultObjectives = OBJECTIVE_TEMPLATES.map(template => ({
          ...template,
          current: 0,
          completed: false,
        }));
        setObjectives(defaultObjectives);
        await AsyncStorage.setItem(storageKey, JSON.stringify(defaultObjectives));
      }
    } catch (error) {
      console.warn('Failed to load objectives', error);
      // Fallback avec les templates par défaut
      const defaultObjectives = OBJECTIVE_TEMPLATES.map(template => ({
        ...template,
        current: 0,
        completed: false,
      }));
      setObjectives(defaultObjectives);
    }
  };

  const saveObjectives = async (newObjectives: Objective[]) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newObjectives));
      setObjectives(newObjectives);
    } catch (error) {
      console.error('Failed to save objectives', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les objectifs.');
    }
  };

  const updateCurrentValues = () => {
    if (objectives.length === 0 || workouts.length === 0) return;

    const now = Date.now();
    const weekStart = now - (7 * 24 * 60 * 60 * 1000);
    const monthStart = now - (30 * 24 * 60 * 60 * 1000);

    const updatedObjectives = objectives.map(obj => {
      let current = obj.current; // Garder la valeur actuelle par défaut

      try {
        switch (obj.id) {
          case 'weekly_sessions':
            current = workouts.filter(w => 
              w.workout.status === 'completed' && 
              w.workout.updated_at >= weekStart
            ).length;
            break;

          case 'weekly_volume':
            current = workouts
              .filter(w => w.workout.updated_at >= weekStart)
              .reduce((sum, w) => {
                const volume = w.exercises.reduce((exSum, ex) => {
                  const sets = (ex as any).sets || [];
                  return exSum + sets.reduce((setSum: number, set: any) => {
                    if (!set) return setSum;
                    const weight = typeof set.weight === 'number' ? set.weight : 0;
                    const reps = typeof set.reps === 'number' ? set.reps : 0;
                    return setSum + (weight * reps);
                  }, 0);
                }, 0);
                return sum + volume;
              }, 0);
            break;

          case 'monthly_sessions':
            current = workouts.filter(w => 
              w.workout.status === 'completed' && 
              w.workout.updated_at >= monthStart
            ).length;
            break;

          case 'streak_goal':
            // Calculer la série actuelle
            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < 365; i++) {
              const checkDate = new Date(today);
              checkDate.setDate(checkDate.getDate() - i);
              const dayStart = checkDate.getTime();
              const dayEnd = dayStart + 24 * 60 * 60 * 1000;
              
              const hasWorkout = workouts.some(w => 
                w.workout.status === 'completed' &&
                w.workout.updated_at >= dayStart && 
                w.workout.updated_at < dayEnd
              );
              
              if (hasWorkout) {
                streak++;
              } else if (i > 0) {
                break;
              }
            }
            current = streak;
            break;

          default:
            // Pour les objectifs personnalisés, garder la valeur actuelle
            // (ils peuvent être mis à jour manuellement)
            break;
        }
      } catch (error) {
        console.warn(`Error calculating current value for ${obj.id}:`, error);
        // Garder la valeur actuelle en cas d'erreur
      }

      return {
        ...obj,
        current,
        completed: current >= obj.target,
      };
    });

    // Sauvegarder automatiquement les nouvelles valeurs
    saveObjectives(updatedObjectives);
  };

  const handleEditObjective = (objective: Objective) => {
    setSelectedObjective(objective);
    setEditValue(String(objective.target));
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedObjective) return;

    const newTarget = parseInt(editValue, 10);
    if (isNaN(newTarget) || newTarget <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une valeur valide.');
      return;
    }

    const updatedObjectives = objectives.map(obj =>
      obj.id === selectedObjective.id
        ? { ...obj, target: newTarget, completed: obj.current >= newTarget }
        : obj
    );

    await saveObjectives(updatedObjectives);
    setEditModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const handleAddObjective = async () => {
    if (!newObjective.title.trim() || !newObjective.target.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const target = parseInt(newObjective.target, 10);
    if (isNaN(target) || target <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une valeur cible valide.');
      return;
    }

    const customObjective: Objective = {
      id: `custom_${Date.now()}`,
      title: newObjective.title.trim(),
      description: newObjective.description.trim() || newObjective.title.trim(),
      type: newObjective.type,
      target,
      current: 0,
      unit: newObjective.unit,
      icon: newObjective.icon,
      color: newObjective.color,
      completed: false,
    };

    const updatedObjectives = [...objectives, customObjective];
    setObjectives(updatedObjectives);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedObjectives));
    
    // Reset form
    setNewObjective({
      title: '',
      description: '',
      target: '',
      unit: 'kg',
      type: 'target',
      icon: 'star',
      color: '#6366f1',
    });
    
    setAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#10b981';
    if (percentage >= 75) return '#f59e0b';
    return '#6b7280';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Mes Objectifs
        </Text>
        <Pressable 
          onPress={() => setAddModal(true)} 
          style={[styles.addButton, { backgroundColor: theme.colors.accent }]}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Définissez vos objectifs et suivez votre progression
        </Text>

        {objectives.map((objective) => {
          const percentage = getProgressPercentage(objective.current, objective.target);
          const progressColor = getProgressColor(percentage);

          return (
            <AppCard key={objective.id} style={styles.objectiveCard}>
              <Pressable
                onPress={() => handleEditObjective(objective)}
                style={({ pressed }) => [
                  styles.objectiveContent,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <View style={styles.objectiveHeader}>
                  <View style={[styles.objectiveIcon, { backgroundColor: objective.color + '20' }]}>
                    <Ionicons name={objective.icon as any} size={24} color={objective.color} />
                  </View>
                  <View style={styles.objectiveInfo}>
                    <Text style={[styles.objectiveTitle, { color: theme.colors.textPrimary }]}>
                      {objective.title}
                    </Text>
                    <Text style={[styles.objectiveDescription, { color: theme.colors.textSecondary }]}>
                      {objective.description}
                    </Text>
                  </View>
                  <View style={styles.objectiveActions}>
                    {objective.completed && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressText, { color: theme.colors.textPrimary }]}>
                      {objective.current} / {objective.target} {objective.unit}
                    </Text>
                    <Text style={[styles.progressPercentage, { color: progressColor }]}>
                      {Math.round(percentage)}%
                    </Text>
                  </View>
                  
                  <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${percentage}%`,
                          backgroundColor: progressColor,
                        }
                      ]} 
                    />
                  </View>
                </View>
              </Pressable>
            </AppCard>
          );
        })}
      </ScrollView>

      {/* Modal d'édition */}
      <Modal
        visible={editModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditModal(false)}
        >
          <Pressable
            style={[styles.modalCard, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.border 
            }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Modifier l'objectif
              </Text>
              <Pressable
                onPress={() => setEditModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            
            {selectedObjective && (
              <>
                <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                  {selectedObjective.title}
                </Text>
                <TextInput
                  style={[styles.modalInput, {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  }]}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="number-pad"
                  placeholder={`Objectif en ${selectedObjective.unit}`}
                  placeholderTextColor={theme.colors.textSecondary}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonSecondary, {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                    }]}
                    onPress={() => setEditModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: theme.colors.textPrimary }]}>
                      Annuler
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: theme.colors.accent }]}
                    onPress={handleSaveEdit}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                      Enregistrer
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal d'ajout d'objectif */}
      <Modal
        visible={addModal}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAddModal(false)}
        >
          <ScrollView contentContainerStyle={styles.addModalContainer}>
            <Pressable
              style={[styles.addModalCard, { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.border 
              }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Nouvel objectif
                </Text>
                <Pressable
                  onPress={() => setAddModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
              
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>
                  Titre *
                </Text>
                <TextInput
                  style={[styles.formInput, {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  }]}
                  value={newObjective.title}
                  onChangeText={(text) => setNewObjective(prev => ({ ...prev, title: text }))}
                  placeholder="Ex: Record Deadlift"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>
                  Description
                </Text>
                <TextInput
                  style={[styles.formInput, {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  }]}
                  value={newObjective.description}
                  onChangeText={(text) => setNewObjective(prev => ({ ...prev, description: text }))}
                  placeholder="Description de l'objectif"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formSection, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>
                    Objectif *
                  </Text>
                  <TextInput
                    style={[styles.formInput, {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                    }]}
                    value={newObjective.target}
                    onChangeText={(text) => setNewObjective(prev => ({ ...prev, target: text }))}
                    keyboardType="number-pad"
                    placeholder="100"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.formSection, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>
                    Unité
                  </Text>
                  <View style={[styles.unitSelector, { backgroundColor: theme.colors.surfaceMuted }]}>
                    {['kg', 'reps', 'min', 'km', 'jours'].map((unit) => (
                      <Pressable
                        key={unit}
                        style={[
                          styles.unitOption,
                          newObjective.unit === unit && { backgroundColor: theme.colors.accent }
                        ]}
                        onPress={() => setNewObjective(prev => ({ ...prev, unit }))}
                      >
                        <Text style={[
                          styles.unitText,
                          { color: newObjective.unit === unit ? '#fff' : theme.colors.textPrimary }
                        ]}>
                          {unit}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>
                  Couleur
                </Text>
                <View style={styles.colorSelector}>
                  {['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#f97316', '#06b6d4', '#84cc16'].map((color) => (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newObjective.color === color && styles.colorOptionSelected
                      ]}
                      onPress={() => setNewObjective(prev => ({ ...prev, color }))}
                    >
                      {newObjective.color === color && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSecondary, {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                  }]}
                  onPress={() => setAddModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.textPrimary }]}>
                    Annuler
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, { 
                    backgroundColor: theme.colors.accent,
                    opacity: (!newObjective.title.trim() || !newObjective.target.trim()) ? 0.5 : 1
                  }]}
                  onPress={() => {
                    console.log('Create button pressed');
                    handleAddObjective();
                  }}
                  disabled={!newObjective.title.trim() || !newObjective.target.trim()}
                >
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                    Créer
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  objectiveCard: {
    marginBottom: 16,
  },
  objectiveContent: {
    padding: 20,
  },
  objectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  objectiveIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  objectiveInfo: {
    flex: 1,
  },
  objectiveTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  objectiveDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  objectiveActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedBadge: {
    marginLeft: 12,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    maxWidth: 400,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Styles pour la modal d'ajout
  addModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  addModalCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  formSection: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 50,
  },
  unitSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  unitOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorSelector: {
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
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});