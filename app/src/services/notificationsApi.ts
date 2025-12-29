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

/**
 * Récupérer les notifications d'un utilisateur
 */
export async function getNotifications(userId: string, limit = 50): Promise<NotificationListResponse> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/notifications/${userId}?limit=${limit}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get notifications: ${response.status}`);
  }

  return response.json();
}

/**
 * Marquer toutes les notifications comme lues
 */
export async function markAllRead(userId: string): Promise<{ marked_read: number }> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/notifications/${userId}/read-all`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to mark all read: ${response.status}`);
  }

  return response.json();
}

/**
 * Marquer une notification comme lue
 */
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

/**
 * Supprimer une notification
 */
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




