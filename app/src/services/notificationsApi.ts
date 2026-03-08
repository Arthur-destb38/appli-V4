import { apiCall } from '@/utils/api';

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
  const response = await apiCall(`/notifications?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to get notifications: ${response.status}`);
  }
  return response.json();
}

export async function markAllRead(_userId: string): Promise<{ marked_read: number }> {
  const response = await apiCall('/notifications/read-all', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to mark all read: ${response.status}`);
  }
  return response.json();
}

export async function markRead(notificationId: string): Promise<{ success: boolean }> {
  const response = await apiCall(`/notifications/${notificationId}/read`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to mark read: ${response.status}`);
  }
  return response.json();
}

export async function deleteNotification(notificationId: string): Promise<{ success: boolean }> {
  const response = await apiCall(`/notifications/${notificationId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Failed to delete notification: ${response.status}`);
  }
  return response.json();
}
