import type { ChatTopic, RecentTopic } from '@lobot/types';

import { createReplicaSlice, recordLens } from '@/libs/replica';
import { topicService } from '@/services/topic';
import { type ReplicaQueryResult, toReplicaQueryResult } from '@/store/eval/replicaQuery';
import { type EvalStore, useEvalStore } from '@/store/eval/store';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import {
  CONVERSATION_PICKER_LIMIT,
  conversationPickerKey,
  conversationPickerResource,
  type EvalConversationTopic,
} from './projection';

const n = setNamespace('evalConversation');

type Setter = StoreSetter<EvalStore>;

const searchTopic = (topic: ChatTopic): EvalConversationTopic => ({
  id: topic.id,
  title: topic.title,
  updatedAt: topic.updatedAt,
});

const recentTopic = (topic: RecentTopic): EvalConversationTopic => ({
  agentTitle: topic.agent?.title,
  id: topic.id,
  title: topic.title,
  updatedAt: topic.updatedAt,
});

/** Search matches for a query, or the recent agent conversations for an empty one. */
const fetchConversationTopics = async ({
  query,
}: {
  query: string;
}): Promise<EvalConversationTopic[]> => {
  if (query) return (await topicService.searchTopics(query)).map(searchTopic);

  return (await topicService.getRecentTopics(CONVERSATION_PICKER_LIMIT))
    .filter((topic) => topic.type === 'agent')
    .map(recentTopic);
};

export const createConversationSlice = (set: Setter, get: () => EvalStore, api?: unknown) =>
  new ConversationActionImpl(set, get, api);

class ConversationActionImpl {
  constructor(set: Setter, get: () => EvalStore, _api?: unknown) {
    void _api;
    createReplicaSlice(conversationPickerResource, {
      actionPrefix: n('topics'),
      fetcher: fetchConversationTopics,
      get,
      set,
      stateKey: 'conversationTopicReplica',
      view: recordLens<EvalStore, EvalConversationTopic[]>('conversationTopicMap'),
    });
  }
}

export type ConversationAction = Pick<ConversationActionImpl, keyof ConversationActionImpl>;
