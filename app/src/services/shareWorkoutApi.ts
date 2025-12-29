import { buildApiUrl, getAuthHeaders } from '@/utils/api';

export type ShareWorkoutResponse = {
  share_id: string;
  owner_id: string;
  owner_username: string;
  workout_title: string;
  exercise_count: number;
  set_count: number;
  created_at: string;
};

const shareWorkoutUrl = (workoutId: string) => buildApiUrl(`/share/workouts/${workoutId}`);

export const shareWorkoutRemote = async (
  workoutId: string,
  payload: { user_id: string }
): Promise<ShareWorkoutResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(shareWorkoutUrl(workoutId), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await safeReadJson(response);
    const error = new Error('Erreur lors du partage');
    (error as any).code = detail?.detail ?? response.status;
    throw error;
  }

  return (await response.json()) as ShareWorkoutResponse;
};

const safeReadJson = async (response: Response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};
