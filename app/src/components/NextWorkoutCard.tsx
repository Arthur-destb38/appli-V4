import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Exercise {
  name: string;
  muscle_group?: string;
}

interface NextWorkoutCardProps {
  title: string;
  exercises: Exercise[];
  estimatedDuration?: number; // en minutes
  setsCount?: number;
  onStart: () => void;
  onEdit: () => void;
}

const ExercisePreview: React.FC<{ exercise: Exercise; index: number }> = ({ exercise, index }) => {
  const { theme } = useAppTheme();
  
  const getMuscleIcon = (muscle?: string): keyof typeof Ionicons.glyphMap => {
    const muscleIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
      'chest': 'body-outline',
      'back': 'body-outline',
      'shoulders': 'body-outline',
      'biceps': 'fitness-outline',
      'triceps': 'fitness-outline',
      'legs': 'walk-outline',
      'core': 'body-outline',
      'pectoraux': 'body-outline',
      'dos': 'body-outline',
      'épaules': 'body-outline',
      'jambes': 'walk-outline',
      'abdos': 'body-outline',
    };
    const key = muscle?.toLowerCase() || '';
    return muscleIcons[key] || 'barbell-outline';
  };

  const colors = ['#667eea', '#f093fb', '#4facfe', '#00f2fe', '#43e97b'];
  const color = colors[index % colors.length];

  return (
    <View style={[styles.exerciseChip, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
      <Ionicons name={getMuscleIcon(exercise.muscle_group)} size={12} color={color} />
      <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
        {exercise.name.length > 12 ? exercise.name.slice(0, 12) + '...' : exercise.name}
      </Text>
    </View>
  );
};

export const NextWorkoutCard: React.FC<NextWorkoutCardProps> = ({
  title,
  exercises,
  estimatedDuration = 45,
  setsCount = 0,
  onStart,
  onEdit,
}) => {
  const { theme } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const displayedExercises = exercises.slice(0, 3);
  const remainingCount = Math.max(0, exercises.length - 3);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Header épuré */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {exercises.length} exercices • {estimatedDuration} min
          </Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Ionicons name="pencil" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Exercise chips épurés */}
      {exercises.length > 0 && (
        <View style={styles.exercisesRow}>
          {displayedExercises.map((exercise, index) => (
            <View key={index} style={[styles.exerciseChip, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.exerciseName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {exercise.name.length > 15 ? exercise.name.slice(0, 15) + '...' : exercise.name}
              </Text>
            </View>
          ))}
          {remainingCount > 0 && (
            <View style={[styles.exerciseChip, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.exerciseName, { color: theme.colors.textSecondary }]}>
                +{remainingCount}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Bouton d'action épuré */}
      <TouchableOpacity
        style={[styles.startButton, { backgroundColor: theme.colors.accent }]}
        onPress={onStart}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={16} color="#fff" />
        <Text style={styles.startButtonText}>Lancer</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exercisesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  exerciseChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: '500',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});




