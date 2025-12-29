import { getApiBaseUrl, getAuthHeaders } from '@/utils/api';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  score: number;
  change: number;
}

export interface LeaderboardResponse {
  type: string;
  period: string;
  entries: LeaderboardEntry[];
  my_rank: number | null;
}

export type LeaderboardType = 'volume' | 'sessions' | 'likes' | 'followers';
export type LeaderboardPeriod = 'week' | 'month' | 'all';

/**
 * Récupérer le classement par volume
 */
export async function getVolumeLeaderboard(
  period: LeaderboardPeriod = 'week',
  currentUserId?: string
): Promise<LeaderboardResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  let url = `${baseUrl}/leaderboard/volume?period=${period}`;
  if (currentUserId) {
    url += `&current_user_id=${currentUserId}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new Error(`Failed to get volume leaderboard: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupérer le classement par séances
 */
export async function getSessionsLeaderboard(
  period: LeaderboardPeriod = 'week',
  currentUserId?: string
): Promise<LeaderboardResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  let url = `${baseUrl}/leaderboard/sessions?period=${period}`;
  if (currentUserId) {
    url += `&current_user_id=${currentUserId}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new Error(`Failed to get sessions leaderboard: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupérer le classement par likes
 */
export async function getLikesLeaderboard(
  currentUserId?: string
): Promise<LeaderboardResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  let url = `${baseUrl}/leaderboard/likes`;
  if (currentUserId) {
    url += `?current_user_id=${currentUserId}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new Error(`Failed to get likes leaderboard: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupérer le classement par followers
 */
export async function getFollowersLeaderboard(
  currentUserId?: string
): Promise<LeaderboardResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  let url = `${baseUrl}/leaderboard/followers`;
  if (currentUserId) {
    url += `?current_user_id=${currentUserId}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new Error(`Failed to get followers leaderboard: ${response.status}`);
  }

  return response.json();
}




