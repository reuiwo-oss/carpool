import type { Conversation, Message } from '@carpool/shared';
import { api } from '../../api/client';

/** Wątek z pełną historią; `isDriver` decyduje o przyciskach decyzji. */
export interface ConversationDetail extends Omit<Conversation, 'lastMessage' | 'unreadCount'> {
  isDriver: boolean;
  messages: Message[];
}

export const listConversations = () => api<Conversation[]>('/conversations');

export const getConversation = (id: string) => api<ConversationDetail>(`/conversations/${id}`);

export const sendMessage = (id: string, body: string) =>
  api<Message>(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) });

export const getUnreadCount = () => api<{ count: number }>('/conversations/unread');
