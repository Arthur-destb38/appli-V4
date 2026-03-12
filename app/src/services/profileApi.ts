import { apiCall } from '@/utils/api';

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

export async function getProfile(userId: string): Promise<Profile> {
  const response = await apiCall(`/profile/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to get profile: ${response.status}`);
  }
  return response.json();
}

export async function updateProfile(
  userId: string,
  data: { avatar_url?: string; bio?: string; objective?: string }
): Promise<Profile> {
  const response = await apiCall(`/profile/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update profile: ${response.status}`);
  }
  return response.json();
}

export async function getUserPosts(userId: string, limit = 20): Promise<UserPostsResponse> {
  const response = await apiCall(`/profile/${userId}/posts?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to get user posts: ${response.status}`);
  }
  return response.json();
}

export async function followUser(userId: string): Promise<void> {
  const response = await apiCall(`/profile/${userId}/follow`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to follow user: ${response.status}`);
  }
}

export async function unfollowUser(userId: string): Promise<void> {
  const response = await apiCall(`/profile/${userId}/follow`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Failed to unfollow user: ${response.status}`);
  }
}

export async function getFollowers(userId: string): Promise<{ followers: FollowUser[]; total: number }> {
  const response = await apiCall(`/profile/${userId}/followers`);
  if (!response.ok) {
    throw new Error(`Failed to get followers: ${response.status}`);
  }
  return response.json();
}

export async function getFollowing(userId: string): Promise<{ following: FollowUser[]; total: number }> {
  const response = await apiCall(`/profile/${userId}/following`);
  if (!response.ok) {
    throw new Error(`Failed to get following: ${response.status}`);
  }
  return response.json();
}

export async function uploadAvatar(userId: string, imageBase64: string): Promise<AvatarUploadResponse> {
  const response = await apiCall(`/profile/${userId}/avatar`, {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
  if (!response.ok) {
    throw new Error(`Failed to upload avatar: ${response.status}`);
  }
  return response.json();
}

export async function deleteAvatar(userId: string): Promise<void> {
  const response = await apiCall(`/profile/${userId}/avatar`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete avatar: ${response.status}`);
  }
}
