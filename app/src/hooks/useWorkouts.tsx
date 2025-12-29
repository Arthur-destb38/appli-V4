import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  WorkoutWithRelations,
  addWorkoutExercise,
  addWorkoutSet,
  createWorkout,
  deleteWorkout,
  fetchWorkouts,
  removeWorkoutExercise,
  removeWorkoutSet,
  updateWorkoutStatus,
  updateWorkoutSet,
  updateWorkoutTitle,
  updateWorkoutExercisePlan,
  setWorkoutServerId,
  setWorkoutExerciseServerId,
  setWorkoutSetServerId,
} from '@/db/workouts-repository';
import {
  countPendingMutations,
  enqueueMutation,
  getPendingMutations,
  markMutationCompleted,
  markMutationFailed,
  removeMutation,
} from '@/db/mutation-queue';
import { getLastPullTimestamp, setLastPullTimestamp } from '@/db/sync-state';
import { pullChanges, pushMutations, SyncEvent } from '@/services/syncClient';
import { shareWorkoutRemote } from '@/services/shareWorkoutApi';
import { useUserProfile } from '@/hooks/useUserProfile';

interface WorkoutsContextValue {
  workouts: WorkoutWithRelations[];
  isLoading: boolean;
  refresh: () => Promise<WorkoutWithRelations[]>;
  createDraft: (title?: string) => Promise<WorkoutWithRelations | undefined>;
  pullFromServer: (since?: number) => Promise<void>;
  pendingMutations: number;
  updateTitle: (id: number, title: string) => Promise<void>;
  addExercise: (workoutId: number, exerciseId: string, plannedSets?: number | null) => Promise<number | undefined>;
  updateExercisePlan: (workoutExerciseId: number, plannedSets: number | null) => Promise<void>;
  removeExercise: (workoutExerciseId: number) => Promise<void>;
  deleteWorkout: (id: number) => Promise<void>;
  findWorkout: (id: number) => WorkoutWithRelations | undefined;
  completeWorkout: (id: number) => Promise<void>;
  addSet: (
    workoutExerciseId: number,
    payload: { reps: number; weight?: number | null; rpe?: number | null }
  ) => Promise<void>;
  updateSet: (
    setId: number,
    updates: Partial<{ reps: number; weight: number | null; rpe: number | null; done_at: number | null }>
  ) => Promise<void>;
  removeSet: (setId: number) => Promise<void>;
  duplicateWorkout: (id: number) => Promise<WorkoutWithRelations | undefined>;
  shareWorkout: (id: number) => Promise<{ queued: boolean; shareId?: string }>;
}

const WorkoutsContext = createContext<WorkoutsContextValue | undefined>(undefined);

const isNavigatorOnline = () => {
  if (typeof navigator === 'undefined' || typeof navigator.onLine === 'undefined') {
    return true;
  }
  return navigator.onLine;
};

