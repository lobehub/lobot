import type { ContactItem, ContactRequestItem, ContactSearchResult } from '@lobot/types';

import { defineReplica } from '@/libs/replica';
import { contactService, type ContactUserProfileData } from '@/services/contact';

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
