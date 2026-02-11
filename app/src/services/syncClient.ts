import { buildApiUrl, getAuthHeaders, getApiBaseUrl } from '@/utils/api';

export type PushMutationPayload = {
  queue_id: number;
  action: string;
  payload: unknown;
  created_at: number;
};

export type PushMutationAck = {
  queue_id: number;
  server_id: number;
};

export type PushResponse = {
  processed: number;
  server_time: string;
  results: PushMutationAck[];
};

export const pushMutations = async (
  mutations: PushMutationPayload[]
): Promise<PushResponse | null> => {
  if (!mutations.length) {
    const now = new Date().toISOString();
    return { processed: 0, server_time: now, results: [] };
  }

  const headers = await getAuthHeaders();
  const url = buildApiUrl('/sync/push');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mutations }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to push mutations: ${response.status} ${text}`);
  }

  return (await response.json()) as PushResponse;
};

export type SyncEvent = {
  id: number;
  action: string;
  payload: unknown;
  created_at: number;
};

export type PullResponse = {
  server_time: string;
  events: SyncEvent[];
};

export const pullChanges = async (since: number): Promise<PullResponse> => {
  const headers = await getAuthHeaders();
  const url = buildApiUrl(`/sync/pull?since=${since}`);
  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to pull changes: ${response.status} ${text}`);
  }

  return (await response.json()) as PullResponse;
};
