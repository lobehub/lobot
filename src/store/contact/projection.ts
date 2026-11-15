import type { ContactItem, ContactRequestItem } from '@lobechat/types';

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

export const contactProfileResource = defineReplica<{ userId: string }, ContactUserProfileData>({
  fetcher: ({ userId }) => contactService.userProfile(userId),
  key: ({ userId }) => userId,
  name: 'contactProfile',
  storage: 'memory',
  version: 1,
});
