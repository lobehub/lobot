import type { CategoryItem } from '@lobehub/market-sdk';

import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import type { DiscoverStore } from '@/store/discover';
import { globalHelpers } from '@/store/global/helpers';
import type { StoreSetter } from '@/store/types';
import type {
  DiscoverPluginDetail,
  IdentifiersResponse,
  PluginListResponse,
  PluginQueryParams,
} from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import {
  type PluginCategoriesParams,
  pluginCategoriesQueryKey,
  pluginCategoriesResource,
  type PluginDetailParams,
  pluginDetailQueryKey,
  pluginDetailResource,
  type PluginIdentifiersParams,
  pluginIdentifiersQueryKey,
  pluginIdentifiersResource,
  type PluginListParams,
  pluginListQueryKey,
  pluginListResource,
} from './projection';

const n = setNamespace('discover/plugin');

/**
 * Sync flags of a market read, plus the aliases the old SWR hooks returned
 * (`isLoading` / `mutate`) so a call site only has to move its `data` read to
 * the matching `pluginSelectors` entry.
 */
interface PluginSyncResult extends ReplicaSyncResult {
  /** A request is in flight and this entry has no value to show yet. */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
  /** Read the value with `pluginSelectors.*(queryKey)`; undefined while disabled. */
  queryKey?: string;
}

type Setter = StoreSetter<DiscoverStore>;

export const createPluginSlice = (set: Setter, get: () => DiscoverStore, _api?: unknown) =>
  new PluginActionImpl(set, get, _api);

class PluginActionImpl {
  constructor(set: Setter, get: () => DiscoverStore, _api?: unknown) {
    void _api;
    createReplicaSlice(pluginListResource, {
      actionPrefix: n('list'),
      get,
      set,
      stateKey: 'pluginListReplica',
      view: recordLens<DiscoverStore, PluginListResponse>('pluginListMap'),
    });
    createReplicaSlice(pluginDetailResource, {
      actionPrefix: n('detail'),
      get,
      // The market no longer has this plugin: drop the entry and its persisted
      // row rather than keep serving the cached copy.
      isMissing: (detail) => detail === null,
      set,
      stateKey: 'pluginDetailReplica',
      view: recordLens<DiscoverStore, DiscoverPluginDetail>('pluginDetailMap'),
    });
    createReplicaSlice(pluginCategoriesResource, {
      actionPrefix: n('categories'),
      get,
      set,
      stateKey: 'pluginCategoriesReplica',
      view: recordLens<DiscoverStore, CategoryItem[]>('pluginCategoriesMap'),
    });
    createReplicaSlice(pluginIdentifiersResource, {
      actionPrefix: n('identifiers'),
      get,
      set,
      stateKey: 'pluginIdentifiersReplica',
      view: recordLens<DiscoverStore, IdentifiersResponse>('pluginIdentifiersMap'),
    });
  }
}

export type PluginAction = Pick<PluginActionImpl, keyof PluginActionImpl>;
