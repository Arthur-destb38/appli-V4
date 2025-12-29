import { buildApiUrl, getAuthHeaders } from '@/utils/api';

export type UserProfilePayload = {
  id: string;
  username: string;
  consent_to_public_share: boolean;
};

export type UserProfileResponse = UserProfilePayload & {
  created_at: string;
};

const PROFILE_ENDPOINT = buildApiUrl('/users/profile');
const USERS_BASE = buildApiUrl('/users');

export type UserStatsResponse = {
  user_id: string;
  username: string;
  sessions: number;
  volume: number;
  best_lift: number;
};

export const upsertRemoteProfile = async (
  payload: UserProfilePayload
): Promise<UserProfileResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(PROFILE_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await safeReadJson(response);
    const reason = typeof detail?.detail === 'string' ? detail.detail : undefined;
    const error = new Error('Failed to save profile');
    (error as any).code = reason ?? response.status;
    throw error;
  }

  return (await response.json()) as UserProfileResponse;
};

export const fetchRemoteProfile = async (id: string): Promise<UserProfileResponse | null> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${PROFILE_ENDPOINT}/${id}`, {
    headers,
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const error = new Error('Failed to fetch profile');
    (error as any).code = response.status;
    throw error;
  }
  return (await response.json()) as UserProfileResponse;
};

export const fetchUserStats = async (userId: string): Promise<UserStatsResponse | null> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${USERS_BASE}/${userId}/stats`, {
    headers,
  });
  if (!response.ok) return null;
  return (await response.json()) as UserStatsResponse;
};

export type UpdateProfilePayload = {
  username?: string;
  bio?: string;
  avatar_url?: string;
  objective?: string;
};

export const updateRemoteProfile = async (
  userId: string,
  payload: UpdateProfilePayload
): Promise<UserProfileResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${PROFILE_ENDPOINT}/${userId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await safeReadJson(response);
    const reason = typeof detail?.detail === 'string' ? detail.detail : undefined;
    const error = new Error('Failed to update profile');
    (error as any).code = reason ?? response.status;
    throw error;
  }

  return (await response.json()) as UserProfileResponse;
};

const safeReadJson = async (response: Response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};