export const WorkoutsProvider = ({ children }: PropsWithChildren) => {
  const { profile } = useUserProfile();
  const [workouts, setWorkouts] = useState<WorkoutWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchWorkouts();
      setWorkouts(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshPendingCount = useCallback(async () => {
    const count = await countPendingMutations();
    setPendingCount(count);
    return count;
  }, []);

  const applyRemoteEvent = useCallback(async (event: SyncEvent) => {
    try {
      switch (event.action) {
        case 'update-title': {
          const { workoutId, title } = event.payload as { workoutId: number; title: string };
          if (typeof workoutId === 'number' && typeof title === 'string') {
            await updateWorkoutTitle(workoutId, title);
          }
          break;
        }
        case 'complete-workout': {
          const { workoutId } = event.payload as { workoutId: number };
          if (typeof workoutId === 'number') {
            await updateWorkoutStatus(workoutId, 'completed');
          }
          break;
        }
        case 'delete-workout': {
          const { workoutId } = event.payload as { workoutId: number };
          if (typeof workoutId === 'number') {
            await deleteWorkout(workoutId);
          }
          break;
        }
        case 'add-exercise': {
          const { workoutId, exerciseId, orderIndex, plannedSets } = event.payload as {
            workoutId: number;
            exerciseId: string;
            orderIndex?: number;
            plannedSets?: number | null;
          };
          if (typeof workoutId === 'number' && typeof exerciseId === 'string') {
            await addWorkoutExercise(workoutId, exerciseId, orderIndex ?? 0, plannedSets ?? null);
          }
          break;
        }
        case 'update-exercise-plan': {
          const { workoutExerciseId, plannedSets } = event.payload as {
            workoutExerciseId: number;
            plannedSets?: number | null;
          };
          if (typeof workoutExerciseId === 'number') {
            await updateWorkoutExercisePlan(
              workoutExerciseId,
              typeof plannedSets === 'number' ? plannedSets : null
            );
          }
          break;
        }
        case 'remove-exercise': {
          const { workoutExerciseId } = event.payload as { workoutExerciseId: number };
          if (typeof workoutExerciseId === 'number') {
            await removeWorkoutExercise(workoutExerciseId);
          }
          break;
        }
        case 'add-set': {
          const { workoutExerciseId, payload } = event.payload as {
            workoutExerciseId: number;
            payload: { reps: number; weight?: number | null; rpe?: number | null };
          };
          if (typeof workoutExerciseId === 'number' && payload) {
            await addWorkoutSet(workoutExerciseId, payload.reps, payload.weight, payload.rpe);
          }
          break;
        }
        case 'update-set': {
          const { setId, updates } = event.payload as {
            setId: number;
            updates: Partial<{
              reps: number;
              weight: number | null;
              rpe: number | null;
              done_at: number | null;
            }>;
          };
          if (typeof setId === 'number' && updates) {
            await updateWorkoutSet(setId, updates);
          }
          break;
        }
        case 'remove-set': {
          const { setId } = event.payload as { setId: number };
          if (typeof setId === 'number') {
            await removeWorkoutSet(setId);
          }
          break;
        }
        case 'workout-upsert': {
          const payload = event.payload as {
            server_id: number;
            client_id: string | null;
            title: string;
            status: 'draft' | 'completed';
            created_at: string;
            updated_at: string;
            deleted_at: string | null;
          };
          if (payload.server_id && payload.client_id) {
            try {
              // Mettre à jour le server_id si nécessaire
              await setWorkoutServerId(payload.client_id, payload.server_id);
              // Trouver le workout local par server_id ou client_id
              const localWorkouts = await fetchWorkouts();
              const workout = localWorkouts.find(
                (w) => w.workout.server_id === payload.server_id || w.workout.client_id === payload.client_id
              );
              if (workout) {
                // Mettre à jour le titre et le statut si nécessaire
                if (workout.workout.title !== payload.title) {
                  await updateWorkoutTitle(workout.workout.id, payload.title);
                }
                if (workout.workout.status !== payload.status) {
                  await updateWorkoutStatus(workout.workout.id, payload.status);
                }
              } else {
                // Créer le workout s'il n'existe pas localement
                await createWorkout(payload.title);
                // Mettre à jour le server_id après création
                const newWorkouts = await fetchWorkouts();
                const newWorkout = newWorkouts.find((w) => w.workout.client_id === payload.client_id);
                if (newWorkout) {
                  await setWorkoutServerId(payload.client_id, payload.server_id);
                  if (newWorkout.workout.status !== payload.status) {
                    await updateWorkoutStatus(newWorkout.workout.id, payload.status);
                  }
                }
              }
            } catch (error) {
              console.warn('Failed to apply workout-upsert', error);
            }
          }
          break;
        }
        default:
          console.warn('Unhandled sync event action', event.action);
      }
    } catch (error) {
      console.warn(`Failed to apply remote event ${event.action}`, error);
    }
  }, []);

  const pullFromServer = useCallback(
    async (since?: number) => {
      try {
        const sinceTimestamp = since ?? (await getLastPullTimestamp());
        const response = await pullChanges(sinceTimestamp);
        let mutated = false;
        for (const event of response.events) {
          await applyRemoteEvent(event);
          mutated = true;
        }
        const serverTimestamp = Date.parse(response.server_time);
        if (!Number.isNaN(serverTimestamp)) {
          await setLastPullTimestamp(serverTimestamp);
        }
        if (mutated) {
          await load();
        }
      } catch (error) {
        console.warn('Failed to pull remote changes', error);
      }
    },
    [applyRemoteEvent, load]
  );

  const flushQueue = useCallback(async () => {
    if (!isNavigatorOnline()) {
      return;
    }

    let iterations = 0;
    while (iterations < 5) {
      const mutations = await getPendingMutations(20);
      if (!mutations.length) {
        break;
      }

      const shareMutations = mutations.filter((mutation) => mutation.action === 'share-workout');
      const otherMutations = mutations.filter((mutation) => mutation.action !== 'share-workout');

      if (shareMutations.length) {
        for (const shareMutation of shareMutations) {
          const payload = shareMutation.payload as {
            workoutId: string;
            userId: string;
          };
          try {
            if (payload?.workoutId && typeof payload?.userId === 'string') {
              await shareWorkoutRemote(String(payload.workoutId), { user_id: payload.userId });
            }
            await markMutationCompleted(shareMutation.id);
            await removeMutation(shareMutation.id);
          } catch (error) {
            await markMutationFailed(
              shareMutation.id,
              error instanceof Error ? error.message : String(error)
            );
            break;
          }
        }
      }

      if (!otherMutations.length) {
        iterations += 1;
        continue;
      }

      const mutationByQueueId = new Map<number, (typeof otherMutations)[number]>(
        otherMutations.map((mutation) => [mutation.id, mutation])
      );

      try {
        const pushResponse = await pushMutations(
          otherMutations.map((mutation) => ({
            queue_id: mutation.id,
            action: mutation.action,
            payload: mutation.payload,
            created_at: mutation.created_at,
          }))
        );

        if (pushResponse) {
          const serverTimestamp = Date.parse(pushResponse.server_time);
          if (!Number.isNaN(serverTimestamp)) {
            await setLastPullTimestamp(serverTimestamp);
          }
          for (const ack of pushResponse.results ?? []) {
            const original = mutationByQueueId.get(ack.queue_id);
            if (!original) {
              continue;
            }
            if (original.action === 'create-workout') {
              const clientId = (original.payload as any)?.client_id;
              if (typeof clientId === 'string') {
                await setWorkoutServerId(clientId, ack.server_id);
              }
            } else if (original.action === 'add-exercise') {
              const clientId = (original.payload as any)?.client_id;
              if (typeof clientId === 'string') {
                await setWorkoutExerciseServerId(clientId, ack.server_id);
              }
            } else if (original.action === 'add-set') {
              const clientId = (original.payload as any)?.client_id;
              if (typeof clientId === 'string') {
                await setWorkoutSetServerId(clientId, ack.server_id);
              }
            }
          }
        }

        await Promise.all(
          otherMutations.map(async (mutation) => {
            await markMutationCompleted(mutation.id);
            await removeMutation(mutation.id);
          })
        );
      } catch (error) {
        await Promise.all(
          otherMutations.map((mutation) =>
            markMutationFailed(
              mutation.id,
              error instanceof Error ? error.message : String(error)
            )
          )
        );
        break;
      }

    iterations += 1;
  }

    await refreshPendingCount();
    await pullFromServer();
  }, [pullFromServer, refreshPendingCount]);

  useEffect(() => {
    const bootstrap = async () => {
      await refreshPendingCount();
      await pullFromServer();
      await flushQueue();
    };
    bootstrap().catch((error) => console.warn('Failed to initialize sync', error));
  }, [flushQueue, pullFromServer, refreshPendingCount]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return;
    }
    const handleOnline = () => {
      flushQueue().catch((error) => console.warn('Failed to flush queue on online event', error));
      pullFromServer().catch((error) => console.warn('Failed to pull remote changes on reconnect', error));
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [flushQueue, pullFromServer]);

  const refresh = useCallback(async () => {
    const data = await fetchWorkouts();
    setWorkouts(data);
    return data;
  }, []);

  const runMutation = useCallback(
    async (action: string, payload: unknown, executor: () => Promise<void>) => {
      const mutationId = await enqueueMutation(action, payload);
      await refreshPendingCount();

      try {
        await executor();
        await refreshPendingCount();
        await flushQueue();
      } catch (error) {
        await removeMutation(mutationId);
        await refreshPendingCount();
        throw error;
      }
    },
    [flushQueue, refreshPendingCount]
  );

  const createDraft = useCallback(
    async (title = 'Nouvelle séance') => {
      const normalizedTitle = title.trim() || 'Nouvelle séance';
      const { id, client_id, created_at, updated_at } = await createWorkout(normalizedTitle);
      let refreshedData: WorkoutWithRelations[] | undefined;
      await runMutation(
        'create-workout',
        {
          workoutId: id,
          client_id,
          title: normalizedTitle,
          status: 'draft',
          created_at,
          updated_at,
        },
        async () => {
          refreshedData = await refresh();
        }
      );
      if (!refreshedData) {
        refreshedData = await refresh();
      }
      return refreshedData.find((item) => item.workout.id === id);
    },
    [refresh, runMutation]
  );

  const updateTitleAction = useCallback(
    async (id: number, title: string) => {
      await updateWorkoutTitle(id, title);
      await refresh();
    },
    [refresh]
  );

  const addExerciseAction = useCallback(
    async (workoutId: number, exerciseId: string, plannedSets: number | null = null) => {
      const target = workouts.find((item) => item.workout.id === workoutId);
      const minOrder =
        target && target.exercises.length
          ? Math.min(
              ...target.exercises.map((exercise) =>
                typeof (exercise as any).order_index === 'number'
                  ? (exercise as any).order_index
                  : 0
              )
            )
          : 0;
      const orderIndex = target && target.exercises.length ? minOrder - 1 : 0;
      const { id: insertedId, client_id } = await addWorkoutExercise(
        workoutId,
        exerciseId,
        orderIndex,
        plannedSets
      );
      await runMutation(
        'add-exercise',
        { workoutId, exerciseId, orderIndex, client_id, plannedSets },
        async () => {
          await refresh();
        }
      );
      return insertedId || undefined;
    },
    [refresh, runMutation, workouts]
  );

  const removeExerciseAction = useCallback(
    async (workoutExerciseId: number) => {
      await runMutation('remove-exercise', { workoutExerciseId }, async () => {
        await removeWorkoutExercise(workoutExerciseId);
        await refresh();
      });
    },
    [refresh, runMutation]
  );

  const updateExercisePlanAction = useCallback(
    async (workoutExerciseId: number, plannedSets: number | null) => {
      await runMutation(
        'update-exercise-plan',
        { workoutExerciseId, plannedSets },
        async () => {
          await updateWorkoutExercisePlan(workoutExerciseId, plannedSets);
          await refresh();
        }
      );
    },
    [refresh, runMutation]
  );

  const deleteWorkoutAction = useCallback(
    async (id: number) => {
      await runMutation('delete-workout', { workoutId: id }, async () => {
        await deleteWorkout(id);
        await refresh();
      });
    },
    [refresh, runMutation]
  );

  const completeWorkoutAction = useCallback(
    async (id: number) => {
      await runMutation('complete-workout', { workoutId: id }, async () => {
        await updateWorkoutStatus(id, 'completed');
        await refresh();
      });
    },
    [refresh, runMutation]
  );

  const addSetAction = useCallback(
    async (
      workoutExerciseId: number,
      payload: { reps: number; weight?: number | null; rpe?: number | null }
    ) => {
      const { client_id } = await addWorkoutSet(
        workoutExerciseId,
        payload.reps,
        payload.weight,
        payload.rpe
      );
      await runMutation(
        'add-set',
        { workoutExerciseId, client_id, payload },
        async () => {
          await refresh();
        }
      );
    },
    [refresh, runMutation]
  );

  const updateSetAction = useCallback(
    async (
      setId: number,
      updates: Partial<{ reps: number; weight: number | null; rpe: number | null; done_at: number | null }>
    ) => {
      await runMutation('update-set', { setId, updates }, async () => {
        await updateWorkoutSet(setId, updates);
        await refresh();
      });
    },
    [refresh, runMutation]
  );

  const removeSetAction = useCallback(
    async (setId: number) => {
      await runMutation('remove-set', { setId }, async () => {
        await removeWorkoutSet(setId);
        await refresh();
      });
    },
    [refresh, runMutation]
  );

  const duplicateWorkoutAction = useCallback(
    async (id: number) => {
      const source = workouts.find((item) => item.workout.id === id);
      if (!source) {
        return undefined;
      }

      const existingTitles = new Set(workouts.map((item) => item.workout.title));
      const baseTitle = source.workout.title.trim() || 'Séance';
      let candidate = `${baseTitle} (copie)`;
      let suffix = 2;
      while (existingTitles.has(candidate)) {
        candidate = `${baseTitle} (copie ${suffix})`;
        suffix += 1;
      }

      const duplicated = await createDraft(candidate);
      if (!duplicated) {
        return undefined;
      }

      const sortedExercises = [...source.exercises].sort(
        (a, b) => a.order_index - b.order_index
      );

      for (const exercise of sortedExercises) {
        const newExerciseId = await addExerciseAction(
          duplicated.workout.id,
          exercise.exercise_id,
          exercise.planned_sets ?? null
        );
        if (!newExerciseId) {
          continue;
        }
        const relatedSets = source.sets
          .filter((set) => set.workout_exercise_id === exercise.id)
          .sort((a, b) => a.id - b.id);
        for (const set of relatedSets) {
          await addSetAction(newExerciseId, {
            reps: set.reps,
            weight: set.weight ?? null,
            rpe: set.rpe ?? null,
          });
        }
      }

      const refreshedData = await refresh();
      return refreshedData.find((item) => item.workout.id === duplicated.workout.id);
    },
    [addExerciseAction, addSetAction, createDraft, refresh, workouts]
  );

  const shareWorkoutAction = useCallback(
    async (id: number) => {
      const target = workouts.find((item) => item.workout.id === id);
      if (!target) {
        throw new Error('Séance introuvable');
      }
      if (!profile) {
        throw new Error('Profil utilisateur indisponible');
      }
      // Mode démo : ne pas bloquer sur le consentement
      // if (!profile.consent_to_public_share) {
      //   throw new Error('consent_required');
      // }

      const profileId = profile.id;
      // Utiliser client_id (UUID) pour l'API au lieu de id (number local)
      const workoutIdForApi = target.workout.client_id || String(id);
      const payload = { workoutId: workoutIdForApi, userId: profileId };

      if (!isNavigatorOnline()) {
        await enqueueMutation('share-workout', payload);
        await refreshPendingCount();
        return { queued: true } as const;
      }

      try {
        const response = await shareWorkoutRemote(workoutIdForApi, { user_id: profileId });
        return { queued: false, shareId: response.share_id } as const;
      } catch (error) {
        const code = (error as any)?.code;
        if (code === 'user_without_consent' || code === 'user_not_found') {
          throw error;
        }
        await enqueueMutation('share-workout', payload);
        await refreshPendingCount();
        return { queued: true } as const;
      }
    },
    [profile, refreshPendingCount, workouts]
  );

  const value = useMemo<WorkoutsContextValue>(
    () => ({
      workouts,
      isLoading,
      refresh,
      createDraft,
      pendingMutations: pendingCount,
      pullFromServer,
      updateTitle: updateTitleAction,
      addExercise: addExerciseAction,
      updateExercisePlan: updateExercisePlanAction,
      removeExercise: removeExerciseAction,
      deleteWorkout: deleteWorkoutAction,
      findWorkout: (id) => workouts.find((item) => item.workout.id === id),
      completeWorkout: completeWorkoutAction,
      addSet: addSetAction,
      updateSet: updateSetAction,
      removeSet: removeSetAction,
      duplicateWorkout: duplicateWorkoutAction,
      shareWorkout: shareWorkoutAction,
    }),
    [
      workouts,
      isLoading,
      refresh,
      createDraft,
      pullFromServer,
      pendingCount,
      updateTitleAction,
      addExerciseAction,
      updateExercisePlanAction,
      removeExerciseAction,
      deleteWorkoutAction,
      completeWorkoutAction,
      addSetAction,
      updateSetAction,
      removeSetAction,
      duplicateWorkoutAction,
      shareWorkoutAction,
    ]
  );

  return <WorkoutsContext.Provider value={value}>{children}</WorkoutsContext.Provider>;
};

export const useWorkouts = () => {
  const context = useContext(WorkoutsContext);
  if (!context) {
    throw new Error('useWorkouts must be used within WorkoutsProvider');
  }
  return context;
};
