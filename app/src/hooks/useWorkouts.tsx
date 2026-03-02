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
  createWorkoutWithServerId,
  createExerciseWithServerId,
  createSetWithServerId,
  deleteWorkout,
  deleteWorkoutExercisesAndSets,
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
import { useAuth } from '@/hooks/useAuth';
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
  shareWorkout: (id: number, opts?: { caption?: string; color?: string; image_base64?: string }) => Promise<{ queued: boolean; shareId?: string }>;
}

const WorkoutsContext = createContext<WorkoutsContextValue | undefined>(undefined);

const isNavigatorOnline = () => {
  if (typeof navigator === 'undefined' || typeof navigator.onLine === 'undefined') {
    return true;
  }
  return navigator.onLine;
};

type RemoteExercise = {
  server_id: string;
  client_id: string | null;
  exercise_id: string;
  order_index: number;
  planned_sets: number | null;
  sets: RemoteSet[];
};

type RemoteSet = {
  server_id: string;
  client_id: string | null;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  done_at: string | null;
};

export const WorkoutsProvider = ({ children }: PropsWithChildren) => {
  const { isAuthenticated } = useAuth();
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

  useEffect(() => {
    if (!isAuthenticated) {
      setWorkouts([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      load();
    }
  }, [isAuthenticated, load]);

  const refreshPendingCount = useCallback(async () => {
    const count = await countPendingMutations();
    setPendingCount(count);
    return count;
  }, []);

  const applyRemoteEvent = useCallback(async (event: SyncEvent) => {
    try {
      switch (event.action) {
        case 'workout-upsert': {
          const payload = event.payload as {
            server_id: string;
            client_id: string | null;
            user_id: string | null;
            title: string;
            status: 'draft' | 'completed';
            created_at: string;
            updated_at: string;
            deleted_at: string | null;
            exercises?: RemoteExercise[];
          };
          if (!payload.server_id) break;
          try {
            const localWorkouts = await fetchWorkouts();
            let existing = localWorkouts.find(
              (w) => w.workout.server_id === payload.server_id
            );
            if (!existing && payload.client_id) {
              existing = localWorkouts.find(
                (w) => w.workout.client_id === payload.client_id
              );
            }

            if (existing) {
              if (payload.client_id) {
                await setWorkoutServerId(payload.client_id, payload.server_id);
              }
              if (existing.workout.title !== payload.title) {
                await updateWorkoutTitle(existing.workout.id, payload.title);
              }
              if (existing.workout.status !== payload.status) {
                await updateWorkoutStatus(existing.workout.id, payload.status);
              }
              if (payload.exercises && payload.exercises.length > 0) {
                await deleteWorkoutExercisesAndSets(existing.workout.id);
                for (const ex of payload.exercises) {
                  const { id: exLocalId } = await createExerciseWithServerId(
                    existing.workout.id,
                    ex.exercise_id,
                    ex.order_index,
                    ex.planned_sets,
                    ex.server_id,
                    ex.client_id
                  );
                  for (const s of ex.sets || []) {
                    await createSetWithServerId(
                      exLocalId,
                      s.reps ?? 0,
                      s.weight,
                      s.rpe,
                      s.server_id,
                      s.client_id
                    );
                  }
                }
              }
            } else if (!payload.deleted_at) {
              const created = await createWorkoutWithServerId(
                payload.title,
                payload.server_id,
                payload.user_id,
                payload.client_id
              );
              if (payload.status !== 'draft') {
                await updateWorkoutStatus(created.id, payload.status);
              }
              if (payload.exercises) {
                for (const ex of payload.exercises) {
                  const { id: exLocalId } = await createExerciseWithServerId(
                    created.id,
                    ex.exercise_id,
                    ex.order_index,
                    ex.planned_sets,
                    ex.server_id,
                    ex.client_id
                  );
                  for (const s of ex.sets || []) {
                    await createSetWithServerId(
                      exLocalId,
                      s.reps ?? 0,
                      s.weight,
                      s.rpe,
                      s.server_id,
                      s.client_id
                    );
                  }
                }
              }
            }
          } catch (error) {
            console.warn('Failed to apply workout-upsert', error);
          }
          break;
        }
        case 'workout-delete': {
          const payload = event.payload as { server_id: string; client_id: string | null };
          if (!payload.server_id) break;
          try {
            const localWorkouts = await fetchWorkouts();
            const workout = localWorkouts.find(
              (w) => w.workout.server_id === payload.server_id
            ) || (payload.client_id ? localWorkouts.find(
              (w) => w.workout.client_id === payload.client_id
            ) : undefined);
            if (workout) {
              await deleteWorkout(workout.workout.id);
            }
          } catch (error) {
            console.warn('Failed to apply workout-delete from server', error);
          }
          break;
        }
        default:
          break;
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

      // Push exercises, sets, and other mutations FIRST so the server has all data
      if (otherMutations.length) {
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
      }

      // Process share mutations AFTER data mutations so exercises/sets exist on server
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

      if (!otherMutations.length && !shareMutations.length) {
        iterations += 1;
        continue;
      }

    iterations += 1;
  }

    await refreshPendingCount();
    await pullFromServer();
  }, [pullFromServer, refreshPendingCount]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const bootstrap = async () => {
      await pullFromServer(0);
      await refreshPendingCount();
      await flushQueue();
    };
    bootstrap().catch((error) => console.warn('Failed to initialize sync', error));
  }, [isAuthenticated, flushQueue, pullFromServer, refreshPendingCount]);

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
      const userId = profile?.id || null;
      const { id, client_id, created_at, updated_at } = await createWorkout(normalizedTitle, userId);
      let refreshedData: WorkoutWithRelations[] | undefined;
      await runMutation(
        'create-workout',
        {
          workoutId: id,
          client_id,
          user_id: userId,
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
    [profile, refresh, runMutation]
  );

  const updateTitleAction = useCallback(
    async (id: number, title: string) => {
      const target = workouts.find((item) => item.workout.id === id);
      await runMutation(
        'update-title',
        {
          workoutId: target?.workout.server_id ?? id,
          workoutClientId: target?.workout.client_id ?? null,
          client_id: target?.workout.client_id ?? null,
          title,
          updated_at: Date.now(),
        },
        async () => {
          await updateWorkoutTitle(id, title);
          await refresh();
        }
      );
    },
    [refresh, runMutation, workouts]
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
        {
          workoutId,
          workoutClientId: target?.workout.client_id ?? null,
          workoutServerId: target?.workout.server_id ?? null,
          exerciseId,
          orderIndex,
          client_id,
          plannedSets,
        },
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
      const exercise = workouts
        .flatMap((w) => w.exercises)
        .find((ex) => ex.id === workoutExerciseId);
      await runMutation(
        'remove-exercise',
        {
          workoutExerciseId,
          exerciseClientId: exercise?.client_id ?? null,
          client_id: exercise?.client_id ?? null,
        },
        async () => {
          await removeWorkoutExercise(workoutExerciseId);
          await refresh();
        }
      );
    },
    [refresh, runMutation, workouts]
  );

  const updateExercisePlanAction = useCallback(
    async (workoutExerciseId: number, plannedSets: number | null) => {
      const exercise = workouts
        .flatMap((w) => w.exercises)
        .find((ex) => ex.id === workoutExerciseId);
      await runMutation(
        'update-exercise-plan',
        {
          workoutExerciseId,
          exerciseClientId: exercise?.client_id ?? null,
          client_id: exercise?.client_id ?? null,
          plannedSets,
        },
        async () => {
          await updateWorkoutExercisePlan(workoutExerciseId, plannedSets);
          await refresh();
        }
      );
    },
    [refresh, runMutation, workouts]
  );

  const deleteWorkoutAction = useCallback(
    async (id: number) => {
      const target = workouts.find((item) => item.workout.id === id);
      await runMutation(
        'delete-workout',
        {
          workoutId: target?.workout.server_id ?? id,
          workoutClientId: target?.workout.client_id ?? null,
          client_id: target?.workout.client_id ?? null,
          deleted_at: Date.now(),
          updated_at: Date.now(),
        },
        async () => {
          await deleteWorkout(id);
          await refresh();
        }
      );
    },
    [refresh, runMutation, workouts]
  );

  const completeWorkoutAction = useCallback(
    async (id: number) => {
      const target = workouts.find((item) => item.workout.id === id);
      await runMutation(
        'complete-workout',
        {
          workoutId: target?.workout.server_id ?? id,
          workoutClientId: target?.workout.client_id ?? null,
          client_id: target?.workout.client_id ?? null,
          updated_at: Date.now(),
        },
        async () => {
          await updateWorkoutStatus(id, 'completed');
          await refresh();
        }
      );
    },
    [refresh, runMutation, workouts]
  );

  const addSetAction = useCallback(
    async (
      workoutExerciseId: number,
      payload: { reps: number; weight?: number | null; rpe?: number | null }
    ) => {
      const exercise = workouts
        .flatMap((w) => w.exercises)
        .find((ex) => ex.id === workoutExerciseId);
      const { client_id } = await addWorkoutSet(
        workoutExerciseId,
        payload.reps,
        payload.weight,
        payload.rpe
      );
      await runMutation(
        'add-set',
        {
          workoutExerciseId,
          exerciseClientId: exercise?.client_id ?? null,
          client_id,
          payload,
        },
        async () => {
          await refresh();
        }
      );
    },
    [refresh, runMutation, workouts]
  );

  const updateSetAction = useCallback(
    async (
      setId: number,
      updates: Partial<{ reps: number; weight: number | null; rpe: number | null; done_at: number | null }>
    ) => {
      const targetSet = workouts
        .flatMap((w) => w.sets)
        .find((s) => s.id === setId);
      await runMutation(
        'update-set',
        {
          setId,
          setClientId: targetSet?.client_id ?? null,
          client_id: targetSet?.client_id ?? null,
          updates,
        },
        async () => {
          await updateWorkoutSet(setId, updates);
          await refresh();
        }
      );
    },
    [refresh, runMutation, workouts]
  );

  const removeSetAction = useCallback(
    async (setId: number) => {
      const targetSet = workouts
        .flatMap((w) => w.sets)
        .find((s) => s.id === setId);
      await runMutation(
        'remove-set',
        {
          setId,
          setClientId: targetSet?.client_id ?? null,
          client_id: targetSet?.client_id ?? null,
        },
        async () => {
          await removeWorkoutSet(setId);
          await refresh();
        }
      );
    },
    [refresh, runMutation, workouts]
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
    async (id: number, opts?: { caption?: string; color?: string; image_base64?: string }) => {
      const target = workouts.find((item) => item.workout.id === id);
      if (!target) {
        throw new Error('Séance introuvable');
      }
      if (!profile) {
        throw new Error('Profil utilisateur indisponible');
      }
      if (!target.workout.server_id) {
        throw new Error('Séance pas encore synchronisée. Attends quelques secondes et réessaie.');
      }

      const workoutIdForApi = target.workout.server_id;
      const userId = profile?.id;
      if (!userId) {
        throw new Error('Profil utilisateur indisponible');
      }
      const mutationPayload = { workoutId: workoutIdForApi, userId };

      if (!isNavigatorOnline()) {
        await enqueueMutation('share-workout', mutationPayload);
        await refreshPendingCount();
        return { queued: true } as const;
      }

      // Flush pending mutations (exercises, sets) before sharing
      await flushQueue();

      try {
        const response = await shareWorkoutRemote(workoutIdForApi, {
          user_id: userId,
          caption: opts?.caption,
          color: opts?.color,
          image_base64: opts?.image_base64,
        });
        return { queued: false, shareId: response.share_id } as const;
      } catch (error) {
        const code = (error as any)?.code;
        if (code === 'user_without_consent' || code === 'user_not_found' || code === 'not_your_workout') {
          throw error;
        }
        await enqueueMutation('share-workout', mutationPayload);
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
