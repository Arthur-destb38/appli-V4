import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { EXERCISE_CATALOG } from '@/data/exercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { CreateWorkoutScreen } from '@/screens/CreateWorkoutScreen';

jest.mock('@/hooks/useWorkouts');

const mockUseWorkouts = useWorkouts as jest.MockedFunction<typeof useWorkouts>;

const baseWorkout = {
  workout: {
    id: 1,
    title: 'Séance test',
    status: 'draft' as const,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  exercises: [],
  sets: [],
};

describe('CreateWorkoutScreen', () => {
  beforeEach(() => {
    mockUseWorkouts.mockReturnValue({
      workouts: [baseWorkout],
      isLoading: false,
      refresh: jest.fn(),
      createDraft: jest.fn(),
      updateTitle: jest.fn(),
      addExercise: jest.fn(),
      removeExercise: jest.fn(),
      deleteWorkout: jest.fn(),
      completeWorkout: jest.fn(),
      findWorkout: () => baseWorkout,
      pullFromServer: jest.fn(),
      pendingMutations: [],
      updateExercisePlan: jest.fn(),
      addSet: jest.fn(),
      updateSet: jest.fn(),
      removeSet: jest.fn(),
      reorderExercises: jest.fn(),
      removeWorkoutExercise: jest.fn(),
    } as any);
  });

  it('affiche les informations de la seance', () => {
    const { getByDisplayValue } = render(<CreateWorkoutScreen workoutId={1} />);
    expect(getByDisplayValue('Séance test')).toBeTruthy();
  });

  it("permet d'ajouter un exercice depuis le catalogue", () => {
    const addExerciseSpy = jest.fn();
    mockUseWorkouts.mockReturnValue({
      workouts: [baseWorkout],
      isLoading: false,
      refresh: jest.fn(),
      createDraft: jest.fn(),
      updateTitle: jest.fn(),
      addExercise: addExerciseSpy,
      removeExercise: jest.fn(),
      deleteWorkout: jest.fn(),
      completeWorkout: jest.fn(),
      findWorkout: () => baseWorkout,
      pullFromServer: jest.fn(),
      pendingMutations: [],
      updateExercisePlan: jest.fn(),
      addSet: jest.fn(),
      updateSet: jest.fn(),
      removeSet: jest.fn(),
      reorderExercises: jest.fn(),
      removeWorkoutExercise: jest.fn(),
    } as any);

    const { getByText } = render(<CreateWorkoutScreen workoutId={1} />);
    fireEvent.press(getByText(EXERCISE_CATALOG[0].name));
    expect(addExerciseSpy).toHaveBeenCalledWith(1, EXERCISE_CATALOG[0].id);
  });
});
