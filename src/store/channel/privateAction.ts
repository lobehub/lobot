import type { ChannelDetail, ChannelListItem, ChannelSection } from '@lobot/types';

import {
  arrayEntity,
  cacheScope,
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
} from '@/libs/replica';
import type { ChannelPersonOption } from '@/services/channel';
import type { StoreSetter } from '@/store/types';
import { isTrpcErrorCode } from '@/utils/trpcError';

import { settleOutbox } from './outbox';
import {
  type ChannelAgentEnvironment,
  channelAgentEnvironmentResource,
  channelDetailEntity,
  channelDetailResource,
  channelListResource,
  channelScopeListResource,
  channelSectionsResource,
  channelThreadEntityId,
  channelUserCandidatesResource,
  channelViewKey,
  type ChannelWakeConfigData,
  channelWakeConfigResource,
} from './projection';
import type { ChannelState } from './store';

export class ChannelPrivateAction {
  // Scope → thread ID → entity ID. A pre-delete head response may arrive after
  // persistence has settled; unlike hydration, it would lift replica entity guards.
  // Only a recycle-bin restore, which keeps the thread ID, lifts the marker.
  private readonly deletedThreads = new Map<string, Map<string, string>>();
  resetThreadRemovals = () => this.deletedThreads.clear();
  removeThread = (channelId: string, threadId: string, scope: string) => {
    const id = channelThreadEntityId(channelId, threadId);
    const ids = this.deletedThreads.get(scope) ?? new Map<string, string>();
    ids.set(threadId, id);
    this.deletedThreads.set(scope, ids);
    this.detail.removeEntity(id, { scope });
  };
  readonly agentEnvironment;
  readonly detail;
  readonly entity;
  readonly list;
  readonly scopeList;
  readonly sections;
  readonly userCandidates;
  readonly wakeConfig;
  constructor(set: StoreSetter<ChannelState>, get: () => ChannelState) {
    this.list = createReplicaSlice(channelListResource, {
      actionPrefix: 'channel/list',
      effects: {
        // A push, reconnect or poll that lists a newer sequence refreshes the loaded main view in
        // the background, so opening that conversation shows its latest messages at once instead
        // of the cached ones until its own read returns. The sequence counts thread messages too;
        // the main view's `channel` carries the same counter, so threads do not read as stale.
        onApplied: (items) => {
          const { detailMap } = get();
          for (const channel of items) {
            const params = { channelId: channel.id };
            const loaded = detailMap[channelViewKey(params)];
            if (!loaded || loaded.channel.sequence >= channel.sequence) continue;
            // A failed read keeps the cached view; opening it syncs again.
            this.detail.fetch(params).catch(() => {});
          }
        },
      },
      entity: arrayEntity<ChannelListItem>((channel) => channel.id),
      get,
      set,
      stateKey: 'listReplica',
      view: recordLens<ChannelState, ChannelListItem[]>('listMap'),
    });
    this.detail = createReplicaSlice(channelDetailResource, {
      actionPrefix: 'channel/detail',
      effects: {
        onApplied: (data, params, { scope }) => {
          const { outbox } = get();
          const next = settleOutbox(outbox, params, data, scope);
          if (next !== outbox) set({ outbox: next }, false, 'channel/outbox/settle');
        },
        onError: (error, params, { scope }) => {
          if (params.threadId && isTrpcErrorCode(error, 'NOT_FOUND')) {
            this.removeThread(params.channelId, params.threadId, scope);
            return;
          }
          if (
            isTrpcErrorCode(error, 'NOT_FOUND') ||
            isTrpcErrorCode(error, 'FORBIDDEN') ||
            isTrpcErrorCode(error, 'UNAUTHORIZED')
          )
            this.entity.remove(params.channelId, { scope });
        },
      },
      entity: channelDetailEntity,
      prepareHead: (incoming) => {
        let data: ChannelDetail | undefined = incoming;
        for (const id of this.deletedThreads.get(cacheScope.get())?.values() ?? []) {
          if (!data) break;
          data = channelDetailEntity.map(data, id, () => undefined);
        }
        return data;
      },
      get,
      set,
      stateKey: 'detailReplica',
      view: recordLens<ChannelState, ChannelDetail>('detailMap'),
    });
    this.entity = linkReplicaEntity<ChannelListItem>([this.list, this.detail]);
    this.userCandidates = createReplicaSlice(channelUserCandidatesResource, {
      actionPrefix: 'channel/userCandidates',
      get,
      set,
      stateKey: 'userCandidatesReplica',
      view: recordLens<ChannelState, ChannelPersonOption[]>('userCandidatesMap'),
    });
    this.agentEnvironment = createReplicaSlice(channelAgentEnvironmentResource, {
      actionPrefix: 'channel/agentEnvironment',
      get,
      set,
      stateKey: 'agentEnvironmentReplica',
      view: recordLens<ChannelState, ChannelAgentEnvironment>('agentEnvironmentMap'),
    });
    this.wakeConfig = createReplicaSlice(channelWakeConfigResource, {
      actionPrefix: 'channel/wakeConfig',
      get,
      set,
      stateKey: 'wakeConfigReplica',
      view: recordLens<ChannelState, ChannelWakeConfigData>('wakeConfigMap'),
    });
    this.sections = createReplicaSlice(channelSectionsResource, {
      actionPrefix: 'channel/sections',
      get,
      set,
      stateKey: 'sectionsReplica',
      view: recordLens<ChannelState, ChannelSection[]>('sectionsMap'),
    });
    this.scopeList = createReplicaSlice(channelScopeListResource, {
      actionPrefix: 'channel/scopeList',
      get,
      set,
      stateKey: 'scopeListReplica',
      view: recordLens<ChannelState, ChannelListItem[]>('scopeListMap'),
    });
  }
}
