import type { StateCreator } from 'zustand/vanilla';

import {
  createReplicaSlice,
  linkReplicaEntity,
  readReplicaStoredKeys,
  recordLens,
  type ReplicaPageResult,
} from '@/libs/replica';
import type { StoreSetter } from '@/store/types';
import { flattenActions } from '@/store/utils/flattenActions';
import type { ResourceItem, ResourceQueryParams } from '@/types/resource';
import { setNamespace } from '@/utils/storeDebug';

import type { State } from './initialState';
import { initialState } from './initialState';
import {
  DEFAULT_SEARCH_PAGE_SIZE,
  type ExplorerSearchParams,
  explorerSearchResource,
  type ExplorerSearchValue,
  type HierarchySearchParams,
  hierarchySearchResource,
  type HierarchySearchValue,
} from './projection';
import { getDefaultLibrarySort } from './selectors';

const n = setNamespace('resourceManager');

export type Store = Action & State;

type Setter = StoreSetter<Store>;

/**
 * One page of a search list. `cursor` is the page index (0 = head), so the
 * replica owns the offset and a query change repaints from its own head page.
 */
/**
 * A search page as the replica needs it.
 *
 * The endpoint also reports `hasMore`, which the replica cannot read: it infers
 * "another page" from a full page when `total` is unknown. So an exact multiple
 * of the page size — the endpoint then answers `hasMore: false` with no `total` —
 * would keep a dead "load more" and fire one request for an empty page. Recording
 * the terminal count the flag implies is how that signal survives.
 */
const toSearchPageResult = (
  response: { hasMore: boolean; items: ResourceItem[]; total?: number },
  cursor: number | undefined,
  pageSize: number,
): ReplicaPageResult<ResourceItem, number> => ({
  items: response.items,
  total:
    response.total ??
    (response.hasMore ? undefined : (cursor ?? 0) * pageSize + response.items.length),
});

/** The resource query an explorer search narrows to, without paging or preview. */
const toExplorerSearchQuery = (params: ExplorerSearchParams): ResourceQueryParams => ({
  category: params.category,
  filesOnly: !params.libraryId,
  libraryId: params.libraryId,
  q: params.q,
  sorter: params.sorter,
  sortType: params.sortType,
  showFilesInKnowledgeBase: !params.libraryId,
  sourceFilter: params.sourceFilter,
  visibility: params.visibility,
});

const fetchExplorerSearchPage = async (
  params: ExplorerSearchParams,
  cursor?: number,
): Promise<ReplicaPageResult<ResourceItem, number>> => {
  const { resourceService } = await import('@/services/resource');
  const pageSize = params.pageSize ?? DEFAULT_SEARCH_PAGE_SIZE;

  const response = await resourceService.queryResources({
    ...toExplorerSearchQuery(params),
    includeContentPreview: params.includeContentPreview,
    limit: pageSize,
    offset: (cursor ?? 0) * pageSize,
  });

  return toSearchPageResult(response, cursor, pageSize);
};

const fetchHierarchySearchPage = async (
  params: HierarchySearchParams,
  cursor?: number,
): Promise<ReplicaPageResult<ResourceItem, number>> => {
  const { resourceService } = await import('@/services/resource');
  const pageSize = params.pageSize ?? DEFAULT_SEARCH_PAGE_SIZE;

  const response = await resourceService.queryResources({
    libraryId: params.libraryId,
    limit: pageSize,
    offset: (cursor ?? 0) * pageSize,
    q: params.q,
    showFilesInKnowledgeBase: false,
  });

  return toSearchPageResult(response, cursor, pageSize);
};

/**
 * How many distinct queries per search surface keep a replica entry. The one
 * the user is on is always the most recent, so bounding the list bounds memory
 * and IndexedDB together: searching all day cannot grow either without limit,
 * and the queries just used still paint from their own rows when revisited.
 */
const MAX_RECENT_SEARCHES = 8;

/** Where the explorer search views live in the store — one entry per query. */
const explorerSearchLens = recordLens<Store, ExplorerSearchValue>('explorerSearchEntries');

/** Where the library sidebar search views live — one entry per (library, keyword). */
const hierarchySearchLens = recordLens<Store, HierarchySearchValue>('hierarchySearchEntries');

