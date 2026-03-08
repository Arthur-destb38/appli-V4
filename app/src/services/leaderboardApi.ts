import { apiCall } from '@/utils/api';

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

export async function getVolumeLeaderboard(
  period: LeaderboardPeriod = 'week',
  currentUserId?: string
): Promise<LeaderboardResponse> {
  let url = `/leaderboard/volume?period=${period}`;
  if (currentUserId) url += `&current_user_id=${currentUserId}`;
  const response = await apiCall(url);
  if (!response.ok) {
    throw new Error(`Failed to get volume leaderboard: ${response.status}`);
  }
  return response.json();
}

export async function getSessionsLeaderboard(
  period: LeaderboardPeriod = 'week',
  currentUserId?: string
): Promise<LeaderboardResponse> {
  let url = `/leaderboard/sessions?period=${period}`;
  if (currentUserId) url += `&current_user_id=${currentUserId}`;
  const response = await apiCall(url);
  if (!response.ok) {
    throw new Error(`Failed to get sessions leaderboard: ${response.status}`);
  }
  return response.json();
}

export async function getLikesLeaderboard(
  currentUserId?: string
): Promise<LeaderboardResponse> {
  let url = '/leaderboard/likes';
  if (currentUserId) url += `?current_user_id=${currentUserId}`;
  const response = await apiCall(url);
  if (!response.ok) {
    throw new Error(`Failed to get likes leaderboard: ${response.status}`);
  }
  return response.json();
}

export async function getFollowersLeaderboard(
  currentUserId?: string
): Promise<LeaderboardResponse> {
  let url = '/leaderboard/followers';
  if (currentUserId) url += `?current_user_id=${currentUserId}`;
  const response = await apiCall(url);
  if (!response.ok) {
    throw new Error(`Failed to get followers leaderboard: ${response.status}`);
  }
  return response.json();
}
