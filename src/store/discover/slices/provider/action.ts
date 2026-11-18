import { createReplicaSlice, recordLens } from '@/libs/replica';
import type { DiscoverStore } from '@/store/discover';
import type { StoreSetter } from '@/store/types';
import type {
  DiscoverProviderDetail,
  IdentifiersResponse,
  ProviderListResponse,
} from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import {
  providerDetailResource,
  providerIdentifiersResource,
  providerListResource,
} from './projection';

const n = setNamespace('discover/provider');

type Setter = StoreSetter<DiscoverStore>;

export const createProviderSlice = (set: Setter, get: () => DiscoverStore, _api?: unknown) =>
  new ProviderActionImpl(set, get, _api);

class ProviderActionImpl {
  constructor(set: Setter, get: () => DiscoverStore, _api?: unknown) {
    void _api;
    createReplicaSlice(providerListResource, {
      actionPrefix: n('list'),
      get,
      set,
      stateKey: 'providerListReplica',
      view: recordLens<DiscoverStore, ProviderListResponse>('providerListMap'),
    });
    createReplicaSlice(providerDetailResource, {
      actionPrefix: n('detail'),
      get,
      set,
      stateKey: 'providerDetailReplica',
      view: recordLens<DiscoverStore, DiscoverProviderDetail>('providerDetailMap'),
    });
    createReplicaSlice(providerIdentifiersResource, {
      actionPrefix: n('identifiers'),
      get,
      set,
      stateKey: 'providerIdentifiersReplica',
      view: recordLens<DiscoverStore, IdentifiersResponse>('providerIdentifiersMap'),
    });
  }
}

export type ProviderAction = Pick<ProviderActionImpl, keyof ProviderActionImpl>;
