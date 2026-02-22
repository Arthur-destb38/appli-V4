import { getApiBaseUrl, getAuthHeaders } from '@/utils/api';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  actor_id: string;
  actor_username: string;
  reference_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
}

export async function getNotifications(_userId: string, limit = 50): Promise<NotificationListResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/notifications?limit=${limit}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get notifications: ${response.status}`);
  }

  return response.json();
}

export async function markAllRead(_userId: string): Promise<{ marked_read: number }> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/notifications/read-all`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to mark all read: ${response.status}`);
  }

  return response.json();
}

export async function markRead(notificationId: string): Promise<{ success: boolean }> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/notifications/${notificationId}/read`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to mark read: ${response.status}`);
  }

  return response.json();
}

export async function deleteNotification(notificationId: string): Promise<{ success: boolean }> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete notification: ${response.status}`);
  }

  return response.json();
}
