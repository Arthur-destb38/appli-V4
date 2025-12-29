import { useCallback, useMemo, useState } from 'react';

import { useUserProfile } from '@/hooks/useUserProfile';
import { fetchFeed, followUser, unfollowUser, fetchSharedWorkout } from '@/services/feedApi';
import { useWorkouts } from '@/hooks/useWorkouts';

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'exercise';

// Utilisateur de démo pour le feed
const DEMO_USER_ID = 'guest-user';

export const useFeed = () => {
  const { profile } = useUserProfile();
  const { createDraft, addExercise, addSet } = useWorkouts();
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Utilise guest-user pour le mode démo
  const userId = profile?.id || DEMO_USER_ID;

  const load = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const cursor = reset ? undefined : nextCursor ?? undefined;
        const response = await fetchFeed(userId, 10, cursor);
        setItems((prev) => (reset ? response.items : [...prev, ...response.items]));
        setNextCursor(response.next_cursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le feed');
      } finally {
        setIsLoading(false);
      }
    },
    [userId, nextCursor]
  );

  const toggleFollow = useCallback(
    async (targetId: string, shouldFollow: boolean) => {
      if (shouldFollow) {
        await followUser(userId, targetId);
      } else {
        await unfollowUser(userId, targetId);
      }
      await load(true);
    },
    [userId, load]
  );

  const duplicate = useCallback(
    async (shareId: string) => {
      const snapshot = await fetchSharedWorkout(shareId);
      const created = await createDraft(snapshot.title ?? 'Séance du feed');
      if (!created) {
        return;
      }
      for (const exercise of snapshot.exercises ?? []) {
        const slug =
          exercise.slug ||
          slugify(`${exercise.name ?? 'exercice'}-${exercise.muscle_group ?? 'general'}`);
        const plannedSets =
          typeof exercise.planned_sets === 'number' ? Math.max(0, Math.floor(exercise.planned_sets)) : null;
        const workoutExerciseId = await addExercise(created.workout.id, slug, plannedSets);
        if (!workoutExerciseId) {
          continue;
        }
        for (const set of exercise.sets ?? []) {
          const reps = typeof set.reps === 'number' ? Math.max(0, Math.floor(set.reps)) : 0;
          const weight = typeof set.weight === 'number' ? set.weight : null;
          const rpe = typeof set.rpe === 'number' ? set.rpe : null;
          await addSet(workoutExerciseId, { reps, weight, rpe });
        }
      }
    },
    [addExercise, addSet, createDraft]
  );

  return {
    items,
    nextCursor,
    isLoading,
    error,
    load,
    toggleFollow,
    duplicate,
  };
};
