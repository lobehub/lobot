import { createReplicaSlice, recordLens } from '@/libs/replica';
import { topicService } from '@/services/topic';
import type { ChatStore } from '@/store/chat';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import {
  type TopicShareEntry,
  type TopicShareInfo,
  topicShareResource,
  type TopicShareVisibility,
} from './projection';

/** Keep the fields the popover reads; write results carry the whole row. */
const toShareInfo = (record: {
  id: string;
  topicId: string;
  userId: string;
  visibility: string;
}): TopicShareInfo => ({
  id: record.id,
  topicId: record.topicId,
  userId: record.userId,
  visibility: record.visibility as TopicShareVisibility,
});

type Setter = StoreSetter<ChatStore>;

const createTopicShareSlice = (set: Setter, get: () => ChatStore) =>
  createReplicaSlice(topicShareResource, {
    actionPrefix: setNamespace('t')('topicShare'),
    fetcher: async (topicId): Promise<TopicShareEntry> => {
      const record = await topicService.getShareInfo(topicId);
      return { share: record ? toShareInfo(record) : null };
    },
    get,
    set,
    stateKey: 'topicShareReplica',
    // "No record" is never persisted, and evicts a record persisted earlier.
    toPersisted: (data) => (data.share ? data : null),
    view: recordLens<ChatStore, TopicShareEntry>('topicShareMap'),
  });

/** The share record behind the topic Share popover → `topicShareMap[topicId]`. */
export class ChatTopicShareActionImpl {
  constructor(set: Setter, get: () => ChatStore, _api?: unknown) {
    void _api;
    createTopicShareSlice(set, get);
  }
}

export type ChatTopicShareAction = Pick<ChatTopicShareActionImpl, keyof ChatTopicShareActionImpl>;
