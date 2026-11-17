import debug from 'debug';
import { useLayoutEffect } from 'react';

import { getActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import {
  createReplicaSlice,
  type ReplicaLens,
  type ReplicaPageResult,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { knowledgeBaseService } from '@/services/knowledgeBase';
import { resourceService } from '@/services/resource';
import { type StoreSetter } from '@/store/types';
import {
  type CreateResourceParams,
  type ResourceItem,
  type ResourceQueryParams,
  type UpdateResourceParams,
} from '@/types/resource';
import { setNamespace } from '@/utils/storeDebug';

import { type FileStore, useFileStore } from '../../store';
import type { ResourceParentKey } from './hooks';
import type { ResourceListParams, ResourceListValue } from './projection';
import {
  DEFAULT_RESOURCE_PAGE_SIZE,
  normalizeResourceListParams,
  RESOURCE_LIST_KEY,
  resourceListResource,
} from './projection';
import {
  getResourceQueryKey,
  isOptimisticRowInRequestedPool,
  listsMovedRowUnfiltered,
  patchDestinationList,
  patchSourceList,
} from './utils';

const log = debug('resource-manager:action');

const n = setNamespace('resource');

type Setter = StoreSetter<FileStore>;

/** An explorer-list overlay plus the list identity it was started on. */
interface ListOverlay {
  commit: (confirm?: (data: ResourceListValue) => ResourceListValue) => void;
  rollback: () => void;
  startedOn: string;
}

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

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

const stripOptimistic = (resource: ResourceItem): ResourceItem => {
  const { _optimistic, ...rest } = resource;
  void _optimistic;
  return rest;
};

/** The `ResourceSyncResult` plus the SWR-era aliases the explorer consumes. */
interface ResourceListSyncResult extends ReplicaSyncResult {
  /** Nothing painted yet and a fetch is on its way (the list/masonry skeletons). */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
}

export class ResourceActionImpl {
  readonly #get: () => FileStore;
  /**
   * The explorer list is a `local-replica` paged resource: the persisted
   * head page paints before the network answers, and "load more" appends further
   * pages through the engine instead of a hand-rolled `offset` accumulator.
   */
  readonly #resourceList;
  /** Query the Explorer last asked for (set every render, read by the effects). */
  #requestedListParams?: ResourceListParams;
  /** Storage row of `#requestedListParams`; a slow hydrate of another query is dropped. */
  #requestedListStorageKey?: string;

  constructor(set: Setter, get: () => FileStore, _api?: unknown) {
    void _api;
    this.#get = get;
    this.#resourceList = createReplicaSlice(resourceListResource, {
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

  #removeRows = (data: ResourceListValue, ids: Set<string>): ResourceListValue => {
    const items = data.items.filter((item) => !ids.has(item.id));
    if (items.length === data.items.length) return data;

    const removed = data.items.length - items.length;
    const total =
      data.total === undefined ? undefined : Math.max(items.length, data.total - removed);

    return {
      ...data,
      hasMore: total !== undefined ? total > items.length : data.hasMore,
      items,
      total,
    };
  };

  #patchRows = (
    data: ResourceListValue,
    ids: Set<string>,
    updater: (resource: ResourceItem) => ResourceItem,
  ): ResourceListValue => {
    let changed = false;
    const items = data.items.map((item) => {
      if (!ids.has(item.id)) return item;
      const next = updater(item);
      if (next !== item) changed = true;
      return next;
    });

    return changed ? { ...data, items } : data;
  };

  /**
   * Materialize a view for the explorer list so a local insert (upload /
   * create) has somewhere to land before the first page arrives. Rows already
   * written straight into the flat fields are adopted rather than dropped, so
   * a legacy caller (the upload path runs before any query is known) keeps
   * working; with no query at all the view is seeded query-less.
   */
  #ensureListView = (): void => {
    const state = this.#get();
    if (state.resourceListEntry) return;

    const params = state.queryParams;
    const items = state.resourceList;
    const seeded: ResourceListValue = {
      currentPage: 0,
      hasMore: state.hasMore,
      items,
      nextCursor: state.hasMore ? 1 : null,
      pageSize: params?.pageSize ?? DEFAULT_RESOURCE_PAGE_SIZE,
      queryParams: params,
      total: state.total ?? items.length,
    };

    this.#resourceList.update(RESOURCE_LIST_KEY, (data) => data ?? seeded, { persist: false });
  };

  /**
   * Replica query identity of the Explorer's current request. Tagging an
   * overlay with it scopes the overlay even when it starts before the first
   * page painted — the seeded entry has no query of its own yet, and an
   * untagged overlay would be kept across every query change (leaking one
   * folder's row into another).
   */
  #requestedListQuery = (): string | undefined =>
    this.#requestedListParams ? resourceListResource.query(this.#requestedListParams) : undefined;

  /**
   * Optimistic overlay over the explorer list, tagged with the list it was
   * started on (replica scope + requested storage row), so a settle can tell
   * whether the entry has moved on to another query since.
   */
  #beginListOptimistic = (apply: (data: ResourceListValue) => ResourceListValue): ListOverlay => {
    this.#ensureListView();
    const startedOn = this.#currentListIdentity();
    const token = this.#resourceList.beginOptimistic(
      RESOURCE_LIST_KEY,
      apply,
      this.#requestedListQuery(),
    );
    return { ...token, startedOn };
  };

  /** The list on screen: replica scope + requested storage row. */
  #currentListIdentity = (): string =>
    `${resourceListResource.scope.get()}\u0000${this.#requestedListStorageKey ?? ''}`;

  #revalidateList = async (): Promise<void> => {
    await this.#resourceList.revalidate();
  };

  /**
   * Confirm the mounted list after a mutation that the server already accepted.
   * A failed confirmation must not undo (or fail) that mutation: the rows are
   * committed, the next visit revalidates anyway, and the caller's own
   * transaction would otherwise restore a row the server has moved.
   */
  #revalidateListQuietly = async (action: string): Promise<void> => {
    try {
      await this.#revalidateList();
    } catch (error) {
      log('%s: revalidation after the mutation failed', action, error);
    }
  };

  /**
   * Settle an optimistic overlay and, when the list has moved on to another
   * query since it started — a same-pool query change (re-sort, view-mode
   * switch) drops the overlay, so its commit has nothing to settle — force a
   * reconciliation, so the server change is not left unreflected until the
   * next focus, reconnect or manual refresh.
   */
  #commitListOptimistic = (
    token: ListOverlay | undefined,
    action: string,
    confirm?: (data: ResourceListValue) => ResourceListValue,
  ): void => {
    if (!token) return;
    token.commit(confirm);
    if (token.startedOn !== this.#currentListIdentity()) void this.#revalidateListQuietly(action);
  };

  #clearSyncingOptimistic = (resource: ResourceItem): ResourceItem => stripOptimistic(resource);

  /**
   * Drop the painted page set (e.g. the filter chip changed) while keeping the
   * queried params, so the views render a skeleton and the next query's fetch
   * repaints instead of appending to the previous pool. The persisted rows the
   * engine holds are left alone.
   */
  clearCurrentQueryResources = (): void => {
    // Adopt rows a legacy caller wrote straight into the flat fields first, so
    // the drop below actually clears them.
    this.#ensureListView();
    this.#resourceList.update(RESOURCE_LIST_KEY, () => undefined, { persist: false });
  };

  /**
   * Evict every cached explorer list after a deletion only the server can
   * enumerate (select-all "delete by query"). The deleted set is unknown here,
   * and folder deletions reach into other folders' lists, so any persisted
   * variant — another sort, view mode, filter or folder — may hold a deleted
   * row. `clear()` drops memory and every persisted row of the active scope and
   * discards reads started before it; the revalidation then repaints whatever
   * survived. Unlike `clearCurrentQueryResources`, a failed refetch can no
   * longer leave a pre-deletion page behind for a reload or an offline visit.
   */
  evictResourceLists = async (): Promise<void> => {
    await this.#resourceList.clear();
    await this.#revalidateListQuietly('evictResourceLists');
  };

  deleteResources = async (ids: string[]) => {
    if (ids.length === 0) return;

    const idsSet = new Set(ids);
    const token = this.#beginListOptimistic((data) => this.#removeRows(data, idsSet));

    try {
      await resourceService.deleteResources(ids);
      this.#commitListOptimistic(token, 'deleteResources');
    } catch (error) {
      token?.rollback();
      throw error;
    }

    // See `deleteResource`: evict the rows from every persisted query variant.
    for (const id of ids) this.#resourceList.removeEntity(id);

    // See `deleteResource`: the detail replica persists by id, so it must be
    // evicted here too.
    this.#get().forgetKnowledgeItems(ids);
  };

  removeResourcesFromKnowledgeBase = async (
    knowledgeBaseId: string,
    ids: string[],
  ): Promise<void> => {
    if (ids.length === 0) return;

    const idsSet = new Set(ids);
    const isKnowledgeBaseView = this.#get().queryParams?.libraryId === knowledgeBaseId;
    const token = this.#beginListOptimistic((data) =>
      isKnowledgeBaseView
        ? this.#removeRows(data, idsSet)
        : this.#patchRows(data, idsSet, (resource) => ({
            ...resource,
            _optimistic: {
              ...(resource._optimistic || {
                queryKey: getResourceQueryKey(this.#get().queryParams),
                retryCount: 0,
              }),
              isPending: true,
            },
            knowledgeBaseId: undefined,
          })),
    );

    try {
      await knowledgeBaseService.removeFilesFromKnowledgeBase(knowledgeBaseId, ids);
      if (isKnowledgeBaseView) {
        this.#commitListOptimistic(token, 'removeResourcesFromKnowledgeBase');
        // The rows left the server's page too, so the loaded depth no longer
        // lines up with the survivors. Drop the loaded pages to the head first:
        // the confirmation then repaints a real head page and "load more"
        // restarts from offset 1 instead of skipping the row that shifted up
        // into the gap (a multi-page list kept its old cursor otherwise).
        this.#resourceList.collapse(RESOURCE_LIST_KEY);
        await this.#revalidateListQuietly('removeResourcesFromKnowledgeBase');
      } else {
        this.#commitListOptimistic(token, 'removeResourcesFromKnowledgeBase', (data) =>
          this.#patchRows(data, idsSet, (resource) =>
            this.#clearSyncingOptimistic({ ...resource, knowledgeBaseId: undefined }),
          ),
        );
      }
    } catch (error) {
      token?.rollback();
      throw toError(error);
    }
  };
}

export type ResourceAction = Pick<ResourceActionImpl, keyof ResourceActionImpl>;
