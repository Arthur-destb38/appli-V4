import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import {
  addWorkoutExercise as addWorkoutExerciseRepo,
  addWorkoutSet as addWorkoutSetRepo,
  createWorkout as createWorkoutRepo,
  deleteWorkout as deleteWorkoutRepo,
  fetchWorkouts as fetchWorkoutsRepo,
  removeWorkoutExercise as removeWorkoutExerciseRepo,
  updateWorkoutExercisePlan as updateWorkoutExercisePlanRepo,
  updateWorkoutStatus as updateWorkoutStatusRepo,
  updateWorkoutTitle as updateWorkoutTitleRepo,
  setWorkoutServerId as setWorkoutServerIdRepo,
  setWorkoutExerciseServerId as setWorkoutExerciseServerIdRepo,
  setWorkoutSetServerId as setWorkoutSetServerIdRepo,
} from '@/db/workouts-repository';
import {
  countPendingMutations as countPendingMutationsMock,
  enqueueMutation as enqueueMutationMock,
  getPendingMutations as getPendingMutationsMock,
  markMutationCompleted as markMutationCompletedMock,
  markMutationFailed as markMutationFailedMock,
  removeMutation as removeMutationMock,
} from '@/db/mutation-queue';
import { getLastPullTimestamp as getLastPullTimestampMock, setLastPullTimestamp as setLastPullTimestampMock } from '@/db/sync-state';
import { WorkoutsProvider, useWorkouts } from '@/hooks/useWorkouts';
import { pullChanges as pullChangesMock, pushMutations as pushMutationsMock } from '@/services/syncClient';
import { shareWorkoutRemote as shareWorkoutRemoteMock } from '@/services/shareWorkoutApi';

const mockUseUserProfile = require('@/hooks/useUserProfile').useUserProfile as jest.Mock;

jest.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: jest.fn().mockReturnValue({
    profile: {
      id: 'user-999',
      username: 'athlete-test',
      consent_to_public_share: true,
      created_at: Date.now(),
    },
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    updateProfile: jest.fn(),
  }),
}));

jest.mock('@/services/shareWorkoutApi', () => ({
  shareWorkoutRemote: jest.fn(),
}));

jest.mock('@/db/workouts-repository', () => ({
  __esModule: true,
  fetchWorkouts: jest.fn(),
  createWorkout: jest.fn(),
  updateWorkoutTitle: jest.fn(),
  updateWorkoutStatus: jest.fn(),
  addWorkoutExercise: jest.fn(),
  updateWorkoutExercisePlan: jest.fn(),
  removeWorkoutExercise: jest.fn(),
  addWorkoutSet: jest.fn(),
  updateWorkoutSet: jest.fn(),
  removeWorkoutSet: jest.fn(),
  deleteWorkout: jest.fn(),
  setWorkoutServerId: jest.fn(),
  setWorkoutExerciseServerId: jest.fn(),
  setWorkoutSetServerId: jest.fn(),
}));

jest.mock('@/db/mutation-queue', () => ({
  enqueueMutation: jest.fn(),
  countPendingMutations: jest.fn(),
  getPendingMutations: jest.fn(),
  markMutationCompleted: jest.fn(),
  markMutationFailed: jest.fn(),
  removeMutation: jest.fn(),
}));

jest.mock('@/db/sync-state', () => ({
  getLastPullTimestamp: jest.fn(),
  setLastPullTimestamp: jest.fn(),
}));

jest.mock('@/services/syncClient', () => ({
  pushMutations: jest.fn(),
  pullChanges: jest.fn(),
}));

const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <WorkoutsProvider>{children}</WorkoutsProvider>
);

