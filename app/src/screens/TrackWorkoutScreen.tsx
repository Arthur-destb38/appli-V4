import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useWorkouts } from '@/hooks/useWorkouts';
import { WorkoutExercise, WorkoutSet } from '@/types/workout';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  workoutId: number;
  modeSport?: boolean;
}

const DEFAULT_SET: { reps: number; weight: number | null; rpe: number | null } = {
  reps: 10,
  weight: null,
  rpe: 6,
};

export const TrackWorkoutScreen: React.FC<Props> = ({ workoutId, modeSport = false }) => {
  const router = useRouter();
  const { theme } = useAppTheme();
  const {
    findWorkout,
    addSet,
    updateSet,
    removeSet,
    completeWorkout,
    pendingMutations,
  } = useWorkouts();
  const workout = useMemo(() => findWorkout(workoutId), [findWorkout, workoutId]);
  const [restSeconds, setRestSeconds] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();

    // Pulse animation pour le bouton terminer
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (!workout) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.error + '20' }]}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Séance introuvable</Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Revenez à l'accueil pour créer ou sélectionner une séance.
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: theme.colors.accent }]}
          onPress={() => router.push('/')}
        >
          <Text style={styles.emptyButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleAddSet = async (exercise: WorkoutExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await addSet(exercise.id, DEFAULT_SET);
  };

  const handleRepeatLast = async (exercise: WorkoutExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const lastSet = workout.sets
      .filter((item) => item.workout_exercise_id === exercise.id)
      .slice(-1)[0];
    await addSet(exercise.id, {
      reps: lastSet?.reps ?? DEFAULT_SET.reps,
      weight: lastSet?.weight ?? DEFAULT_SET.weight,
      rpe: lastSet?.rpe ?? DEFAULT_SET.rpe,
    });
  };

  const handleAdjustSet = (set: WorkoutSet, field: 'reps' | 'weight' | 'rpe', delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    const current = Number(set[field] ?? 0);
    let next: number;
    if (field === 'weight') {
      next = Math.max(0, Math.round((current + delta) * 10) / 10);
    } else if (field === 'rpe') {
      next = Math.min(10, Math.max(0, Math.round((current + delta) * 2) / 2));
    } else {
      next = Math.max(0, Math.round(current + delta));
    }

    updateSet(set.id, {
      [field]: next,
    });
  };

  const handleToggleCompletion = async (set: WorkoutSet) => {
    const isDone = Boolean(set.done_at);
    await updateSet(set.id, { done_at: isDone ? null : Date.now() });
    if (!isDone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  };

  const handleRemoveSet = async (setId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await removeSet(setId);
  };

  const hasPendingMutations = pendingMutations > 0;

  const openVideo = (exerciseSlug: string) => {
    const query = exerciseSlug.replace(/-/g, ' ');
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' exercise')}`;
    Linking.openURL(url).catch(() => Alert.alert('Impossible d\'ouvrir la vidéo'));
  };

  const startRestTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setRemaining(restSeconds);
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current as NodeJS.Timer);
          intervalRef.current = null;
          setTimerRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timerRunning) {
      spinAnim.setValue(0);
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [timerRunning, spinAnim]);

  useEffect(() => {
    const ratio = restSeconds > 0 ? remaining / restSeconds : 0;
    Animated.timing(progressAnim, {
      toValue: ratio,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [remaining, restSeconds, progressAnim]);

  const completedSets = workout.sets.filter(s => s.done_at).length;
  const totalSets = workout.sets.length;
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const formatExerciseName = (slug: string) => {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: 8 }]}
      data={workout.exercises}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <Animated.View
          style={[
            styles.headerWrapper,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={theme.dark ? ['#1e1b4b', '#312e81', '#1e1b4b'] : ['#6366f1', '#8b5cf6', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Cercles décoratifs */}
            <View style={styles.decorCircle1} pointerEvents="none" />
            <View style={styles.decorCircle2} pointerEvents="none" />

            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <View style={styles.headerInfo}>
                  <Text style={styles.headerTitle} numberOfLines={2}>{workout.workout.title}</Text>
                  <View style={styles.headerMeta}>
                    <View style={styles.metaBadge}>
                      <Ionicons name="barbell" size={14} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.metaText}>{workout.exercises.length} exercice{workout.exercises.length > 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Ionicons name="layers" size={14} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.metaText}>{totalSets} série{totalSets > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                </View>
                {modeSport && (
                  <View style={styles.modeBadge}>
                    <Ionicons name="flash" size={14} color="#fff" />
                    <Text style={styles.modeBadgeText}>Sport</Text>
                  </View>
                )}
              </View>

              {/* Barre de progression */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Progression</Text>
                  <Text style={styles.progressValue}>{completedSets}/{totalSets} séries</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
              </View>

              {/* Timer de repos */}
              <View style={styles.timerSection}>
                <View style={styles.timerControls}>
                  <Text style={styles.timerLabel}>Repos</Text>
                  <View style={styles.timerAdjust}>
                    <TouchableOpacity
                      style={styles.timerBtn}
                      onPress={() => setRestSeconds((s) => Math.max(30, s - 10))}
                    >
                      <Ionicons name="remove" size={18} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.timerValue}>{restSeconds}s</Text>
                    <TouchableOpacity
                      style={styles.timerBtn}
                      onPress={() => setRestSeconds((s) => Math.min(300, s + 10))}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity onPress={startRestTimer} activeOpacity={0.8}>
                  <LinearGradient
                    colors={timerRunning ? ['#f97316', '#ea580c'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.timerButton}
                  >
                    {timerRunning ? (
                      <>
                        <Ionicons name="time" size={20} color="#fff" />
                        <Text style={styles.timerButtonText}>{remaining}s</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="play" size={20} color="#fff" />
                        <Text style={styles.timerButtonText}>Go</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Badge sync */}
              {hasPendingMutations && (
                <View style={styles.syncBadge}>
                  <Ionicons name="cloud-upload-outline" size={14} color="#f59e0b" />
                  <Text style={styles.syncBadgeText}>{pendingMutations} en attente de sync</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      }
      ListEmptyComponent={
        <View style={[styles.emptyExercises, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
            <Ionicons name="barbell-outline" size={32} color={theme.colors.accent} />
          </View>
          <Text style={[styles.emptyExercisesTitle, { color: theme.colors.textPrimary }]}>Aucun exercice</Text>
          <Text style={[styles.emptyExercisesSubtitle, { color: theme.colors.textSecondary }]}>
            Ajoute des exercices depuis l'écran de création pour commencer le suivi.
          </Text>
        </View>
      }
      ListFooterComponent={
        workout.exercises.length ? (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={async () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                await completeWorkout(workout.workout.id);
                router.push('/');
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.completeGradient}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.completeText}>Terminer la séance</Text>
                <View style={styles.completeProgress}>
                  <Text style={styles.completeProgressText}>{Math.round(progress)}%</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : null
      }
      renderItem={({ item, index }) => {
        const exerciseSets = workout.sets.filter((set) => set.workout_exercise_id === item.id);
        const exerciseCompleted = exerciseSets.filter(s => s.done_at).length;
        
        return (
          <Animated.View
            style={[
              styles.exerciseCard,
              { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.border,
              },
            ]}
          >
            {/* Header de l'exercice */}
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseInfo}>
                <View style={[styles.exerciseNumber, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseNameContainer}>
                  <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                    {formatExerciseName(item.exercise_id)}
                  </Text>
                  <Text style={[styles.exerciseProgress, { color: theme.colors.textSecondary }]}>
                    {exerciseCompleted}/{exerciseSets.length} séries validées
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.exerciseActions}>
              <TouchableOpacity
                onPress={() => openVideo(item.exercise_id)}
                style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceMuted }]}
              >
                <Ionicons name="play-circle-outline" size={18} color={theme.colors.accent} />
                <Text style={[styles.actionBtnText, { color: theme.colors.accent }]}>Vidéo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAddSet(item)}
                style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: theme.colors.accent }]}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Série</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRepeatLast(item)}
                style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceMuted }]}
              >
                <Ionicons name="copy-outline" size={18} color={theme.colors.textSecondary} />
                <Text style={[styles.actionBtnText, { color: theme.colors.textSecondary }]}>Répéter</Text>
              </TouchableOpacity>
            </View>

            {/* Sets */}
            {exerciseSets.length === 0 ? (
              <View style={[styles.emptySetsBox, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="fitness-outline" size={24} color={theme.colors.textSecondary} />
                <Text style={[styles.emptySetsHint, { color: theme.colors.textSecondary }]}>
                  Ajoute ta première série
                </Text>
              </View>
            ) : (
              <View style={styles.setsContainer}>
                {exerciseSets.map((set, setIndex) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    index={setIndex}
                    onAdjust={handleAdjustSet}
                    onToggle={handleToggleCompletion}
                    onRemove={handleRemoveSet}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        );
      }}
    />
  );
};

interface SetRowProps {
  set: WorkoutSet;
  index: number;
  onAdjust: (set: WorkoutSet, field: 'reps' | 'weight' | 'rpe', delta: number) => void;
  onToggle: (set: WorkoutSet) => void;
  onRemove: (setId: number) => void;
}

const SetRow: React.FC<SetRowProps> = ({ set, index, onAdjust, onToggle, onRemove }) => {
  const { theme } = useAppTheme();
  const isDone = Boolean(set.done_at);

  return (
    <Pressable
      onLongPress={() => onToggle(set)}
      style={[
        styles.setRow,
        {
          backgroundColor: isDone ? theme.colors.success + '12' : theme.colors.surfaceMuted,
          borderColor: isDone ? theme.colors.success + '30' : theme.colors.border,
        },
      ]}
    >
      <View style={styles.setHeader}>
        <View style={styles.setLabelRow}>
          <View style={[styles.setDot, { backgroundColor: isDone ? theme.colors.success : theme.colors.border }]} />
          <Text style={[styles.setLabel, { color: theme.colors.textPrimary }]}>Série {index + 1}</Text>
        </View>
        {isDone ? (
          <View style={[styles.setStatusBadge, { backgroundColor: theme.colors.success + '20' }]}>
            <Ionicons name="checkmark" size={12} color={theme.colors.success} />
            <Text style={[styles.setStatusText, { color: theme.colors.success }]}>Validée</Text>
          </View>
        ) : (
          <Text style={[styles.setHint, { color: theme.colors.textSecondary }]}>Appui long</Text>
        )}
      </View>

      <View style={styles.steppersRow}>
        <StepperModern
          label="Reps"
          value={set.reps}
          suffix=""
          icon="repeat"
          color="#6366f1"
          onIncrement={() => onAdjust(set, 'reps', 1)}
          onDecrement={() => onAdjust(set, 'reps', -1)}
        />
        <StepperModern
          label="Poids"
          value={set.weight ?? 0}
          suffix="kg"
          icon="barbell"
          color="#f59e0b"
          onIncrement={() => onAdjust(set, 'weight', 2.5)}
          onDecrement={() => onAdjust(set, 'weight', -2.5)}
        />
        <StepperModern
          label="RPE"
          value={set.rpe ?? 0}
          suffix=""
          icon="speedometer"
          color="#ef4444"
          onIncrement={() => onAdjust(set, 'rpe', 0.5)}
          onDecrement={() => onAdjust(set, 'rpe', -0.5)}
        />
      </View>

      <View style={styles.setFooter}>
        <TouchableOpacity 
          onPress={() => onToggle(set)} 
          style={[styles.setFooterBtn, { backgroundColor: isDone ? theme.colors.surfaceMuted : theme.colors.success + '15' }]}
        >
          <Ionicons 
            name={isDone ? "close-circle-outline" : "checkmark-circle-outline"} 
            size={16} 
            color={isDone ? theme.colors.textSecondary : theme.colors.success} 
          />
          <Text style={[styles.setFooterBtnText, { color: isDone ? theme.colors.textSecondary : theme.colors.success }]}>
            {isDone ? 'Annuler' : 'Valider'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onRemove(set.id)} 
          style={[styles.setFooterBtn, { backgroundColor: theme.colors.error + '10' }]}
        >
          <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

interface StepperModernProps {
  label: string;
  value: number;
  suffix?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

const StepperModern: React.FC<StepperModernProps> = ({ 
  label, 
  value, 
  suffix = '', 
  icon,
  color,
  onIncrement, 
  onDecrement 
}) => {
  const { theme } = useAppTheme();
  
  return (
    <View style={styles.stepperModern}>
      <View style={styles.stepperModernHeader}>
        <View style={[styles.stepperIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={12} color={color} />
        </View>
        <Text style={[styles.stepperModernLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      </View>
      <View style={[styles.stepperModernControls, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onDecrement} style={styles.stepperModernBtn}>
          <Ionicons name="remove" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.stepperModernValue, { color: theme.colors.textPrimary }]}>
          {Number.isFinite(value) ? value : 0}{suffix ? ` ${suffix}` : ''}
        </Text>
        <TouchableOpacity onPress={onIncrement} style={styles.stepperModernBtn}>
          <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  headerWrapper: {
    marginBottom: 8,
  },
  headerGradient: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: {
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  progressValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 12,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  timerAdjust: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 50,
    textAlign: 'center',
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  timerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  syncBadgeText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  exerciseNumber: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  exerciseNameContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '700',
  },
  exerciseProgress: {
    fontSize: 12,
    marginTop: 2,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnPrimary: {},
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptySetsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    borderRadius: 14,
  },
  emptySetsHint: {
    fontSize: 14,
    fontWeight: '500',
  },
  setsContainer: {
    gap: 10,
  },
  setRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  setLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  setStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  setStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  setHint: {
    fontSize: 11,
  },
  steppersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepperModern: {
    flex: 1,
    gap: 6,
  },
  stepperModernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperModernLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepperModernControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  stepperModernBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperModernValue: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 45,
    textAlign: 'center',
  },
  setFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  setFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  setFooterBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyExercises: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  emptyExercisesTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyExercisesSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  completeButton: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  completeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
    flex: 1,
  },
  completeProgress: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completeProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
