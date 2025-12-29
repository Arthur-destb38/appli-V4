import { buildApiUrl, getAuthHeaders } from '@/utils/api';

const STORIES_BASE = buildApiUrl('/stories');

export type Story = {
  id: number;
  owner_id: string;
  owner_username: string;
  media_url: string;
  title: string;
  link?: string | null;
  created_at: string;
  expires_at?: string | null;
};

export const fetchStories = async (): Promise<Story[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(STORIES_BASE, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Impossible de charger les stories');
  }
  return (await response.json()) as Story[];
};
