import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import type { DiscoverStore } from '@/store/discover';
import { globalHelpers } from '@/store/global/helpers';
import type { StoreSetter } from '@/store/types';
import type {
  DiscoverProviderDetail,
  IdentifiersResponse,
  ProviderListResponse,
  ProviderQueryParams,
} from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import {
  type ProviderDetailParams,
  providerDetailQueryKey,
  providerDetailResource,
  type ProviderIdentifiersParams,
  providerIdentifiersQueryKey,
  providerIdentifiersResource,
  type ProviderListParams,
  providerListQueryKey,
  providerListResource,
} from './projection';

const n = setNamespace('discover/provider');

/**
 * Sync flags of a market read, plus the aliases the old SWR hooks returned
 * (`isLoading` / `mutate`) so a call site only has to move its `data` read to
 * the matching `providerSelectors` entry.
 */
interface ProviderSyncResult extends ReplicaSyncResult {
  /** A request is in flight and this entry has no value to show yet. */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
  /** Read the value with `providerSelectors.*(queryKey)`; undefined while disabled. */
  queryKey?: string;
}

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
