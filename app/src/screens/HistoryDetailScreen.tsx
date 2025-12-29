import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useRouter } from 'expo-router';

import { findExerciseById } from '@/data/exercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { WorkoutSet } from '@/types/workout';
import {
  calculateExerciseVolume,
  calculateWorkoutDurationMs,
  calculateWorkoutVolume,
  formatDuration,
} from '@/utils/workoutSummary';
import { useAppTheme } from '@/theme/ThemeProvider';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Pressable } from 'react-native';

interface Props {
  workoutId: number;
}

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));

const formatSetLine = (set: WorkoutSet) => {
  const weightLabel = set.weight != null ? `${set.weight} kg` : 'Poids libre';
  const rpeLabel = set.rpe != null ? `RPE ${set.rpe}` : 'RPE ?';
  return `${set.reps} répétition(s) · ${weightLabel} · ${rpeLabel}`;
};

export const HistoryDetailScreen: React.FC<Props> = ({ workoutId }) => {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { findWorkout, duplicateWorkout } = useWorkouts();
  const [isDuplicating, setIsDuplicating] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const workout = useMemo(() => findWorkout(workoutId), [findWorkout, workoutId]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const summary = useMemo(() => {
    if (!workout) {
      return {
        volume: 0,
        completedSets: 0,
        totalSets: 0,
        durationLabel: null as string | null,
      };
    }
    const volume = calculateWorkoutVolume(workout);
    const completedSets = workout.sets.filter((set) => Boolean(set.done_at)).length;
    const totalSets = workout.sets.length;
    const durationMs = calculateWorkoutDurationMs(workout.sets);
    return {
      volume,
      completedSets,
      totalSets,
      durationLabel: durationMs ? formatDuration(durationMs) : null,
    };
  }, [workout]);

  const exercises = useMemo(() => {
    if (!workout) {
      return [];
    }
    return [...workout.exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map((exercise) => {
        const sets = workout.sets
          .filter((set) => set.workout_exercise_id === exercise.id)
          .sort((a, b) => a.id - b.id);
        const catalogEntry = findExerciseById(exercise.exercise_id);
        return {
          id: exercise.id,
          code: exercise.exercise_id,
          name: catalogEntry?.name ?? exercise.exercise_id,
          sets,
          volume: calculateExerciseVolume(sets),
        };
      });
  }, [workout]);

  if (!workout) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Séance introuvable</Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Retourne à l'historique pour sélectionner une séance valide.
        </Text>
        <AppButton
          title="Revenir à l'historique"
          onPress={() => router.push('/history')}
          style={styles.backButton}
        />
      </View>
    );
  }

  const handleDuplicate = async () => {
    Haptics.selectionAsync().catch(() => {});
    setIsDuplicating(true);
    try {
      const duplicated = await duplicateWorkout(workout.workout.id);
      if (!duplicated) {
        Alert.alert(
          'Duplication impossible',
          'Nous ne parvenons pas à dupliquer cette séance pour le moment.'
        );
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push(`/create?id=${duplicated.workout.id}`);
    } catch (error) {
      console.warn('Failed to duplicate workout', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(
        'Duplication impossible',
        'Une erreur est survenue lors de la duplication. Réessaie plus tard.'
      );
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleRelaunch = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/track/${workout.workout.id}`);
  };

  const handleOpenProgress = (exerciseId: string, exerciseName: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push({
      pathname: '/history/progression',
      params: {
        exerciseId,
        exerciseName,
      },
    });
  };

  const ExerciseCard: React.FC<{ exercise: typeof exercises[0]; index: number }> = ({ exercise, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start();
    }, [cardAnim, index]);

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            {
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }}
      >
        <AppCard style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]}>{exercise.name}</Text>
              <Text style={[styles.exerciseCode, { color: theme.colors.textSecondary }]}>{exercise.code}</Text>
            </View>
            <View style={styles.exerciseMetaColumn}>
              <Text style={[styles.exerciseMeta, { color: theme.colors.textSecondary }]}>
                {exercise.sets.length} série{exercise.sets.length > 1 ? 's' : ''}
                {exercise.volume ? ` · ${Math.round(exercise.volume)} kg` : ''}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.progressLink,
                  {
                    backgroundColor: theme.colors.accent + '20',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleOpenProgress(exercise.code, exercise.name)}
              >
                <Ionicons name="trending-up" size={14} color={theme.colors.accent} />
                <Text style={[styles.progressLinkText, { color: theme.colors.accent }]}>
                  Progression
                </Text>
              </Pressable>
            </View>
          </View>
          {exercise.sets.length === 0 ? (
            <View style={[styles.noSetsContainer, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.noSets, { color: theme.colors.textSecondary }]}>
                Aucune série enregistrée pour cet exercice.
              </Text>
            </View>
          ) : (
            <View style={styles.setsContainer}>
              {exercise.sets.map((set, setIndex) => (
                <View
                  key={set.id}
                  style={[
                    styles.setCard,
                    {
                      backgroundColor: set.done_at
                        ? theme.colors.primaryMuted + '30'
                        : theme.colors.surface,
                      borderColor: set.done_at ? theme.colors.primaryMuted : theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.setHeader}>
                    <View style={styles.setTitleRow}>
                      <Text style={[styles.setTitle, { color: theme.colors.textPrimary }]}>
                        Série {setIndex + 1}
                      </Text>
                      {set.done_at && (
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.primaryMuted} />
                      )}
                    </View>
                    <View
                      style={[
                        styles.setStatusBadge,
                        {
                          backgroundColor: set.done_at
                            ? theme.colors.primaryMuted + '20'
                            : theme.colors.surfaceMuted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.setStatus,
                          {
                            color: set.done_at
                              ? theme.colors.primaryMuted
                              : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {set.done_at ? 'Validée' : 'Planifiée'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.setDescription, { color: theme.colors.textPrimary }]}>
                    {formatSetLine(set)}
                  </Text>
                  {set.done_at && (
                    <View style={styles.setTimestampRow}>
                      <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.setTimestamp, { color: theme.colors.textSecondary }]}>
                        Validée le {formatDate(set.done_at)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </AppCard>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          opacity: fadeAnim,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppCard style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {workout.workout.title}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    workout.workout.status === 'completed'
                      ? theme.colors.primaryMuted
                      : theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {workout.workout.status === 'completed' ? 'Terminée' : 'Brouillon'}
              </Text>
            </View>
          </View>
          <Text style={[styles.metaLine, { color: theme.colors.textSecondary }]}>
            {formatDate(workout.workout.updated_at)} · {workout.exercises.length} exercice
            {workout.exercises.length > 1 ? 's' : ''} · {workout.sets.length} série
            {workout.sets.length > 1 ? 's' : ''}
          </Text>
          <View style={styles.summaryRow}>
            <SummaryItem
              label="Volume total"
              value={`${Math.round(summary.volume)} kg`}
              icon="barbell"
            />
            <SummaryItem
              label="Séries validées"
              value={`${summary.completedSets}/${summary.totalSets || 0}`}
              icon="checkmark-circle"
            />
            <SummaryItem
              label="Durée estimée"
              value={summary.durationLabel ?? 'Non disponible'}
              icon="time"
            />
          </View>
          {workout.workout.server_id && (
            <View style={[styles.syncBadge, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
              <Text style={[styles.syncText, { color: theme.colors.accent }]}>Synchronisée</Text>
            </View>
          )}
        </AppCard>

        <View style={styles.actionsRow}>
          <AppButton
            title={isDuplicating ? 'Duplication…' : 'Dupliquer'}
            onPress={handleDuplicate}
            loading={isDuplicating}
            disabled={isDuplicating}
            style={styles.actionButton}
            variant="primary"
          />
          <AppButton
            title="Relancer"
            onPress={handleRelaunch}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>

        {exercises.length === 0 ? (
          <AppCard style={styles.emptyExercises}>
            <Ionicons name="fitness-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyExercisesTitle, { color: theme.colors.textPrimary }]}>
              Aucun exercice enregistré
            </Text>
            <Text style={[styles.emptyExercisesSubtitle, { color: theme.colors.textSecondary }]}>
              Les exercices de cette séance n'ont pas encore été saisis.
            </Text>
          </AppCard>
        ) : (
          exercises.map((exercise, index) => (
            <ExerciseCard key={exercise.id} exercise={exercise} index={index} />
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
};

interface SummaryItemProps {
  label: string;
  value: string;
  icon: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, icon }) => {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.summaryItem, { backgroundColor: theme.colors.surfaceMuted }]}>
      <Ionicons name={icon as any} size={16} color={theme.colors.accent} />
      <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
};

export default HistoryDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  headerCard: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaLine: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  syncBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  exerciseCard: {
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseCode: {
    fontSize: 12,
    fontWeight: '500',
  },
  exerciseMetaColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  exerciseMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  progressLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setsContainer: {
    gap: 8,
  },
  setCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  setStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  setStatus: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  setTimestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setTimestamp: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 8,
  },
  emptyExercises: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyExercisesTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyExercisesSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  noSetsContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  noSets: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
