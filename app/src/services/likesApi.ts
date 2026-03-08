import { apiCall } from '@/utils/api';

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

export async function toggleLike(shareId: string, userId: string): Promise<LikeResponse> {
  const response = await apiCall(`/likes/${shareId}`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to toggle like: ${response.status}`);
  }
  return response.json();
}

export async function getLikeStatus(shareId: string, userId: string): Promise<LikeResponse> {
  const response = await apiCall(`/likes/${shareId}/status?user_id=${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to get like status: ${response.status}`);
  }
  return response.json();
}

export async function getLikeCount(shareId: string): Promise<number> {
  const response = await apiCall(`/likes/${shareId}/count`);
  if (!response.ok) {
    throw new Error(`Failed to get like count: ${response.status}`);
  }
  const data = await response.json();
  return data.like_count;
}

export async function addComment(shareId: string, userId: string, content: string): Promise<Comment> {
  const response = await apiCall(`/likes/${shareId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, content }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add comment: ${response.status}`);
  }
  return response.json();
}

export async function getComments(shareId: string, limit = 20): Promise<CommentsResponse> {
  const response = await apiCall(`/likes/${shareId}/comments?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to get comments: ${response.status}`);
  }
  return response.json();
}

export async function deleteComment(shareId: string, commentId: string, userId: string): Promise<void> {
  const response = await apiCall(`/likes/${shareId}/comments/${commentId}?user_id=${userId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.status}`);
  }
}

export async function toggleCommentLike(commentId: string, userId: string): Promise<LikeResponse> {
  const response = await apiCall(`/likes/comment/${commentId}/like`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to toggle comment like: ${response.status}`);
  }
  return response.json();
}
