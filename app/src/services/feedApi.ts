import { apiCall } from '@/utils/api';

export type FeedItem = {
  share_id: string;
  owner_id: string;
  owner_username: string;
  workout_title: string;
  exercise_count: number;
  set_count: number;
  caption?: string | null;
  color?: string | null;
  image_url?: string | null;
  created_at: string;
};

export type FeedResponse = {
  items: FeedItem[];
  next_cursor: string | null;
};

export type SharedWorkoutSnapshot = {
  workout_id: number;
  title: string;
  status?: string;
  exercises: Array<{
    slug?: string | null;
    name?: string;
    muscle_group?: string | null;
    planned_sets?: number | null;
    sets?: Array<{ reps?: number | null; weight?: number | null; rpe?: number | null }>;
  }>;
};

export const fetchFeed = async (userId: string, limit = 10, cursor?: string) => {
  const params = new URLSearchParams({ user_id: userId, limit: String(limit) });
  if (cursor) {
    params.append('cursor', cursor);
  }
  const response = await apiCall(`/feed?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Impossible de charger le feed');
  }
  return (await response.json()) as FeedResponse;
};

export const followUser = async (followerId: string, targetId: string) => {
  const response = await apiCall(`/feed/follow/${targetId}`, {
    method: 'POST',
    body: JSON.stringify({ follower_id: followerId }),
  });
  if (!response.ok) {
    throw new Error('Impossible de suivre cet utilisateur');
  }
};

export const unfollowUser = async (followerId: string, targetId: string) => {
  const response = await apiCall(`/feed/follow/${targetId}`, {
    method: 'DELETE',
    body: JSON.stringify({ follower_id: followerId }),
  });
  if (!response.ok) {
    throw new Error('Impossible de se désabonner');
  }
};

export const fetchSharedWorkout = async (shareId: string): Promise<SharedWorkoutSnapshot> => {
  const response = await apiCall(`/workouts/shared/${shareId}`);
  if (!response.ok) {
    throw new Error('Séance partagée introuvable');
  }
  return (await response.json()) as SharedWorkoutSnapshot;
};
