import type { ContactSearchResult, ContactUserProfile } from '@lobechat/types';

/** How a person is named across the contact surfaces: full name, then handle. */
export const personName = (
  user: Pick<ContactUserProfile, 'fullName' | 'username'>,
  fallback = '',
) => user.fullName?.trim() || user.username || fallback;

export const searchResultName = (result: ContactSearchResult, untitledAgent: string) =>
  result.type === 'agent' ? result.agent.title || untitledAgent : personName(result.user);

export const searchResultKey = (result: ContactSearchResult) =>
  result.type === 'agent' ? `agent:${result.agent.agentId}` : `user:${result.user.id}`;
