import type { CategoryItem } from '@lobehub/market-sdk';

import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import type { DiscoverStore } from '@/store/discover';
import { globalHelpers } from '@/store/global/helpers';
import type { StoreSetter } from '@/store/types';
import type {
  DiscoverGroupAgentDetail,
  GroupAgentListResponse,
  GroupAgentQueryParams,
  IdentifiersResponse,
} from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';
import { isTrpcErrorCode } from '@/utils/trpcError';

import {
  type GroupAgentCategoriesParams,
  groupAgentCategoriesQueryKey,
  groupAgentCategoriesResource,
  type GroupAgentDetailParams,
  groupAgentDetailQueryKey,
  groupAgentDetailResource,
  type GroupAgentIdentifiersParams,
  groupAgentIdentifiersQueryKey,
  groupAgentIdentifiersResource,
  type GroupAgentListParams,
  groupAgentListQueryKey,
  groupAgentListResource,
} from './projection';

const n = setNamespace('discover/groupAgent');

/**
 * Sync flags of a market read, plus the aliases the old SWR hooks returned
 * (`isLoading` / `mutate`) so a call site only has to move its `data` read to
 * the matching `groupAgentSelectors` entry.
 */
interface GroupAgentSyncResult extends ReplicaSyncResult {
  /** A request is in flight and this entry has no value to show yet. */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
  /** Read the value with `groupAgentSelectors.*(queryKey)`; undefined while disabled. */
  queryKey?: string;
}

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
