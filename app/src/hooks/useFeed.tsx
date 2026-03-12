import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { fetchFeed, fetchSharedWorkout } from '@/services/feedApi';
import { followUser, unfollowUser } from '@/services/profileApi';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useTranslations } from '@/hooks/usePreferences';

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'exercise';

export const useFeed = () => {
  const { user, isAuthenticated } = useAuth();
  const { profile } = useUserProfile();
  const { createDraft, addExercise, addSet } = useWorkouts();
  const { t } = useTranslations();
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use auth user ID first, then profile ID
  const userId = user?.id ?? profile?.id ?? '';

  const load = useCallback(
    async (reset = false) => {
      if (!userId) return; // Don't load until we have a user ID
      setIsLoading(true);
      setError(null);
      try {
        const cursor = reset ? undefined : nextCursor ?? undefined;
        const response = await fetchFeed(userId, 10, cursor);
        setItems((prev) => (reset ? response.items : [...prev, ...response.items]));
        setNextCursor(response.next_cursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorFeedLoad'));
      } finally {
        setIsLoading(false);
      }
    },
    [userId, nextCursor, t]
  );

  const toggleFollow = useCallback(
    async (targetId: string, shouldFollow: boolean) => {
      if (shouldFollow) {
        await followUser(targetId);
      } else {
        await unfollowUser(targetId);
      }
      await load(true);
    },
    [load]
  );

  const duplicate = useCallback(
    async (shareId: string) => {
      const snapshot = await fetchSharedWorkout(shareId);
      const created = await createDraft(snapshot.title ?? t('feedWorkoutTitle'));
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
    [addExercise, addSet, createDraft, t]
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
