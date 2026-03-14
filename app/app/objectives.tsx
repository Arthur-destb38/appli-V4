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
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
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
import { useTranslations } from '@/hooks/usePreferences';

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
    titleKey: 'sessionsPerWeekTitle',
    descKey: 'sessionsPerWeekDesc',
    type: 'weekly' as const,
    target: 3,
    unitKey: 'sessionsUnit',
    icon: 'calendar',
    color: '#6366f1',
  },
  {
    id: 'weekly_volume',
    titleKey: 'weeklyVolumeTitle',
    descKey: 'weeklyVolumeDesc',
    type: 'weekly' as const,
    target: 5000,
    unitKey: 'kg',
    icon: 'barbell',
    color: '#8b5cf6',
  },
  {
    id: 'monthly_sessions',
    titleKey: 'sessionsPerMonthTitle',
    descKey: 'sessionsPerMonthDesc',
    type: 'monthly' as const,
    target: 12,
    unitKey: 'sessionsUnit',
    icon: 'trophy',
    color: '#10b981',
  },
  {
    id: 'streak_goal',
    titleKey: 'dayStreakTitle',
    descKey: 'dayStreakDesc',
    type: 'target' as const,
    target: 7,
    unitKey: 'daysUnit',
    icon: 'flame',
    color: '#f59e0b',
  },
  {
    id: 'pr_squat',
    titleKey: 'squatRecordTitle',
    descKey: 'squatRecordDesc',
    type: 'target' as const,
    target: 100,
    unitKey: 'kg',
    icon: 'trending-up',
    color: '#ef4444',
  },
  {
    id: 'pr_bench',
    titleKey: 'benchRecordTitle',
    descKey: 'benchRecordDesc',
    type: 'target' as const,
    target: 80,
    unitKey: 'kg',
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
  const { t } = useTranslations();

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [refreshing, setRefreshing] = useState(false);
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
          id: template.id,
          title: t(template.titleKey),
          description: t(template.descKey),
          type: template.type,
          target: template.target,
          unit: t(template.unitKey),
          icon: template.icon,
          color: template.color,
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
        id: template.id,
        title: t(template.titleKey),
        description: t(template.descKey),
        type: template.type,
        target: template.target,
        unit: t(template.unitKey),
        icon: template.icon,
        color: template.color,
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
      Alert.alert(t('error'), t('cannotSaveObjectives'));
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
              .filter(w => w.workout.status === 'completed' && w.workout.updated_at >= weekStart)
              .reduce((sum, w) => {
                return sum + w.sets.reduce((setSum, set) => {
                  const weight = typeof set.weight === 'number' ? set.weight : 0;
                  const reps = typeof set.reps === 'number' ? set.reps : 0;
                  return setSum + (weight * reps);
                }, 0);
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
      Alert.alert(t('error'), t('enterValidValue'));
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
      Alert.alert(t('error'), t('fillRequiredFields'));
      return;
    }

    const target = parseInt(newObjective.target, 10);
    if (isNaN(target) || target <= 0) {
      Alert.alert(t('error'), t('enterValidTarget'));
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

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel?: string
  ) => {
    if (typeof window !== 'undefined' && 'confirm' in window) {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: t('cancelLabel'), style: 'cancel' },
        { text: confirmLabel || t('deleteLabel'), style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  const getTranslatedTitle = (objective: Objective): string => {
    switch (objective.id) {
      case 'weekly_sessions': return t('sessionsPerWeekTitle');
      case 'weekly_volume': return t('weeklyVolumeTitle');
      case 'monthly_sessions': return t('sessionsPerMonthTitle');
      case 'streak_goal': return t('dayStreakTitle');
      case 'pr_squat': return t('squatRecordTitle');
      case 'pr_bench': return t('benchRecordTitle');
      default: return objective.title;
    }
  };

  const getTranslatedDesc = (objective: Objective): string => {
    switch (objective.id) {
      case 'weekly_sessions': return t('sessionsPerWeekDesc');
      case 'weekly_volume': return t('weeklyVolumeDesc');
      case 'monthly_sessions': return t('sessionsPerMonthDesc');
      case 'streak_goal': return t('dayStreakDesc');
      case 'pr_squat': return t('squatRecordDesc');
      case 'pr_bench': return t('benchRecordDesc');
      default: return objective.description;
    }
  };

  const getTranslatedUnit = (objective: Objective): string => {
    switch (objective.id) {
      case 'weekly_sessions':
      case 'monthly_sessions':
        return t('sessionsUnit');
      case 'streak_goal':
        return t('daysUnit');
      default:
        // Handle both new keys and legacy French values
        if (objective.unit === 'days' || objective.unit === 'jours') return t('daysUnit');
        if (objective.unit === 'sessions' || objective.unit === 'séances') return t('sessionsUnit');
        return objective.unit;
    }
  };

  const handleDeleteObjective = (objective: Objective) => {
    showConfirm(
      t('deleteObjectiveTitle'),
      t('deleteObjectiveConfirm', { title: getTranslatedTitle(objective) }),
      async () => {
        const updated = objectives.filter(obj => obj.id !== objective.id);
        await saveObjectives(updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t('myObjectives')}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await loadObjectives();
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
      >
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {t('defineGoalsAndTrack')}
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
                      {getTranslatedTitle(objective)}
                    </Text>
                    <Text style={[styles.objectiveDescription, { color: theme.colors.textSecondary }]}>
                      {getTranslatedDesc(objective)}
                    </Text>
                  </View>
                  <View style={styles.objectiveActions}>
                    {objective.completed && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      </View>
                    )}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        handleDeleteObjective(objective);
                      }}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.8 : 1 },
                      ]}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={22} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressText, { color: theme.colors.textPrimary }]}>
                      {objective.current} / {objective.target} {getTranslatedUnit(objective)}
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
                {t('editObjectiveTitle')}
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
                  {getTranslatedTitle(selectedObjective)}
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
                  placeholder={t('goalInUnit', { unit: getTranslatedUnit(selectedObjective) })}
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
                      {t('cancelLabel')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: theme.colors.accent }]}
                    onPress={handleSaveEdit}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                      {t('saveLabel')}
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
        animationType="slide"
        onRequestClose={() => setAddModal(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setAddModal(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrapper}
        >
          <View style={[styles.sheetCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.colors.border }]} />

            {/* En-tête avec couleur sélectionnée */}
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIconBadge, { backgroundColor: newObjective.color + '22' }]}>
                <Ionicons name="trophy-outline" size={22} color={newObjective.color} />
              </View>
              <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                {t('newObjectiveTitle')}
              </Text>
            </View>

            {/* Titre de l'objectif */}
            <TextInput
              style={[styles.sheetTitleInput, {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              }]}
              value={newObjective.title}
              onChangeText={(text) => setNewObjective(prev => ({ ...prev, title: text }))}
              placeholder={t('titlePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />

            {/* Objectif numérique + Unités */}
            <View style={styles.goalRow}>
              <TextInput
                style={[styles.goalInput, {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: newObjective.color,
                  color: newObjective.color,
                }]}
                value={newObjective.target}
                onChangeText={(text) => setNewObjective(prev => ({ ...prev, target: text }))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.unitScroll}
                contentContainerStyle={styles.unitScrollContent}
              >
                {[
                  { key: 'kg', label: 'kg' },
                  { key: 'reps', label: 'reps' },
                  { key: 'min', label: 'min' },
                  { key: 'km', label: 'km' },
                  { key: 'days', label: t('unitDays') },
                ].map((unitOption) => {
                  const active = newObjective.unit === unitOption.key;
                  return (
                    <Pressable
                      key={unitOption.key}
                      style={[
                        styles.unitPill,
                        active
                          ? { backgroundColor: newObjective.color }
                          : { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, borderWidth: 1 }
                      ]}
                      onPress={() => setNewObjective(prev => ({ ...prev, unit: unitOption.key }))}
                    >
                      <Text style={[styles.unitPillText, { color: active ? '#fff' : theme.colors.textSecondary }]}>
                        {unitOption.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Couleurs */}
            <View style={styles.colorRow}>
              {['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#f97316', '#06b6d4', '#84cc16'].map((color) => {
                const selected = newObjective.color === color;
                return (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      selected && { transform: [{ scale: 1.2 }], shadowColor: color, shadowOpacity: 0.5, shadowRadius: 6, elevation: 6 }
                    ]}
                    onPress={() => setNewObjective(prev => ({ ...prev, color }))}
                  >
                    {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>

            {/* CTA */}
            <Pressable
              style={[
                styles.sheetCta,
                {
                  backgroundColor: newObjective.color,
                  opacity: (!newObjective.title.trim() || !newObjective.target.trim()) ? 0.4 : 1,
                }
              ]}
              onPress={handleAddObjective}
              disabled={!newObjective.title.trim() || !newObjective.target.trim()}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.sheetCtaText}>{t('createLabel')}</Text>
            </Pressable>

            <Pressable style={styles.sheetCancel} onPress={() => setAddModal(false)}>
              <Text style={[styles.sheetCancelText, { color: theme.colors.textSecondary }]}>
                {t('cancelLabel')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 10,
    borderRadius: 10,
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
  // Bottom sheet styles
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sheetIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  sheetTitleInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  goalInput: {
    width: 72,
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 10,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  unitScroll: {
    flex: 1,
  },
  unitScrollContent: {
    gap: 6,
    alignItems: 'center',
    paddingRight: 4,
  },
  unitPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unitPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 10,
  },
  sheetCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  formInput: {
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 42,
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
