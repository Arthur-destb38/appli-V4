import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import ExerciseProgressScreen from '@/screens/ExerciseProgressScreen';
import { WorkoutWithRelations } from '@/db/workouts-repository';

const mockBack = jest.fn();
let mockWorkouts: WorkoutWithRelations[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({
    exerciseId: 'bench-press',
    exerciseName: 'Développé couché',
  }),
}));

jest.mock('@/hooks/useWorkouts', () => ({
  useWorkouts: () => ({
    workouts: mockWorkouts,
  }),
}));

const createWorkout = (
  id: number,
  title: string,
  daysAgo: number,
  value: number
): WorkoutWithRelations => {
  const now = Date.now();
  const updatedAt = now - daysAgo * 24 * 60 * 60 * 1000;
  return {
    workout: {
      id,
      title,
      status: 'completed',
      created_at: updatedAt,
      updated_at: updatedAt,
    },
    exercises: [{ id: id * 10, workout_id: id, exercise_id: 'bench-press', order_index: 0 }],
    sets: [
      {
        id: id * 100,
        workout_exercise_id: id * 10,
        reps: 1,
        weight: value,
        rpe: 8,
        done_at: updatedAt,
      },
    ],
  };
};

describe('ExerciseProgressScreen', () => {
  const fixedNow = new Date('2025-01-31T10:00:00Z').getTime();

  beforeAll(() => {
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);
  });

  afterAll(() => {
    (Date.now as jest.SpyInstance).mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('affiche un état vide quand moins de trois points', () => {
    mockWorkouts = [
      createWorkout(1, 'Séance 1', 2, 80),
      createWorkout(2, 'Séance 2', 5, 90),
    ];

    const { getByText } = render(<ExerciseProgressScreen />);

    expect(getByText('Pas assez de données')).toBeTruthy();
    expect(getByText('Séance 2')).toBeTruthy();
  });

  it('affiche la courbe et filtre les données', () => {
    mockWorkouts = [
      createWorkout(1, 'Séance J-40', 40, 60),
      createWorkout(2, 'Séance J-6', 6, 90),
      createWorkout(3, 'Séance J-5', 5, 100),
      createWorkout(4, 'Séance J-2', 2, 110),
    ];

    const { getAllByTestId, getByText, queryByText } = render(<ExerciseProgressScreen />);

    expect(queryByText('Pas assez de données')).toBeNull();
    expect(getByText('Séance J-40')).toBeTruthy();
    expect(getByText('Séance J-2')).toBeTruthy();
    expect(getAllByTestId('mock-svg').length).toBeGreaterThan(0);

    fireEvent.press(getByText('7 jours'));
    expect(queryByText('Séance J-40')).toBeNull();
    expect(getByText('Séance J-2')).toBeTruthy();

    fireEvent.press(getByText('Tout'));
    expect(getByText('Séance J-40')).toBeTruthy();
  });
});
