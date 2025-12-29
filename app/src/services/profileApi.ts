import { getApiBaseUrl, getAuthHeaders } from '@/utils/api';

export interface AvatarUploadResponse {
  avatar_url: string;
  success: boolean;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  objective: string | null;
  posts_count: number;
  followers_count: number;
  following_count: number;
  total_likes: number;
  is_following: boolean;
  is_own_profile: boolean;
  created_at: string;
}

export interface UserPost {
  share_id: string;
  workout_title: string;
  exercise_count: number;
  set_count: number;
  like_count: number;
  created_at: string;
}

export interface UserPostsResponse {
  posts: UserPost[];
  total: number;
}

export interface FollowUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

/**
 * Récupérer le profil d'un utilisateur
 */
export async function getProfile(userId: string, currentUserId?: string): Promise<Profile> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();
  
  let url = `${baseUrl}/profile/${userId}`;
  if (currentUserId) {
    url += `?current_user_id=${currentUserId}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new Error(`Failed to get profile: ${response.status}`);
  }

  return response.json();
}

/**
 * Mettre à jour son profil
 */
export async function updateProfile(
  userId: string,
  data: { avatar_url?: string; bio?: string; objective?: string }
): Promise<Profile> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/profile/${userId}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update profile: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupérer les posts d'un utilisateur
 */
export async function getUserPosts(userId: string, limit = 20): Promise<UserPostsResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/profile/${userId}/posts?limit=${limit}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get user posts: ${response.status}`);
  }

  return response.json();
}

/**
 * Suivre un utilisateur
 */
export async function followUser(userId: string, followerId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/profile/${userId}/follow?follower_id=${followerId}`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to follow user: ${response.status}`);
  }
}

/**
 * Ne plus suivre un utilisateur
 */
export async function unfollowUser(userId: string, followerId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/profile/${userId}/follow?follower_id=${followerId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to unfollow user: ${response.status}`);
  }
}

/**
 * Récupérer les followers d'un utilisateur
 */
export async function getFollowers(userId: string): Promise<{ followers: FollowUser[]; total: number }> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/profile/${userId}/followers`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get followers: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupérer les utilisateurs suivis
 */
export async function getFollowing(userId: string): Promise<{ following: FollowUser[]; total: number }> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/profile/${userId}/following`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get following: ${response.status}`);
  }

  return response.json();
}

/**
 * Upload un avatar (image en base64)
 */
export async function uploadAvatar(userId: string, imageBase64: string): Promise<AvatarUploadResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/profile/${userId}/avatar`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64 }),
  });

  if (!response.ok) {
    throw new Error(`Failed to upload avatar: ${response.status}`);
  }

  return response.json();
}

/**
 * Supprimer son avatar
 */
export async function deleteAvatar(userId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/profile/${userId}/avatar`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete avatar: ${response.status}`);
  }
}

