import { WorkoutWithRelations } from '@/db/workouts-repository';
import {
  buildExerciseProgression,
  calculateWorkoutDurationMs,
  calculateWorkoutVolume,
  formatDuration,
} from '@/utils/workoutSummary';

const buildWorkout = (sets: Array<Partial<WorkoutWithRelations['sets'][number]>>): WorkoutWithRelations => ({
  workout: {
    id: 1,
    title: 'Séance',
    status: 'completed',
    created_at: 0,
    updated_at: 0,
  },
  exercises: [],
  sets: sets.map((set, index) => ({
    id: index + 1,
    workout_exercise_id: 1,
    reps: set.reps ?? 0,
    weight: set.weight ?? null,
    rpe: set.rpe ?? null,
    done_at: set.done_at ?? null,
  })),
});

describe('workoutSummary helpers', () => {
  it('calcule le volume total', () => {
    const workout = buildWorkout([
      { reps: 8, weight: 80 },
      { reps: 10, weight: 60 },
      { reps: 12, weight: null },
    ]);

    expect(calculateWorkoutVolume(workout)).toBe(8 * 80 + 10 * 60);
  });

  it('calcule la durée à partir des timestamps', () => {
    const start = Date.now();
    const mid = start + 5 * 60 * 1000;
    const end = start + 45 * 60 * 1000;
    const workout = buildWorkout([
      { done_at: start },
      { done_at: mid },
      { done_at: end },
    ]);

    expect(calculateWorkoutDurationMs(workout.sets)).toBe(end - start);
  });

  it('retourne null quand les timestamps sont insuffisants', () => {
    const start = Date.now();
    const workout = buildWorkout([{ done_at: start }]);

    expect(calculateWorkoutDurationMs(workout.sets)).toBeNull();
  });

  it('formate les durées en minutes et heures', () => {
    expect(formatDuration(30 * 60 * 1000)).toBe('30 min');
    expect(formatDuration(65 * 60 * 1000)).toBe('1 h 5 min');
    expect(formatDuration(2 * 60 * 60 * 1000)).toBe('2 h');
    expect(formatDuration(0)).toBe("moins d'une minute");
  });

  it('construit la progression pour un exercice', () => {
    const workouts: WorkoutWithRelations[] = [
      {
        workout: {
          id: 1,
          title: 'Séance A',
          status: 'completed',
          created_at: 0,
          updated_at: 10,
        },
        exercises: [{ id: 11, workout_id: 1, exercise_id: 'bench-press', order_index: 0 }],
        sets: [
          { id: 101, workout_exercise_id: 11, reps: 8, weight: 80, rpe: 8 },
          { id: 102, workout_exercise_id: 11, reps: 6, weight: 85, rpe: 9 },
        ],
      },
      {
        workout: {
          id: 2,
          title: 'Séance B',
          status: 'completed',
          created_at: 0,
          updated_at: 20,
        },
        exercises: [{ id: 21, workout_id: 2, exercise_id: 'bench-press', order_index: 0 }],
        sets: [{ id: 201, workout_exercise_id: 21, reps: 5, weight: 90, rpe: 9 }],
      },
    ];

    const points = buildExerciseProgression(workouts, 'bench-press');

    expect(points).toEqual([
      {
        workoutId: 1,
        date: 10,
        value: 8 * 80 + 6 * 85,
        title: 'Séance A',
      },
      {
        workoutId: 2,
        date: 20,
        value: 5 * 90,
        title: 'Séance B',
      },
    ]);
  });
});
