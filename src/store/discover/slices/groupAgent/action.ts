import type { CategoryItem } from '@lobehub/market-sdk';

import { createReplicaSlice, recordLens } from '@/libs/replica';
import type { DiscoverStore } from '@/store/discover';
import type { StoreSetter } from '@/store/types';
import type {
  DiscoverGroupAgentDetail,
  GroupAgentListResponse,
  IdentifiersResponse,
} from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import {
  groupAgentCategoriesResource,
  groupAgentDetailResource,
  groupAgentIdentifiersResource,
  groupAgentListResource,
} from './projection';

const n = setNamespace('discover/groupAgent');

type Setter = StoreSetter<DiscoverStore>;

export const createGroupAgentSlice = (set: Setter, get: () => DiscoverStore, _api?: unknown) =>
  new GroupAgentActionImpl(set, get, _api);

class GroupAgentActionImpl {
  constructor(set: Setter, get: () => DiscoverStore, _api?: unknown) {
    void _api;
    createReplicaSlice(groupAgentListResource, {
      actionPrefix: n('list'),
      get,
      set,
      stateKey: 'groupAgentListReplica',
      view: recordLens<DiscoverStore, GroupAgentListResponse>('groupAgentListMap'),
    });
    createReplicaSlice(groupAgentDetailResource, {
      actionPrefix: n('detail'),
      get,
      // The market no longer has this group: drop the entry and its persisted
      // row rather than keep serving the cached copy.
      isMissing: (detail) => detail === null,
      set,
      stateKey: 'groupAgentDetailReplica',
      view: recordLens<DiscoverStore, DiscoverGroupAgentDetail>('groupAgentDetailMap'),
    });
    createReplicaSlice(groupAgentCategoriesResource, {
      actionPrefix: n('categories'),
      get,
      set,
      stateKey: 'groupAgentCategoriesReplica',
      view: recordLens<DiscoverStore, CategoryItem[]>('groupAgentCategoriesMap'),
    });
    createReplicaSlice(groupAgentIdentifiersResource, {
      actionPrefix: n('identifiers'),
      get,
      set,
      stateKey: 'groupAgentIdentifiersReplica',
      view: recordLens<DiscoverStore, IdentifiersResponse>('groupAgentIdentifiersMap'),
    });
  }
}

export type GroupAgentAction = Pick<GroupAgentActionImpl, keyof GroupAgentActionImpl>;
