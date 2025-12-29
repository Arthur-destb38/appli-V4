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

  const displayedExercises = exercises.slice(0, 4);
  const remainingCount = Math.max(0, exercises.length - 4);

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
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: theme.colors.accent + '20' }]}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Prochaine séance
          </Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Ionicons name="pencil" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="barbell-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
            {exercises.length} exercice{exercises.length > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.statItem}>
          <Ionicons name="layers-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
            {setsCount} série{setsCount > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
            ~{estimatedDuration} min
          </Text>
        </View>
      </View>

      {/* Exercise chips */}
      {exercises.length > 0 && (
        <View style={styles.exercisesRow}>
          {displayedExercises.map((exercise, index) => (
            <ExercisePreview key={index} exercise={exercise} index={index} />
          ))}
          {remainingCount > 0 && (
            <View style={[styles.moreChip, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.moreText, { color: theme.colors.textSecondary }]}>
                +{remainingCount}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.colors.accent }]}
          onPress={onStart}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={styles.startButtonText}>Lancer</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 12,
    marginHorizontal: 12,
  },
  exercisesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  exerciseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});




