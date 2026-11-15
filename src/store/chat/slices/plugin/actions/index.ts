import { type StateCreator } from 'zustand/vanilla';

import { type ChatStore } from '@/store/chat/store';
import { flattenActions } from '@/store/utils/flattenActions';

import { type PluginOptimisticUpdateAction } from './optimisticUpdate';
import { PluginOptimisticUpdateActionImpl } from './optimisticUpdate';

export type ChatPluginAction = PluginOptimisticUpdateAction;

/**
 * Plugin action creator: optimistic updates to the tool fields of persisted
 * messages. Tools themselves run on the server.
 */
export const chatPlugin: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  ChatPluginAction
> = (
  ...params: Parameters<
    StateCreator<ChatStore, [['zustand/devtools', never]], [], ChatPluginAction>
  >
) => flattenActions<ChatPluginAction>([new PluginOptimisticUpdateActionImpl(...params)]);
