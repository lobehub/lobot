import type { ContactItem, ContactRequestItem, ContactSearchResult } from '@lobot/types';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { createReplicaState, type ReplicaState } from '@/libs/replica';
import type { AgentShareLinkItem } from '@/services/agentShare';
import type { ContactUserProfileData } from '@/services/contact';
import { createDevtools } from '@/store/middleware/createDevtools';
import type { AgentAccountView } from '@/types/serverData';

export interface ContactState {
  /** By Agent id: the mail addresses it owns. */
  agentAccountsMap: Record<string, AgentAccountView[]>;
  agentAccountsReplica: ReplicaState<AgentAccountView[]>;
  /** By Agent id: my Agent's share (`null` before one exists). */
  agentShareMap: Record<string, { share: AgentShareLinkItem | null }>;
  agentShareReplica: ReplicaState<{ share: AgentShareLinkItem | null }>;
  listMap: Record<string, ContactItem[]>;
  listReplica: ReplicaState<ContactItem[]>;
  /** The personal space's requests, read from inside a workspace (`personal`). */
  personalRequestsMap: Record<string, ContactRequestItem[]>;
  personalRequestsReplica: ReplicaState<ContactRequestItem[]>;
  /** By user id: the relation to a person and the Agents they share. */
  profileMap: Record<string, ContactUserProfileData>;
  profileReplica: ReplicaState<ContactUserProfileData>;
  requestsMap: Record<string, ContactRequestItem[]>;
  requestsReplica: ReplicaState<ContactRequestItem[]>;
  /** By share id, handle or link: what it resolves to, e.g. for a `lobot://` link. */
  shareMap: Record<string, ContactSearchResult[]>;
  shareReplica: ReplicaState<ContactSearchResult[]>;
}

const initialState: ContactState = {
  agentAccountsMap: {},
  agentAccountsReplica: createReplicaState(),
  agentShareMap: {},
  agentShareReplica: createReplicaState(),
  listMap: {},
  listReplica: createReplicaState(),
  personalRequestsMap: {},
  personalRequestsReplica: createReplicaState(),
  profileMap: {},
  profileReplica: createReplicaState(),
  requestsMap: {},
  requestsReplica: createReplicaState(),
  shareMap: {},
  shareReplica: createReplicaState(),
};

export const useContactStore = createWithEqualityFn<ContactState>()(
  createDevtools('contact')(() => initialState),
  shallow,
);
