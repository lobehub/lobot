import { type ChatStore } from '@/store/chat/store';
import { type StoreSetter } from '@/store/types';

/**
 * Optimistic update operations for plugin-related data
 * All methods follow the pattern: update frontend first, then persist to database
 */

type Setter = StoreSetter<ChatStore>;

export class PluginOptimisticUpdateActionImpl {
  constructor(set: Setter, get: () => ChatStore, _api?: unknown) {
    void _api;
    void set;
  }
}

export type PluginOptimisticUpdateAction = Pick<
  PluginOptimisticUpdateActionImpl,
  keyof PluginOptimisticUpdateActionImpl
>;
