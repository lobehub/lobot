import type { ContactAgentItem, ContactSearchResult, ContactUserItem } from '@lobot/types';

import type { ContactState } from './store';

export const contactSelectors = {
  agentById: (agentId: string) => (state: ContactState) =>
    state.listMap.all?.find(
      (item): item is ContactAgentItem => item.type === 'agent' && item.agent.agentId === agentId,
    ),
  /** Other people's Agents added through their share. */
  agents: (state: ContactState) =>
    state.listMap.all?.filter((item): item is ContactAgentItem => item.type === 'agent'),
  /** The mail addresses an Agent owns; `undefined` until loaded. */
  agentAccounts: (agentId: string) => (state: ContactState) => state.agentAccountsMap[agentId],
  /** My Agent's share entry; `undefined` until loaded, `share: null` before one exists. */
  agentShare: (agentId: string) => (state: ContactState) => state.agentShareMap[agentId],
  /** Incoming requests of the personal space read from inside a workspace; 0 until loaded. */
  personalIncomingCount: (state: ContactState) =>
    state.personalRequestsMap.personal?.filter((request) => request.direction === 'incoming')
      .length ?? 0,
  incomingRequests: (state: ContactState) =>
    state.requestsMap.all?.filter((request) => request.direction === 'incoming') ?? [],
  isListInit: (state: ContactState) => state.listMap.all !== undefined,
  /** In a workspace, as a member sees it: the people outside it who are its external contacts. */
  externals: (state: ContactState) =>
    state.listMap.all?.filter(
      (item): item is ContactUserItem => item.type === 'user' && !!item.external,
    ),
  /** The people I can talk to in this scope: contacts, never a workspace's external contacts. */
  people: (state: ContactState) =>
    state.listMap.all?.filter(
      (item): item is ContactUserItem => item.type === 'user' && !item.external,
    ),
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
