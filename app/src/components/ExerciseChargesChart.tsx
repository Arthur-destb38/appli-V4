import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { findExerciseById } from '@/data/exercises';
import * as Haptics from 'expo-haptics';
import { useNavigation } from 'expo-router';
import { AppCard } from './AppCard';

interface ExerciseChargeData {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  avgWeight: number;
  maxVolume: number;
  sessionCount: number;
  lastDate: number;
}

interface ExerciseChargesChartProps {
  workouts: Array<{
    workout: { id: number; updated_at: number };
    exercises: Array<{ id: number; exercise_id: string }>;
    sets: Array<{
      workout_exercise_id: number;
      weight?: number;
      reps: number;
    }>;
  }>;
  title?: string;
}

export const ExerciseChargesChart: React.FC<ExerciseChargesChartProps> = ({
  workouts,
  title = 'Charges par exercice',
}) => {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const exerciseStats = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        weights: number[];
        volumes: number[];
        dates: number[];
        exerciseId: string;
      }
    >();

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        const exerciseSets = workout.sets.filter(
          (set) => set.workout_exercise_id === exercise.id && set.weight && set.weight > 0
        );

        if (exerciseSets.length === 0) return;

        const key = exercise.exercise_id.toLowerCase();
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            weights: [],
            volumes: [],
            dates: [],
            exerciseId: exercise.exercise_id,
          });
        }

        const stats = statsMap.get(key)!;
        exerciseSets.forEach((set) => {
          if (set.weight) {
            stats.weights.push(set.weight);
            stats.volumes.push(set.weight * set.reps);
            stats.dates.push(workout.workout.updated_at);
          }
        });
      });
    });

    // Convertir en tableau et calculer les statistiques
    const exercises: ExerciseChargeData[] = Array.from(statsMap.entries())
      .map(([key, stats]) => {
        const catalogEntry = findExerciseById(stats.exerciseId);
        const exerciseName = catalogEntry?.name || stats.exerciseId;

        // Vérifier que les tableaux ne sont pas vides
        if (stats.weights.length === 0 || stats.volumes.length === 0 || stats.dates.length === 0) {
          return null;
        }

        return {
          exerciseId: stats.exerciseId,
          exerciseName,
          maxWeight: Math.max(...stats.weights),
          avgWeight: stats.weights.reduce((a, b) => a + b, 0) / stats.weights.length,
          maxVolume: Math.max(...stats.volumes),
          sessionCount: new Set(stats.dates).size,
          lastDate: Math.max(...stats.dates),
        };
      })
      .filter((ex): ex is ExerciseChargeData => ex !== null && ex.sessionCount >= 2) // Au moins 2 séances
      .sort((a, b) => b.sessionCount - a.sessionCount) // Trier par fréquence
      .slice(0, 8); // Top 8 exercices

    return exercises;
  }, [workouts]);

  if (exerciseStats.length === 0) {
    return null;
  }

  const ExerciseItem: React.FC<{ exercise: ExerciseChargeData; index: number }> = ({
    exercise,
    index,
  }) => {
    const itemAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(itemAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start();
    }, [itemAnim, index]);

    return (
      <Animated.View
        style={{
          opacity: itemAnim,
          transform: [
            {
              translateY: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.exerciseItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            navigation.navigate('history/progression' as never, {
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exerciseName,
            } as never);
          }}
        >
          <View style={styles.exerciseHeader}>
            <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {exercise.exerciseName}
            </Text>
            <Text style={[styles.sessionCount, { color: theme.colors.textSecondary }]}>
              {exercise.sessionCount} séance{exercise.sessionCount > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Max</Text>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {Math.round(exercise.maxWeight)} kg
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Moy</Text>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {Math.round(exercise.avgWeight)} kg
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Volume</Text>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {Math.round(exercise.maxVolume)} kg
              </Text>
            </View>
          </View>

          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <AppCard style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        </View>

        <View style={styles.exercisesList}>
          {exerciseStats.map((exercise, index) => (
            <ExerciseItem key={exercise.exerciseId} exercise={exercise} index={index} />
          ))}
        </View>
      </AppCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  exercisesList: {
    gap: 8,
  },
  exerciseItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sessionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  arrowContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
});

