import type { ContactAgentItem, ContactSearchResult, ContactUserItem } from '@lobechat/types';

import type { ContactState } from './store';

export const contactSelectors = {
  agentById: (agentId: string) => (state: ContactState) =>
    state.listMap.all?.find(
      (item): item is ContactAgentItem => item.type === 'agent' && item.agent.agentId === agentId,
    ),
  /** Other people's Agents added through their share. */
  agents: (state: ContactState) =>
    state.listMap.all?.filter((item): item is ContactAgentItem => item.type === 'agent'),
  incomingRequests: (state: ContactState) =>
    state.requestsMap.all?.filter((request) => request.direction === 'incoming') ?? [],
  isListInit: (state: ContactState) => state.listMap.all !== undefined,
  people: (state: ContactState) =>
    state.listMap.all?.filter((item): item is ContactUserItem => item.type === 'user'),
  profile: (userId: string) => (state: ContactState) => state.profileMap[userId],
  requests: (state: ContactState) => state.requestsMap.all ?? [],
  /** The shared Agent a share id, handle or link resolved to; undefined until loaded. */
  sharedAgent:
    (share: string) =>
    (state: ContactState): Extract<ContactSearchResult, { type: 'agent' }> | null | undefined => {
      const results = state.shareMap[share];
      if (!results) return undefined;
      return (
        results.find(
          (result): result is Extract<ContactSearchResult, { type: 'agent' }> =>
            result.type === 'agent',
        ) ?? null
      );
    },
  userById: (userId: string) => (state: ContactState) =>
    state.listMap.all?.find(
      (item): item is ContactUserItem => item.type === 'user' && item.user.id === userId,
    ),
};
