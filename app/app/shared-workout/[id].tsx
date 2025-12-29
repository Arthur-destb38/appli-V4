import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/ThemeProvider';
import { getApiBaseUrl } from '@/utils/api';

interface SetData {
  reps: number;
  weight: number;
}

interface ExerciseData {
  name: string;
  slug: string;
  muscle_group: string;
  sets: SetData[];
}

interface WorkoutSnapshot {
  title: string;
  exercises: ExerciseData[];
}

export default function SharedWorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [workout, setWorkout] = useState<WorkoutSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/workouts/shared/${id}`);
        if (!response.ok) {
          throw new Error('Séance non trouvée');
        }
        const data = await response.json();
        setWorkout(data);
      } catch (err: any) {
        setError(err.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchWorkout();
    }
  }, [id]);

  const totalVolume = workout?.exercises.reduce((acc, ex) => {
    return acc + ex.sets.reduce((setAcc, set) => setAcc + (set.weight * set.reps), 0);
  }, 0) || 0;

  const totalSets = workout?.exercises.reduce((acc, ex) => acc + ex.sets.length, 0) || 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Chargement de la séance...
        </Text>
      </View>
    );
  }

  if (error || !workout) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          {error || 'Séance non trouvée'}
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.colors.accent }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: 'Détail séance',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
        }} 
      />
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {workout.title}
          </Text>
          
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="fitness" size={16} color={theme.colors.accent} />
              <Text style={[styles.statText, { color: theme.colors.accent }]}>
                {workout.exercises.length} exercices
              </Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="layers" size={16} color={theme.colors.accent} />
              <Text style={[styles.statText, { color: theme.colors.accent }]}>
                {totalSets} séries
              </Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="barbell" size={16} color={theme.colors.accent} />
              <Text style={[styles.statText, { color: theme.colors.accent }]}>
                {totalVolume.toLocaleString()} kg
              </Text>
            </View>
          </View>
        </View>

        {/* Exercises list */}
        <View style={styles.exercisesList}>
          {workout.exercises.map((exercise, index) => (
            <View 
              key={`${exercise.slug}-${index}`}
              style={[styles.exerciseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={styles.exerciseHeader}>
                <View style={[styles.exerciseNumber, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]}>
                    {exercise.name}
                  </Text>
                  <Text style={[styles.muscleGroup, { color: theme.colors.textSecondary }]}>
                    {exercise.muscle_group}
                  </Text>
                </View>
              </View>

              {/* Sets table */}
              <View style={styles.setsContainer}>
                <View style={[styles.setsHeader, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.setHeaderText, { color: theme.colors.textSecondary }]}>Série</Text>
                  <Text style={[styles.setHeaderText, { color: theme.colors.textSecondary }]}>Poids</Text>
                  <Text style={[styles.setHeaderText, { color: theme.colors.textSecondary }]}>Reps</Text>
                </View>
                {exercise.sets.map((set, setIndex) => (
                  <View 
                    key={setIndex} 
                    style={[
                      styles.setRow, 
                      setIndex % 2 === 0 && { backgroundColor: theme.colors.surfaceMuted }
                    ]}
                  >
                    <Text style={[styles.setText, { color: theme.colors.textSecondary }]}>
                      {setIndex + 1}
                    </Text>
                    <Text style={[styles.setText, styles.weightText, { color: theme.colors.textPrimary }]}>
                      {set.weight} kg
                    </Text>
                    <Text style={[styles.setText, styles.repsText, { color: theme.colors.accent }]}>
                      {set.reps}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Exercise volume */}
              <View style={[styles.exerciseVolume, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.volumeLabel, { color: theme.colors.textSecondary }]}>
                  Volume total
                </Text>
                <Text style={[styles.volumeValue, { color: theme.colors.textPrimary }]}>
                  {exercise.sets.reduce((acc, s) => acc + s.weight * s.reps, 0).toLocaleString()} kg
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exercisesList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  exerciseCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  muscleGroup: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  setsContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  setsHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  setHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 4,
  },
  setText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  weightText: {
    fontWeight: '600',
  },
  repsText: {
    fontWeight: '700',
  },
  exerciseVolume: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  volumeLabel: {
    fontSize: 13,
  },
  volumeValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});



