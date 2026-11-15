import type { ContactItem, ContactRequestItem } from '@lobechat/types';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { createReplicaState, type ReplicaState } from '@/libs/replica';
import type { ContactUserProfileData } from '@/services/contact';
import { createDevtools } from '@/store/middleware/createDevtools';

export interface ContactState {
  listMap: Record<string, ContactItem[]>;
  listReplica: ReplicaState<ContactItem[]>;
  /** By user id: the relation to a person and the Agents they share. */
  profileMap: Record<string, ContactUserProfileData>;
  profileReplica: ReplicaState<ContactUserProfileData>;
  requestsMap: Record<string, ContactRequestItem[]>;
  requestsReplica: ReplicaState<ContactRequestItem[]>;
}

export const initialState: ContactState = {
  listMap: {},
  listReplica: createReplicaState(),
  profileMap: {},
  profileReplica: createReplicaState(),
  requestsMap: {},
  requestsReplica: createReplicaState(),
};

export const useContactStore = createWithEqualityFn<ContactState>()(
  createDevtools('contact')(() => initialState),
  shallow,
);