const mockWorkout = {
  workout: {
    id: 1,
    title: 'Séance A',
    status: 'draft' as const,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  exercises: [],
  sets: [],
};

describe('useWorkouts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseUserProfile.mockReturnValue({
      profile: {
        id: 'user-999',
        username: 'athlete-test',
        consent_to_public_share: true,
        created_at: Date.now(),
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      updateProfile: jest.fn(),
    });
    (shareWorkoutRemoteMock as jest.Mock).mockResolvedValue({
      share_id: 'sh_abc',
      owner_id: 'user-999',
      owner_username: 'athlete-test',
      workout_title: 'Séance A',
      exercise_count: 0,
      set_count: 0,
      created_at: new Date().toISOString(),
    });
    (fetchWorkoutsRepo as jest.Mock).mockResolvedValue([mockWorkout]);
    (createWorkoutRepo as jest.Mock).mockResolvedValue({
      id: 2,
      client_id: 'cid-workout',
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    (enqueueMutationMock as jest.Mock).mockResolvedValue(101);
    (countPendingMutationsMock as jest.Mock).mockResolvedValue(0);
    (getPendingMutationsMock as jest.Mock).mockResolvedValue([]);
    (markMutationCompletedMock as jest.Mock).mockResolvedValue(undefined);
    (markMutationFailedMock as jest.Mock).mockResolvedValue(undefined);
    (removeMutationMock as jest.Mock).mockResolvedValue(undefined);
    (setWorkoutServerIdRepo as jest.Mock).mockResolvedValue(undefined);
    (setWorkoutExerciseServerIdRepo as jest.Mock).mockResolvedValue(undefined);
    (setWorkoutSetServerIdRepo as jest.Mock).mockResolvedValue(undefined);
    (updateWorkoutExercisePlanRepo as jest.Mock).mockResolvedValue(undefined);
    (addWorkoutExerciseRepo as jest.Mock).mockResolvedValue({ id: 1011, client_id: 'cid-ex' });
    (addWorkoutSetRepo as jest.Mock).mockResolvedValue({ id: 2022, client_id: 'cid-set' });
    const isoNow = new Date().toISOString();
    (pushMutationsMock as jest.Mock).mockResolvedValue({ processed: 0, server_time: isoNow });
    (pullChangesMock as jest.Mock).mockResolvedValue({ server_time: isoNow, events: [] });
    (getLastPullTimestampMock as jest.Mock).mockResolvedValue(0);
    (setLastPullTimestampMock as jest.Mock).mockResolvedValue(undefined);
    const globalAny = global as any;
    Object.defineProperty(globalAny, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });
  });

  it('charges les séances au montage', async () => {
    const hook = renderHook(() => useWorkouts(), { wrapper });
    const { result } = hook;

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workouts).toHaveLength(1);
    expect(fetchWorkoutsRepo).toHaveBeenCalledTimes(1);
  });

  it('crée un brouillon', async () => {
    (createWorkoutRepo as jest.Mock).mockResolvedValue({
      id: 2,
      client_id: 'cid-workout',
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    (fetchWorkoutsRepo as jest.Mock).mockResolvedValueOnce([mockWorkout]);
    (fetchWorkoutsRepo as jest.Mock).mockResolvedValueOnce([
      mockWorkout,
      {
        workout: { ...mockWorkout.workout, id: 2, title: 'Nouvelle séance' },
        exercises: [],
        sets: [],
      },
    ]);

    const { result, unmount } = renderHook(() => useWorkouts(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const draft = await act(async () => result.current.createDraft());

    expect(createWorkoutRepo).toHaveBeenCalled();
    expect(draft?.workout.id).toBe(2);
  });

  it('met à jour le titre', async () => {
    const hook = renderHook(() => useWorkouts(), { wrapper });
    const { result } = hook;
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateTitle(1, 'Nouveau titre');
    });
    expect(updateWorkoutTitleRepo).toHaveBeenCalledWith(1, 'Nouveau titre');
  });

  it('ajoute et retire un exercice', async () => {
    const hook = renderHook(() => useWorkouts(), { wrapper });
    const { result } = hook;
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addExercise(1, 'hip-thrust');
    });
    expect(addWorkoutExerciseRepo).toHaveBeenCalledWith(1, 'hip-thrust', 0, null);

    await act(async () => {
      await result.current.removeExercise(2);
    });
    expect(removeWorkoutExerciseRepo).toHaveBeenCalledWith(2);
  });

  it('met à jour les séries planifiées', async () => {
    const hook = renderHook(() => useWorkouts(), { wrapper });
    const { result } = hook;
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateExercisePlan(3, 4);
    });
    expect(enqueueMutationMock).toHaveBeenCalledWith('update-exercise-plan', {
      workoutExerciseId: 3,
      plannedSets: 4,
    });
    expect(updateWorkoutExercisePlanRepo).toHaveBeenCalledWith(3, 4);
  });

  it('supprime une séance', async () => {
    const hook = renderHook(() => useWorkouts(), { wrapper });
    const { result } = hook;
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteWorkout(1);
    });
    expect(deleteWorkoutRepo).toHaveBeenCalledWith(1);
  });

  it('partage une séance via API', async () => {
    const { result } = renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const shareResult = await act(async () => result.current.shareWorkout(1));
    expect(shareWorkoutRemoteMock).toHaveBeenCalledWith(1, { user_id: 'user-999' });
    expect(shareResult).toEqual({ queued: false, shareId: 'sh_abc' });
  });

  it('met en file le partage hors ligne', async () => {
    const globalAny = global as any;
    globalAny.navigator.onLine = false;

    const { result } = renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const shareResult = await act(async () => result.current.shareWorkout(1));

    expect(enqueueMutationMock).toHaveBeenCalledWith('share-workout', {
      workoutId: 1,
      userId: 'user-999',
    });
    expect(shareResult).toEqual({ queued: true });

    globalAny.navigator.onLine = true;
  });

  it('empêche le partage sans consentement', async () => {
    mockUseUserProfile.mockReturnValue({
      profile: {
        id: 'user-888',
        username: 'athlete-test',
        consent_to_public_share: false,
        created_at: Date.now(),
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { result } = renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.shareWorkout(1)).rejects.toThrow('consent_required');
    expect(shareWorkoutRemoteMock).not.toHaveBeenCalled();
    mockUseUserProfile.mockReturnValue({
      profile: {
        id: 'user-999',
        username: 'athlete-test',
        consent_to_public_share: true,
        created_at: Date.now(),
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      updateProfile: jest.fn(),
    });
  });

  it('termine une séance', async () => {
    const hook = renderHook(() => useWorkouts(), { wrapper });
    const { result } = hook;
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.completeWorkout(1);
    });
    expect(updateWorkoutStatusRepo).toHaveBeenCalledWith(1, 'completed');
  });

  it('retire automatiquement une mutation quand le client est en ligne', async () => {
    (addWorkoutSetRepo as jest.Mock).mockResolvedValue({ id: 4040, client_id: 'cid-online' });
    const now = Date.now();
    (enqueueMutationMock as jest.Mock).mockResolvedValue(301);
    const countSequence = [0, 1, 0];
    (countPendingMutationsMock as jest.Mock).mockImplementation(() =>
      Promise.resolve(countSequence.shift() ?? 0)
    );
    (getPendingMutationsMock as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 301,
          action: 'add-set',
          payload: { workoutExerciseId: 1, client_id: 'cid-online', payload: { reps: 5 } },
          status: 'pending',
          attempts: 0,
          created_at: now,
          last_error: null,
        },
      ])
      .mockResolvedValue([]);
    const serverTime = new Date(now + 1000).toISOString();
    (pushMutationsMock as jest.Mock).mockResolvedValue({
      processed: 1,
      server_time: serverTime,
      results: [{ queue_id: 301, server_id: 7001 }],
    });
    (pullChangesMock as jest.Mock)
      .mockResolvedValueOnce({ server_time: serverTime, events: [] })
      .mockResolvedValueOnce({ server_time: serverTime, events: [] });

    const hookOnline = renderHook(() => useWorkouts(), { wrapper });
    const { result } = hookOnline;

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addSet(1, { reps: 5 });
    });

    await waitFor(() => expect(result.current.pendingMutations).toBe(0));
    expect(enqueueMutationMock).toHaveBeenCalledWith('add-set', {
      workoutExerciseId: 1,
      client_id: 'cid-online',
      payload: { reps: 5 },
    });
    expect(pushMutationsMock).toHaveBeenCalledWith([
      {
        queue_id: 301,
        action: 'add-set',
        payload: { workoutExerciseId: 1, client_id: 'cid-online', payload: { reps: 5 } },
        created_at: now,
      },
    ]);
    expect(markMutationCompletedMock).toHaveBeenCalledWith(301);
    expect(removeMutationMock).toHaveBeenCalledWith(301);
    expect(setLastPullTimestampMock).toHaveBeenCalled();
    expect(pullChangesMock).toHaveBeenCalled();
  });

  it('associe un server_id aux exercices créés', async () => {
    (addWorkoutExerciseRepo as jest.Mock).mockResolvedValue({ id: 3030, client_id: 'cid-ex-test' });
    const now = Date.now();
    (enqueueMutationMock as jest.Mock).mockResolvedValue(601);
    const counts = [0, 1, 0];
    (countPendingMutationsMock as jest.Mock).mockImplementation(() =>
      Promise.resolve(counts.shift() ?? 0)
    );
    (getPendingMutationsMock as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 601,
          action: 'add-exercise',
          payload: {
            workoutId: 1,
            exerciseId: 'squat',
            orderIndex: 0,
            client_id: 'cid-ex-test',
            plannedSets: null,
          },
          status: 'pending',
          attempts: 0,
          created_at: now,
          last_error: null,
        },
      ])
      .mockResolvedValue([]);
    const serverTime = new Date(now + 2000).toISOString();
    (pushMutationsMock as jest.Mock).mockResolvedValue({
      processed: 1,
      server_time: serverTime,
      results: [{ queue_id: 601, server_id: 9100 }],
    });

    const hook = renderHook(() => useWorkouts(), { wrapper });
    const { result } = hook;

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addExercise(1, 'squat');
    });

    await waitFor(() => expect(result.current.pendingMutations).toBe(0));
    expect(setWorkoutExerciseServerIdRepo).toHaveBeenCalledWith('cid-ex-test', 9100);
    hook.unmount();
  });

  it('conserve les mutations hors ligne puis les nettoie à la reconnexion', async () => {
    (addWorkoutSetRepo as jest.Mock).mockResolvedValue({ id: 5050, client_id: 'cid-offline' });
    const globalAny = global as any;
    Object.defineProperty(globalAny, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });

    const listeners: Record<string, Array<(event: { type: string }) => void>> = {};
    const hadWindow = 'window' in globalAny;
    const originalWindow = hadWindow ? globalAny.window : undefined;
    const windowStub = {
      ...(originalWindow ?? {}),
      addEventListener: (event: string, handler: EventListenerOrEventListenerObject) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event].push(handler as (event: { type: string }) => void);
      },
      removeEventListener: (event: string, handler: EventListenerOrEventListenerObject) => {
        listeners[event] = (listeners[event] ?? []).filter((fn) => fn !== handler);
      },
      dispatchEvent: (event: { type: string }) => {
        listeners[event.type]?.forEach((handler) => handler(event));
        return true;
      },
    } as any;
    globalAny.window = windowStub;

    const now = Date.now();
    (enqueueMutationMock as jest.Mock).mockResolvedValue(501);
    const countSequence = [0, 1, 0];
    (countPendingMutationsMock as jest.Mock).mockImplementation(() =>
      Promise.resolve(countSequence.shift() ?? 0)
    );
    (getPendingMutationsMock as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 501,
          action: 'add-set',
          payload: { workoutExerciseId: 1, client_id: 'cid-offline', payload: { reps: 5 } },
          status: 'pending',
          attempts: 0,
          created_at: now,
          last_error: null,
        },
      ])
      .mockResolvedValue([]);
    const serverTime = new Date(now + 1000).toISOString();
    (pushMutationsMock as jest.Mock).mockResolvedValue({
      processed: 1,
      server_time: serverTime,
      results: [{ queue_id: 501, server_id: 8002 }],
    });
    (pullChangesMock as jest.Mock)
      .mockResolvedValueOnce({ server_time: serverTime, events: [] })
      .mockResolvedValueOnce({ server_time: serverTime, events: [] });

    const hookOffline = renderHook(() => useWorkouts(), { wrapper });
    const { result } = hookOffline;

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addSet(1, { reps: 5 });
    });

    expect(pushMutationsMock).not.toHaveBeenCalled();

    Object.defineProperty(globalAny, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });

    act(() => {
      windowStub.dispatchEvent({ type: 'online' });
    });

    await waitFor(() => expect(result.current.pendingMutations).toBe(0));
    expect(pushMutationsMock).toHaveBeenCalledTimes(1);
    expect(removeMutationMock).toHaveBeenCalledWith(501);

    hookOffline.unmount();
    if (hadWindow) {
      globalAny.window = originalWindow;
    } else {
      delete globalAny.window;
    }
    expect(setLastPullTimestampMock).toHaveBeenCalled();
    expect(pullChangesMock).toHaveBeenCalled();
    expect(setWorkoutSetServerIdRepo).toHaveBeenCalledWith('cid-offline', 8002);
  });
});
