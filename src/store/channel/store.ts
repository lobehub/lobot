import type { ChannelDetail, ChannelListItem, ChannelSection } from '@lobot/types';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { createReplicaState, type ReplicaState } from '@/libs/replica';
import type { ChannelPersonOption } from '@/services/channel';
import { createDevtools } from '@/store/middleware/createDevtools';

import type { ChannelOutbox } from './outbox';
import type { ChannelAgentEnvironment, ChannelWakeConfigData } from './projection';

export interface ChannelState {
  agentEnvironmentMap: Record<string, ChannelAgentEnvironment>;
  agentEnvironmentReplica: ReplicaState<ChannelAgentEnvironment>;
  detailMap: Record<string, ChannelDetail>;
  detailReplica: ReplicaState<ChannelDetail>;
  listMap: Record<string, ChannelListItem[]>;
  listReplica: ReplicaState<ChannelListItem[]>;
  /** Messages sent from this tab, by conversation, until a loaded page holds them. */
  outbox: ChannelOutbox;
  /** Other scopes' Channel lists, by `scopeChannelListKey`. */
  scopeListMap: Record<string, ChannelListItem[]>;
  scopeListReplica: ReplicaState<ChannelListItem[]>;
  /** The caller's own list sections, under `all`. */
  sectionsMap: Record<string, ChannelSection[]>;
  sectionsReplica: ReplicaState<ChannelSection[]>;
  userCandidatesMap: Record<string, ChannelPersonOption[]>;
  userCandidatesReplica: ReplicaState<ChannelPersonOption[]>;
  wakeConfigMap: Record<string, ChannelWakeConfigData>;
  wakeConfigReplica: ReplicaState<ChannelWakeConfigData>;
}

export const initialState: ChannelState = {
  agentEnvironmentMap: {},
  agentEnvironmentReplica: createReplicaState(),
  detailMap: {},
  detailReplica: createReplicaState(),
  listMap: {},
  listReplica: createReplicaState(),
  outbox: {},
  scopeListMap: {},
  scopeListReplica: createReplicaState(),
  sectionsMap: {},
  sectionsReplica: createReplicaState(),
  userCandidatesMap: {},
  userCandidatesReplica: createReplicaState(),
  wakeConfigMap: {},
  wakeConfigReplica: createReplicaState(),
};

export const useChannelStore = createWithEqualityFn<ChannelState>()(
  createDevtools('channel')(() => initialState),
  shallow,
);
