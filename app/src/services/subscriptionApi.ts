import { apiCall } from '../utils/api';

export interface SubscriptionStatus {
  tier: 'free' | 'premium';
  is_premium: boolean;
  expires_at: string | null;
  ai_programs_remaining: number; // -1 = illimité
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const res = await apiCall('/subscriptions/status');
  if (!res.ok) throw new Error('Failed to fetch subscription status');
  return res.json();
}

export async function restoreSubscription(): Promise<SubscriptionStatus> {
  const res = await apiCall('/subscriptions/restore', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restore subscription');
  return res.json();
}
