import { type ChatStore } from '@/store/chat/store';
import { type StoreSetter } from '@/store/types';

/**
 * Runtime state management for message-related states
 * Handles loading states, active session tracking, etc.
 */

type Setter = StoreSetter<ChatStore>;

export class MessageRuntimeStateActionImpl {
  constructor(set: Setter, get: () => ChatStore, _api?: unknown) {
    void _api;
  }
}

export type MessageRuntimeStateAction = Pick<
  MessageRuntimeStateActionImpl,
  keyof MessageRuntimeStateActionImpl
>;
