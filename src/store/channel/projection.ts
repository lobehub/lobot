import type { ChannelDetail, ChannelListItem, ChannelPublicMessage } from '@lobot/types';

import { defineReplica, type ReplicaEntityAdapter } from '@/libs/replica';
import {
  type ChannelPersonOption,
  channelService,
  type ChannelViewParams,
} from '@/services/channel';

export const channelThreadEntityId = (channelId: string, threadId: string) =>
  `${channelId}/thread/${threadId}`;

export const channelMessageEntityId = (channelId: string, messageId: string) =>
  `${channelId}/message/${messageId}`;

const isMessageEntity = (data: ChannelDetail, message: ChannelPublicMessage, id: string) =>
  channelMessageEntityId(data.channel.id, message.id) === id;

/**
 * A branch appears in every view's thread list and owns views with its root message. A message
 * appears in its own view and, as a thread root, at the top of that thread's view; it is only
 * ever updated in place, never removed.
 */
export const channelDetailEntity: ReplicaEntityAdapter<ChannelDetail, { id: string }> = {
  has: (data, id) =>
    data.channel.id === id ||
    data.threads.some((thread) => channelThreadEntityId(data.channel.id, thread.id) === id) ||
    (!!data.rootMessage && isMessageEntity(data, data.rootMessage, id)) ||
    data.messages.some((message) => isMessageEntity(data, message, id)),
  map: (data, id, fn) => {
    if (id.startsWith(`${data.channel.id}/message/`)) {
      const update = (message: ChannelPublicMessage) => {
        if (!isMessageEntity(data, message, id)) return message;
        const next = fn(message);
        return next ? { ...message, ...next } : message;
      };
      return {
        ...data,
        messages: data.messages.map(update),
        rootMessage: data.rootMessage && update(data.rootMessage),
      };
    }
    if (data.channel.id === id) {
      const next = fn(data.channel);
      return next ? { ...data, channel: { ...data.channel, ...next } } : undefined;
    }
    const thread = data.threads.find(
      (entry) => channelThreadEntityId(data.channel.id, entry.id) === id,
    );
    if (!thread) return data;
    const next = fn(thread);
    if (!next && data.rootMessage?.id === thread.rootMessageId) return undefined;
    return {
      ...data,
      threads: data.threads.flatMap((entry) =>
        entry.id !== thread.id ? [entry] : next ? [{ ...entry, ...next }] : [],
      ),
    };
  },
};

export const channelViewKey = (params: ChannelViewParams) =>
  `${params.channelId}:${params.threadId ?? 'main'}:${params.before ?? 'latest'}`;

export const channelListResource = defineReplica<Record<string, never>, ChannelListItem[]>({
  fetcher: () => channelService.list(),
  key: () => 'all',
  name: 'channelList',
  storage: 'indexedDB',
  version: 1,
});

export const channelDetailResource = defineReplica<ChannelViewParams, ChannelDetail>({
  fetcher: channelService.detail,
  key: channelViewKey,
  name: 'channelDetail',
  storage: 'indexedDB',
  version: 1,
});

export type ChannelAgentEnvironment = Awaited<ReturnType<typeof channelService.agentEnvironment>>;
export type ChannelWakeConfigData = Awaited<ReturnType<typeof channelService.wakeConfig>>;

export interface ChannelUserCandidatesParams {
  /** Absent for a Channel still being created. */
  channelId?: string;
  search: string;
}

export const channelUserCandidatesKey = ({ channelId, search }: ChannelUserCandidatesParams) =>
  `${channelId ?? 'new'}:${search}`;

/** People the invite picker offers, per Channel and search. */
export const channelUserCandidatesResource = defineReplica<
  ChannelUserCandidatesParams,
  ChannelPersonOption[]
>({
  fetcher: ({ channelId, search }) => channelService.userCandidates(channelId, search),
  key: channelUserCandidatesKey,
  name: 'channelUserCandidates',
  persist: { maxEntries: 20 },
  storage: 'indexedDB',
  version: 1,
});

export interface ChannelAgentEnvironmentParams {
  channelId: string;
  memberId: string;
}

export const channelAgentEnvironmentKey = ({
  channelId,
  memberId,
}: ChannelAgentEnvironmentParams) => `${channelId}:${memberId}`;

/** The device and directory an Agent runs on in one Channel. */
export const channelAgentEnvironmentResource = defineReplica<
  ChannelAgentEnvironmentParams,
  ChannelAgentEnvironment
>({
  fetcher: ({ channelId, memberId }) => channelService.agentEnvironment(channelId, memberId),
  key: channelAgentEnvironmentKey,
  name: 'channelAgentEnvironment',
  persist: { maxEntries: 50 },
  storage: 'indexedDB',
  version: 1,
});

/** A Channel's stored reply strategy, keyed by Channel id. */
export const channelWakeConfigResource = defineReplica<string, ChannelWakeConfigData>({
  fetcher: (channelId) => channelService.wakeConfig(channelId),
  key: (channelId) => channelId,
  name: 'channelWakeConfig',
  persist: { maxEntries: 50 },
  storage: 'indexedDB',
  version: 1,
});

/** Another scope's Channel list (`null` is the personal space), for the rail and the notifier. */
export interface ChannelScopeListParams {
  scopeId: string | null;
}

export const scopeChannelListKey = ({ scopeId }: ChannelScopeListParams) => scopeId ?? 'personal';

export const channelScopeListResource = defineReplica<ChannelScopeListParams, ChannelListItem[]>({
  fetcher: ({ scopeId }) => channelService.listInScope(scopeId),
  key: scopeChannelListKey,
  name: 'channelScopeList',
  persist: { maxEntries: 20 },
  storage: 'indexedDB',
  version: 1,
});
