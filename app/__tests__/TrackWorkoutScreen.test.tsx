import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { TrackWorkoutScreen } from '@/screens/TrackWorkoutScreen';
import { WorkoutWithRelations } from '@/db/workouts-repository';

const mockAddSet = jest.fn();
const mockUpdateSet = jest.fn();
const mockRemoveSet = jest.fn();
const mockCompleteWorkout = jest.fn();
const mockFindWorkout = jest.fn();
let mockWorkout: WorkoutWithRelations | undefined;
let mockPending = 0;

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/useWorkouts', () => ({
  useWorkouts: () => ({
    findWorkout: mockFindWorkout,
    addSet: mockAddSet,
    updateSet: mockUpdateSet,
    removeSet: mockRemoveSet,
    completeWorkout: mockCompleteWorkout,
    pendingMutations: mockPending,
  }),
}));

const baseWorkout: WorkoutWithRelations = {
  workout: {
    id: 1,
    title: 'Séance A',
    status: 'draft',
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  exercises: [{ id: 101, workout_id: 1, exercise_id: 'bench-press', order_index: 0 }],
  sets: [
    { id: 201, workout_exercise_id: 101, reps: 8, weight: 80, rpe: 8, done_at: null },
  ],
};

const renderScreen = () => render(<TrackWorkoutScreen workoutId={1} />);

describe('TrackWorkoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkout = {
      workout: { ...baseWorkout.workout },
      exercises: baseWorkout.exercises.map((exercise) => ({ ...exercise })),
      sets: baseWorkout.sets.map((set) => ({ ...set })),
    };
    mockPending = 0;
    mockFindWorkout.mockImplementation(() => mockWorkout);
  });

  it('affiche un badge quand des mutations sont en attente', () => {
    mockPending = 2;
    const { getByText } = renderScreen();

    expect(getByText('2 action(s) en attente de synchronisation')).toBeTruthy();
  });

  it('ajoute une nouvelle série avec les valeurs par défaut', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Nouvelle série'));

    expect(mockAddSet).toHaveBeenCalledWith(101, { reps: 10, weight: null, rpe: 6 });
  });

  it('répète la dernière série existante', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Répéter'));

    expect(mockAddSet).toHaveBeenCalledWith(101, { reps: 8, weight: 80, rpe: 8 });
  });

  it('incrémente les valeurs via les steppers', () => {
    const { getAllByText } = renderScreen();

    const incrementButtons = getAllByText('+');

    fireEvent.press(incrementButtons[0]);
    expect(mockUpdateSet).toHaveBeenCalledWith(201, { reps: 9 });

    mockUpdateSet.mockClear();
    fireEvent.press(incrementButtons[1]);
    expect(mockUpdateSet).toHaveBeenCalledWith(201, { weight: 82.5 });

    mockUpdateSet.mockClear();
    fireEvent.press(incrementButtons[2]);
    expect(mockUpdateSet).toHaveBeenCalledWith(201, { rpe: 8.5 });
  });

  it('valide une série via appui long', () => {
    const { getByText } = renderScreen();

    fireEvent(getByText('Appui long pour valider'), 'onLongPress');

    expect(mockUpdateSet).toHaveBeenCalledWith(201, { done_at: expect.any(Number) });
  });

  it('supprime une série', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Supprimer'));

    expect(mockRemoveSet).toHaveBeenCalledWith(201);
  });
});
