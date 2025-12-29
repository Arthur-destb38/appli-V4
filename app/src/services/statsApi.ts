import { getApiBaseUrl, getAuthHeaders } from '@/utils/api';

export interface UserStats {
  user_id: string;
  username: string;
  // Stats globales
  total_sessions: number;
  total_volume: number;
  best_lift: number;
  // Stats cette semaine
  sessions_this_week: number;
  volume_this_week: number;
  // Stats semaine dernière
  sessions_last_week: number;
  volume_last_week: number;
  // Progression
  volume_change_percent: number | null;
  sessions_change: number;
  // Streak
  current_streak: number;
  // Objectif
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

/**
 * Récupère les stats complètes d'un utilisateur
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/users/${userId}/stats`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user stats: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupère un résumé rapide des stats (plus léger)
 */
export async function getStatsSummary(userId: string): Promise<StatsSummary> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/users/${userId}/stats/summary`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats summary: ${response.status}`);
  }

  return response.json();
}




