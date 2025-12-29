import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import HistoryDetailScreen from '@/screens/HistoryDetailScreen';
import { WorkoutWithRelations } from '@/db/workouts-repository';

const mockPush = jest.fn();
const mockFindWorkout = jest.fn();
const mockDuplicateWorkout = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/useWorkouts', () => ({
  useWorkouts: () => ({
    findWorkout: mockFindWorkout,
    duplicateWorkout: mockDuplicateWorkout,
  }),
}));

const baseWorkout: WorkoutWithRelations = {
  workout: {
    id: 1,
    title: 'Séance Force',
    status: 'completed',
    created_at: Date.now(),
    updated_at: Date.now(),
    server_id: 99,
  },
  exercises: [
    { id: 10, workout_id: 1, exercise_id: 'bench-press', order_index: 0 },
    { id: 11, workout_id: 1, exercise_id: 'deadlift', order_index: 1 },
  ],
  sets: [
    { id: 100, workout_exercise_id: 10, reps: 8, weight: 80, rpe: 8, done_at: Date.now() - 2000 },
    { id: 101, workout_exercise_id: 10, reps: 6, weight: 85, rpe: 9, done_at: Date.now() - 1000 },
    { id: 102, workout_exercise_id: 11, reps: 5, weight: 120, rpe: 9, done_at: Date.now() },
  ],
};

describe('HistoryDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindWorkout.mockReturnValue(baseWorkout);
    mockDuplicateWorkout.mockResolvedValue({
      ...baseWorkout,
      workout: { ...baseWorkout.workout, id: 42, title: 'Séance Force (copie)', status: 'draft' },
      exercises: baseWorkout.exercises.map((exercise) => ({
        ...exercise,
        workout_id: 42,
        id: exercise.id + 100,
      })),
      sets: [],
    });
  });

  it('affiche la synthèse de la séance', () => {
    const { getByText, getAllByText } = render(<HistoryDetailScreen workoutId={1} />);

    expect(getByText('Séance Force')).toBeTruthy();
    expect(getByText(/Volume total/)).toBeTruthy();
    expect(getByText('Synchronisée')).toBeTruthy();
    expect(getAllByText('Série 1')[0]).toBeTruthy();
  });

  it('navigue vers la duplication', async () => {
    const { getByText } = render(<HistoryDetailScreen workoutId={1} />);

    fireEvent.press(getByText('Dupliquer'));

    await waitFor(() => expect(mockDuplicateWorkout).toHaveBeenCalledWith(1));
    expect(mockPush).toHaveBeenCalledWith('/create?id=42');
  });

  it('redirige vers le suivi', () => {
    const { getByText } = render(<HistoryDetailScreen workoutId={1} />);

    fireEvent.press(getByText('Relancer'));

    expect(mockPush).toHaveBeenCalledWith('/track/1');
  });

  it("affiche un état vide quand la séance n'existe pas", () => {
    mockFindWorkout.mockReturnValueOnce(undefined);
    const { getByText } = render(<HistoryDetailScreen workoutId={999} />);

    expect(getByText('Séance introuvable')).toBeTruthy();
    expect(getByText("Revenir à l'historique")).toBeTruthy();
  });
});
