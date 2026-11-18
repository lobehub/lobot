import { type ChatMessagePluginError } from '@lobot/types';

import { type ChatStore } from '@/store/chat/store';
import { type StoreSetter } from '@/store/types';

/**
 * Params for batch updating tool message content, state, and error
 */
interface UpdateToolMessageParams {
  content?: string;
  /**
   * Metadata to attach to the tool message
   * Used to mark messages for special handling (e.g., agentCouncil for parallel display)
   */
  metadata?: Record<string, any>;
  pluginError?: ChatMessagePluginError | null;
  pluginState?: any;
}

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
