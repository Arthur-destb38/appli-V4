import { buildApiUrl, getAuthHeaders } from '@/utils/api';

export type MessageRead = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export type ConversationParticipant = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export type ConversationRead = {
  id: string;
  participant: ConversationParticipant;
  last_message: MessageRead | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
};

export type ConversationListResponse = {
  conversations: ConversationRead[];
  next_cursor: string | null;
};

export type MessageListResponse = {
  messages: MessageRead[];
  next_cursor: string | null;
};

export type SendMessageResponse = {
  message: MessageRead;
  conversation_id: string;
};

export type CreateConversationResponse = {
  conversation: ConversationRead;
  created: boolean;
};

const MESSAGING_BASE = buildApiUrl('/messaging');

export const listConversations = async (
  _userId: string,
  limit = 20,
  cursor?: string
): Promise<ConversationListResponse> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.append('cursor', cursor);
  }
  const headers = await getAuthHeaders();
  const response = await fetch(`${MESSAGING_BASE}/conversations?${params.toString()}`, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Impossible de charger les conversations');
  }
  return (await response.json()) as ConversationListResponse;
};

export const createOrGetConversation = async (
  _userId: string,
  participantId: string
): Promise<CreateConversationResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${MESSAGING_BASE}/conversations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ participant_id: participantId }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Impossible de créer la conversation');
  }
  return (await response.json()) as CreateConversationResponse;
};

export const listMessages = async (
  conversationId: string,
  _userId: string,
  limit = 50,
  cursor?: string
): Promise<MessageListResponse> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.append('cursor', cursor);
  }
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${MESSAGING_BASE}/conversations/${conversationId}/messages?${params.toString()}`,
    { headers }
  );
  if (!response.ok) {
    throw new Error('Impossible de charger les messages');
  }
  return (await response.json()) as MessageListResponse;
};

export const sendMessage = async (
  conversationId: string,
  _userId: string,
  content: string
): Promise<SendMessageResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${MESSAGING_BASE}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Impossible d'envoyer le message");
  }
  return (await response.json()) as SendMessageResponse;
};

export const markConversationAsRead = async (
  conversationId: string,
  _userId: string
): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${MESSAGING_BASE}/conversations/${conversationId}/read`,
    { method: 'POST', headers }
  );
  if (!response.ok) {
    throw new Error('Impossible de marquer comme lu');
  }
};

export const getUnreadCount = async (_userId: string): Promise<number> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${MESSAGING_BASE}/unread-count`, {
    headers,
  });
  if (!response.ok) {
    return 0;
  }
  const data = await response.json();
  return data.unread_count;
};

export const deleteConversation = async (
  conversationId: string,
  _userId: string
): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${MESSAGING_BASE}/conversations/${conversationId}`,
    { method: 'DELETE', headers }
  );
  if (!response.ok) {
    throw new Error('Impossible de supprimer la conversation');
  }
};
