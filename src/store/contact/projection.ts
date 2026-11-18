import type { ContactItem, ContactRequestItem, ContactSearchResult } from '@lobot/types';

import { defineReplica } from '@/libs/replica';
import { agentAccountService } from '@/services/agentAccount';
import { type AgentShareLinkItem, agentShareService } from '@/services/agentShare';
import { contactService, type ContactUserProfileData } from '@/services/contact';
import type { AgentAccountView } from '@/types/serverData';

export const contactListResource = defineReplica<Record<string, never>, ContactItem[]>({
  fetcher: () => contactService.list(),
  key: () => 'all',
  name: 'contactList',
  storage: 'indexedDB',
  version: 1,
});

/** Pending requests only, so it stays small; answered ones leave it. */
export const contactRequestsResource = defineReplica<Record<string, never>, ContactRequestItem[]>({
  fetcher: () => contactService.listRequests(),
  key: () => 'all',
  name: 'contactRequests',
  storage: 'memory',
  version: 1,
});

/** Persisted so a person's card opens from the last copy after a restart, then revalidates. */
export const contactProfileResource = defineReplica<{ userId: string }, ContactUserProfileData>({
  fetcher: ({ userId }) => contactService.userProfile(userId),
  key: ({ userId }) => userId,
  name: 'contactProfile',
  storage: 'indexedDB',
  version: 1,
});

/** A shared Agent reached by its share id, handle or link, with my relation to it. */
export const contactShareResource = defineReplica<{ share: string }, ContactSearchResult[]>({
  fetcher: ({ share }) => contactService.search(share),
  key: ({ share }) => share,
  name: 'contactShare',
  storage: 'memory',
  version: 1,
});

/** Incoming and outgoing requests of the personal space, read from inside a workspace. */
export const contactPersonalRequestsResource = defineReplica<
  Record<string, never>,
  ContactRequestItem[]
>({
  fetcher: () => contactService.listRequestsInScope(null),
  key: () => 'personal',
  name: 'contactPersonalRequests',
  storage: 'indexedDB',
  version: 1,
});

/** One of my Agents' share, as its share dialog shows it; `share` is `null` before one exists. */
export const agentShareStatusResource = defineReplica<
  { agentId: string },
  { share: AgentShareLinkItem | null }
>({
  fetcher: async ({ agentId }) => ({ share: await agentShareService.getShareStatus(agentId) }),
  key: ({ agentId }) => agentId,
  name: 'contactAgentShareStatus',
  persist: { maxEntries: 50 },
  storage: 'indexedDB',
  version: 1,
});

/** The mail addresses an Agent owns, for its contact card. */
export const agentAccountsResource = defineReplica<{ agentId: string }, AgentAccountView[]>({
  fetcher: ({ agentId }) => agentAccountService.list({ agentId }),
  key: ({ agentId }) => agentId,
  name: 'contactAgentAccounts',
  persist: { maxEntries: 50 },
  storage: 'indexedDB',
  version: 1,
});
