import { createReplicaSlice, type ReplicaLens, type ReplicaPageResult } from '@/libs/replica';
import { resourceService } from '@/services/resource';
import { type StoreSetter } from '@/store/types';
import { type ResourceItem } from '@/types/resource';
import { setNamespace } from '@/utils/storeDebug';

import { type FileStore } from '../../store';
import type { ResourceListParams, ResourceListValue } from './projection';
import { DEFAULT_RESOURCE_PAGE_SIZE, resourceListResource } from './projection';
import { isOptimisticRowInRequestedPool } from './utils';

const n = setNamespace('resource');

type Setter = StoreSetter<FileStore>;

/**
 * The explorer list keeps a single replica entry whose view lives in the flat
 * store fields the rest of the app already reads. The engine is the only writer;
 * `get` reconstructs the paged value from the stored entry, `set` fans it back
 * out into `resourceList` / `resourceMap` / paging fields in one commit, so a
 * subscriber never sees a list out of step with its bookkeeping.
 */
const resourceListLens: ReplicaLens<FileStore, ResourceListValue> = {
  // A scope switch drops the whole view, query included.
  clear: () => ({
    hasMore: false,
    isLoadingMore: false,
    offset: 0,
    queryParams: undefined,
    resourceList: [],
    resourceListEntry: undefined,
    resourceMap: new Map(),
    total: 0,
  }),
  get: (state) => state.resourceListEntry,
  set: (_state, _key, data) => {
    if (!data) {
      // Dropping the painted rows keeps the queried params, so the views can
      // still tell that the request on screen has moved on (skeleton instead of
      // the previous pool's rows).
      return {
        hasMore: false,
        isLoadingMore: false,
        offset: 0,
        resourceList: [],
        resourceListEntry: undefined,
        resourceMap: new Map(),
        total: 0,
      };
    }

    return {
      hasMore: data.hasMore,
      isLoadingMore: data.isLoadingMore ?? false,
      offset: data.items.length,
      queryParams: data.queryParams,
      resourceList: data.items,
      resourceListEntry: data,
      resourceMap: new Map(data.items.map((item) => [item.id, item])),
      total: data.total ?? data.items.length,
    };
  },
};

export class ResourceActionImpl {
  /** Query the Explorer last asked for (set every render, read by the effects). */
  #requestedListParams?: ResourceListParams;
  /** Storage row of `#requestedListParams`; a slow hydrate of another query is dropped. */
  #requestedListStorageKey?: string;

  constructor(set: Setter, get: () => FileStore, _api?: unknown) {
    void _api;
    createReplicaSlice(resourceListResource, {
      actionPrefix: n('resourceList'),
      fetcher: (params, cursor) => this.#fetchResourcePage(params, cursor),
      get,
      // A slow hydrate of a query the user has already left must not repaint the
      // list: the requested row — not whatever the store still shows — decides.
      isHydratable: (_cached, params) =>
        resourceListResource.storageKey(params) === this.#requestedListStorageKey,
      // Rows the explorer inserted locally (an in-flight upload / create) are
      // the newest and have no server row yet, so a head response for their own
      // pool — initial, focus or reconnect — must keep them instead of replacing
      // them away. One from another pool must not: the singleton entry is reused
      // by every query, so an unscoped predicate would paint folder A's upload
      // in folder B.
      isClientOnly: (item: ResourceItem) =>
        !!item._optimistic &&
        isOptimisticRowInRequestedPool(item._optimistic.queryKey, this.#requestedListParams),
      set,
      stateKey: 'resourceListReplica',
      view: resourceListLens,
      viewFields: (params) => ({ queryParams: params }),
    });
  }

  /** One page of the explorer list; `cursor` is the page index (0 = head). */
  #fetchResourcePage = async (
    params: ResourceListParams,
    cursor?: number,
  ): Promise<ReplicaPageResult<ResourceItem, number>> => {
    const { pageSize, ...query } = params;
    const limit = pageSize ?? DEFAULT_RESOURCE_PAGE_SIZE;
    const page = cursor ?? 0;
    const response = await resourceService.queryResources({
      ...query,
      limit,
      offset: page * limit,
    });

    return {
      items: response.items,
      // The server drops rows *after* paging (Inbox folders), so a short page is
      // not the end: exhaustion is exactly the server's `hasMore`, never a
      // length inferred from the visible rows.
      nextCursor: response.hasMore ? page + 1 : null,
      total: response.total,
    };
  };
}

export type ResourceAction = Pick<ResourceActionImpl, keyof ResourceActionImpl>;
