import { apiCall } from '@/utils/api';

export interface TrendingPost {
  share_id: string;
  owner_id: string;
  owner_username: string;
  workout_title: string;
  exercise_count: number;
  set_count: number;
  like_count: number;
  created_at: string;
}

export interface SuggestedUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  objective: string | null;
  followers_count: number;
  posts_count: number;
}

export interface ExploreData {
  trending_posts: TrendingPost[];
  suggested_users: SuggestedUser[];
}

export interface SearchResult {
  users: SuggestedUser[];
  posts: TrendingPost[];
}

export async function getExplore(currentUserId?: string): Promise<ExploreData> {
  const params = currentUserId ? `?current_user_id=${currentUserId}` : '';
  const response = await apiCall(`/explore${params}`);
  if (!response.ok) {
    throw new Error(`Failed to get explore: ${response.status}`);
  }
  return response.json();
}

export async function getTrendingPosts(limit = 20): Promise<TrendingPost[]> {
  const response = await apiCall(`/explore/trending?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to get trending posts: ${response.status}`);
  }
  return response.json();
}

export async function getSuggestedUsers(currentUserId?: string, limit = 10): Promise<SuggestedUser[]> {
  let url = `/explore/suggested-users?limit=${limit}`;
  if (currentUserId) {
    url += `&current_user_id=${currentUserId}`;
  }
  const response = await apiCall(url);
  if (!response.ok) {
    throw new Error(`Failed to get suggested users: ${response.status}`);
  }
  return response.json();
}

export async function search(query: string, limit = 20): Promise<SearchResult> {
  const response = await apiCall(`/explore/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to search: ${response.status}`);
  }
  return response.json();
}

export async function searchUsers(query: string, limit = 20): Promise<SuggestedUser[]> {
  const result = await search(query, limit);
  return result.users;
}
