import { apiCall } from '@/utils/api';

export type ShareWorkoutResponse = {
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

export type ShareWorkoutPayload = {
  user_id: string;
  caption?: string | null;
  color?: string | null;
  image_base64?: string | null;
};

export const shareWorkoutRemote = async (
  workoutId: string,
  payload: ShareWorkoutPayload
): Promise<ShareWorkoutResponse> => {
  const response = await apiCall(`/share/workouts/${workoutId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const error = new Error('Erreur lors du partage');
    (error as any).code = detail?.detail ?? response.status;
    throw error;
  }

  return (await response.json()) as ShareWorkoutResponse;
};
