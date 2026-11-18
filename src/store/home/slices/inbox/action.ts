import { createReplicaSlice, recordLens } from '@/libs/replica';
import { type HomeDailyBriefResponse, homeService } from '@/services/home';
import { type TopicListItem, topicService } from '@/services/topic';
import type { HomeStore } from '@/store/home/store';
import type { StoreSetter } from '@/store/types';
import { type ChatTopicStatus } from '@/types/topic';
import { setNamespace } from '@/utils/storeDebug';

import { homeDailyBriefResource, type HomeFeedParams, homeInboxTopicsResource } from './projection';

const n = setNamespace('homeInbox');

/**
 * Everything the home inbox needs from topics, in one round trip. `queryTopics`
 * filters server-side by status, so widening this list costs nothing extra.
 */
const INBOX_STATUSES: ChatTopicStatus[] = ['running', 'unread'];

const FEED_PARAMS: HomeFeedParams = {};

/** How long the server's own status write gets before the inbox reconciles with it. */
const PROMOTE_RECONCILE_DELAY = 1000;

type Setter = StoreSetter<HomeStore>;
export const createHomeInboxSlice = (set: Setter, get: () => HomeStore, _api?: unknown) =>
  new HomeInboxActionImpl(set, get, _api);

class HomeInboxActionImpl {
  constructor(set: Setter, get: () => HomeStore, _api?: unknown) {
    void _api;
    createReplicaSlice(homeInboxTopicsResource, {
      actionPrefix: n('inboxTopics'),
      // `withLastMessage` is what makes an unread row readable: the card shows what
      // the agent actually said, not just the topic title it was filed under.
      fetcher: () => topicService.queryTopics({ statuses: INBOX_STATUSES, withLastMessage: true }),
      get,
      set,
      stateKey: 'homeInboxTopicsReplica',
      view: recordLens<HomeStore, TopicListItem[]>('homeInboxTopicsMap'),
    });
    createReplicaSlice(homeDailyBriefResource, {
      actionPrefix: n('dailyBrief'),
      fetcher: () => homeService.getDailyBrief(),
      get,
      set,
      stateKey: 'homeDailyBriefReplica',
      view: recordLens<HomeStore, HomeDailyBriefResponse>('homeDailyBriefMap'),
    });
  }
}

export type HomeInboxAction = Pick<HomeInboxActionImpl, keyof HomeInboxActionImpl>;