/**
 * Either search surface. Both key their persisted rows by the entry key alone
 * (neither sets a replica `query`), so the stored index holds entry keys.
 */
type SearchReplicaResource = typeof explorerSearchResource | typeof hierarchySearchResource;

/** The invalidation surface both search slices expose. */
type SearchReplicaSlice = {
  collapse: (key: string) => unknown;
  remove: (key: string) => unknown;
};

class ResourceManagerStoreActionImpl {
  readonly #get: () => Store;
  readonly #set: Setter;
  readonly #explorerSearch;
  readonly #hierarchySearch;
  #activeHierarchySearchKey?: string;

  constructor(set: Setter, get: () => Store, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;

    this.#explorerSearch = createReplicaSlice(explorerSearchResource, {
      actionPrefix: n('explorerSearch'),
      fetcher: fetchExplorerSearchPage,
      get,
      set,
      stateKey: 'explorerSearchReplica',
      view: explorerSearchLens,
      // The keyword is part of the entry identity, so the mounted surface can
      // tell whether the painted rows still answer the request on screen.
      viewFields: (params) => ({ searchParams: params }),
    });

    this.#hierarchySearch = createReplicaSlice(hierarchySearchResource, {
      actionPrefix: n('hierarchySearch'),
      fetcher: fetchHierarchySearchPage,
      get,
      set,
      stateKey: 'hierarchySearchReplica',
      view: hierarchySearchLens,
      viewFields: (params) => ({ searchParams: params }),
    });

    linkReplicaEntity<ResourceItem>([this.#explorerSearch, this.#hierarchySearch]);
  }

  /**
   * Invalidate one search surface.
   *
   * A rename / move / delete can touch a row a search had loaded beyond its head
   * page. Revalidating only re-runs the head request and the replica keeps the
   * rows the user already scrolled to, so a stale hit would linger in that tail;
   * dropping the loaded pages first means the head that comes back is the only
   * thing left to show.
   *
   * Only the entry on screen gets that treatment. The driver revalidates just
   * mounted queries, so every other entry — a search left behind in memory, or
   * one only an earlier session had persisted — would keep its stale head
   * forever (and offline, indefinitely). Those are dropped outright: a revisit
   * then has nothing stale to hydrate.
   */
  #invalidateSearchSurface = async (
    resource: SearchReplicaResource,
    entries: Record<string, unknown>,
    activeKey: string | undefined,
    slice: SearchReplicaSlice,
  ): Promise<void> => {
    const loaded = new Set(Object.keys(entries));
    for (const key of loaded) {
      if (key === activeKey) slice.collapse(key);
      else slice.remove(key);
    }

    const scope = resource.scope.get();
    const persisted = await readReplicaStoredKeys(resource);
    // The identity can change while the index is read; those rows are not ours
    // to touch, and `remove` resolves against the *current* scope.
    if (resource.scope.get() !== scope) return;
    for (const key of persisted) {
      if (!loaded.has(key)) slice.remove(key);
    }
  };

  /** Invalidate the sidebar's cached searches (see `#invalidateSearchSurface`). */
  collapseHierarchySearch = async (): Promise<void> =>
    this.#invalidateSearchSurface(
      hierarchySearchResource,
      this.#get().hierarchySearchEntries,
      this.#activeHierarchySearchKey,
      this.#hierarchySearch,
    );

  setSelectedFileIds = (selectedFileIds: string[]): void => {
    const { selectAllState } = this.#get();

    this.#set({
      selectAllState:
        selectedFileIds.length === 0 && selectAllState !== 'all' ? 'none' : selectAllState,
      selectedFileIds,
    });
  };
}

type Action = Pick<ResourceManagerStoreActionImpl, keyof ResourceManagerStoreActionImpl>;

const createResourceManagerStoreSlice = (set: Setter, get: () => Store, _api?: unknown) =>
  new ResourceManagerStoreActionImpl(set, get, _api);

type CreateStore = (
  initState?: Partial<State>,
) => StateCreator<Store, [['zustand/devtools', never]]>;

export const store: CreateStore =
  (publicState) =>
  (...params) => ({
    ...initialState,
    ...getDefaultLibrarySort(publicState?.libraryId),
    sortLibraryId: publicState?.libraryId,
    ...publicState,
    ...flattenActions<Action>([createResourceManagerStoreSlice(...params)]),
  });
