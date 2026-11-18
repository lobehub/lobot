import type { CategoryItem } from '@lobehub/market-sdk';

import { createReplicaSlice, recordLens } from '@/libs/replica';
import type { DiscoverStore } from '@/store/discover';
import type { StoreSetter } from '@/store/types';
import type { DiscoverModelDetail, IdentifiersResponse, ModelListResponse } from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import {
  modelCategoriesResource,
  modelDetailResource,
  modelIdentifiersResource,
  modelListResource,
} from './projection';

const n = setNamespace('discover/model');

type Setter = StoreSetter<DiscoverStore>;

export const createModelSlice = (set: Setter, get: () => DiscoverStore, _api?: unknown) =>
  new ModelActionImpl(set, get, _api);

class ModelActionImpl {
  constructor(set: Setter, get: () => DiscoverStore, _api?: unknown) {
    void _api;
    createReplicaSlice(modelListResource, {
      actionPrefix: n('list'),
      get,
      set,
      stateKey: 'modelListReplica',
      view: recordLens<DiscoverStore, ModelListResponse>('modelListMap'),
    });
    createReplicaSlice(modelDetailResource, {
      actionPrefix: n('detail'),
      get,
      // The market no longer has this model: drop the entry and its persisted
      // row rather than keep serving the cached copy.
      isMissing: (detail) => detail === null,
      set,
      stateKey: 'modelDetailReplica',
      view: recordLens<DiscoverStore, DiscoverModelDetail>('modelDetailMap'),
    });
    createReplicaSlice(modelCategoriesResource, {
      actionPrefix: n('categories'),
      get,
      set,
      stateKey: 'modelCategoriesReplica',
      view: recordLens<DiscoverStore, CategoryItem[]>('modelCategoriesMap'),
    });
    createReplicaSlice(modelIdentifiersResource, {
      actionPrefix: n('identifiers'),
      get,
      set,
      stateKey: 'modelIdentifiersReplica',
      view: recordLens<DiscoverStore, IdentifiersResponse>('modelIdentifiersMap'),
    });
  }
}

export type ModelAction = Pick<ModelActionImpl, keyof ModelActionImpl>;
