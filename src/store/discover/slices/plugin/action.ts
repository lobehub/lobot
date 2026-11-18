import type { CategoryItem } from '@lobehub/market-sdk';

import { createReplicaSlice, recordLens } from '@/libs/replica';
import type { DiscoverStore } from '@/store/discover';
import type { StoreSetter } from '@/store/types';
import type {
  DiscoverPluginDetail,
  IdentifiersResponse,
  PluginListResponse,
} from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import {
  pluginCategoriesResource,
  pluginDetailResource,
  pluginIdentifiersResource,
  pluginListResource,
} from './projection';

const n = setNamespace('discover/plugin');

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
