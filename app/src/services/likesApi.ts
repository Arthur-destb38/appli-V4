import { getApiBaseUrl, getAuthHeaders } from '@/utils/api';

export interface LikeResponse {
  liked: boolean;
  like_count: number;
}

export interface Comment {
  id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
}

/**
 * Toggle like sur un partage (like si pas liké, unlike si déjà liké)
 */
export async function toggleLike(shareId: string, userId: string): Promise<LikeResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/likes/${shareId}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to toggle like: ${response.status}`);
  }

  return response.json();
}

/**
 * Vérifie si un utilisateur a liké un partage
 */
export async function getLikeStatus(shareId: string, userId: string): Promise<LikeResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/likes/${shareId}/status?user_id=${userId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get like status: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupère le nombre de likes d'un partage
 */
export async function getLikeCount(shareId: string): Promise<number> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/likes/${shareId}/count`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get like count: ${response.status}`);
  }

  const data = await response.json();
  return data.like_count;
}

/**
 * Ajouter un commentaire
 */
export async function addComment(shareId: string, userId: string, content: string): Promise<Comment> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/likes/${shareId}/comments`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, content }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add comment: ${response.status}`);
  }

  return response.json();
}

/**
 * Récupérer les commentaires d'un partage
 */
export async function getComments(shareId: string, limit = 20): Promise<CommentsResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/likes/${shareId}/comments?limit=${limit}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get comments: ${response.status}`);
  }

  return response.json();
}

/**
 * Supprimer un commentaire
 */
export async function deleteComment(shareId: string, commentId: string, userId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/likes/${shareId}/comments/${commentId}?user_id=${userId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.status}`);
  }
}

/**
 * Toggle like sur un commentaire
 */
export async function toggleCommentLike(commentId: string, userId: string): Promise<LikeResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/likes/comment/${commentId}/like`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to toggle comment like: ${response.status}`);
  }

  return response.json();
}


