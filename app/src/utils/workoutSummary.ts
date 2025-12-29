import { WorkoutWithRelations } from '@/db/workouts-repository';
import { WorkoutSet } from '@/types/workout';

export const calculateWorkoutVolume = (workout: WorkoutWithRelations) =>
  workout.sets.reduce((total, set) => {
    const weight = set.weight ?? 0;
    return total + weight * set.reps;
  }, 0);

export const calculateExerciseVolume = (sets: WorkoutSet[]) =>
  sets.reduce((total, set) => {
    const weight = set.weight ?? 0;
    return total + weight * set.reps;
  }, 0);

export const calculateWorkoutDurationMs = (sets: WorkoutSet[]): number | null => {
  const timestamps = sets
    .map((set) => set.done_at)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (timestamps.length < 2) {
    return null;
  }
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  if (max <= min) {
    return null;
  }
  return max - min;
};

export const formatDuration = (durationMs: number) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "moins d'une minute";
  }
  const totalMinutes = Math.round(durationMs / 60000);
  if (totalMinutes <= 1) {
    return '1 min';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) {
    return `${hours} h ${minutes} min`;
  }
  if (hours) {
    return `${hours} h`;
  }
  return `${totalMinutes} min`;
};

export interface ProgressPoint {
  workoutId: number;
  date: number;
  value: number;
  title: string;
}

export const buildExerciseProgression = (
  workouts: WorkoutWithRelations[],
  exerciseId: string
): ProgressPoint[] => {
  const normalizedId = exerciseId.trim().toLowerCase();
  if (!normalizedId) {
    return [];
  }

  return workouts
    .filter((workout) =>
      workout.exercises.some(
        (exercise) => exercise.exercise_id.toLowerCase() === normalizedId
      )
    )
    .map((workout) => {
      const exerciseEntries = workout.exercises.filter(
        (exercise) => exercise.exercise_id.toLowerCase() === normalizedId
      );
      const exerciseIds = new Set(exerciseEntries.map((exercise) => exercise.id));
      const sets = workout.sets.filter((set) => exerciseIds.has(set.workout_exercise_id));
      return {
        workoutId: workout.workout.id,
        date: workout.workout.updated_at,
        value: calculateExerciseVolume(sets),
        title: workout.workout.title,
      };
    }).sort((a, b) => a.date - b.date);
};
