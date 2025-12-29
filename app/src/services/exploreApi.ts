import { getApiBaseUrl, getAuthHeaders } from '@/utils/api';

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

/**
 * Récupérer la page Explore (trending + suggestions)
 */
export async function getExplore(currentUserId?: string): Promise<ExploreData> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();
  
  let url = `${baseUrl}/explore`;
  if (currentUserId) {
    url += `?current_user_id=${currentUserId}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new Error(`Failed to get explore: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupérer les posts trending
 */
export async function getTrendingPosts(limit = 20): Promise<TrendingPost[]> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/explore/trending?limit=${limit}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get trending posts: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupérer les suggestions d'utilisateurs
 */
export async function getSuggestedUsers(currentUserId?: string, limit = 10): Promise<SuggestedUser[]> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  let url = `${baseUrl}/explore/suggested-users?limit=${limit}`;
  if (currentUserId) {
    url += `&current_user_id=${currentUserId}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new Error(`Failed to get suggested users: ${response.status}`);
  }

  return response.json();
}

/**
 * Rechercher utilisateurs et posts
 */
export async function search(query: string, limit = 20): Promise<SearchResult> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${baseUrl}/explore/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    { method: 'GET', headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to search: ${response.status}`);
  }

  return response.json();
}




