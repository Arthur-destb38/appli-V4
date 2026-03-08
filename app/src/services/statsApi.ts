import { apiCall } from '@/utils/api';

export interface UserStats {
  user_id: string;
  username: string;
  total_sessions: number;
  total_volume: number;
  best_lift: number;
  sessions_this_week: number;
  volume_this_week: number;
  sessions_last_week: number;
  volume_last_week: number;
  volume_change_percent: number | null;
  sessions_change: number;
  current_streak: number;
  weekly_goal: number;
  goal_progress_percent: number;
}

export interface StatsSummary {
  sessions_this_week: number;
  total_sessions: number;
  volume_this_week: number;
  weekly_goal: number;
  goal_progress_percent: number;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const response = await apiCall(`/users/${userId}/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user stats: ${response.status}`);
  }
  return response.json();
}

export async function getStatsSummary(userId: string): Promise<StatsSummary> {
  const response = await apiCall(`/users/${userId}/stats/summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats summary: ${response.status}`);
  }
  return response.json();
}
