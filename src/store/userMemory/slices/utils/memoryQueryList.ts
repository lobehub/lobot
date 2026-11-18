import {
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  type ReplicaLens,
  type ReplicaPagedData,
  type ReplicaPageResult,
  type ReplicaResource,
} from '@/libs/replica';
import { mutate } from '@/libs/swr';
import { type StoreSetter } from '@/store/types';

import { type UserMemoryStore } from '../../store';
import { OffsetListPager } from './offsetListPager';

/** Query of one memory list page set; `pageSize` is not part of its identity. */
interface MemoryListParams {
  pageSize: number;
  q?: string;
  sort?: string;
}

/** A memory list page set, tagged with the query it answers. */
interface MemoryListData<TItem, TSort extends string = string> extends ReplicaPagedData<
  TItem,
  number
> {
  q?: string;
  sort?: TSort;
}

type StoreField = keyof UserMemoryStore & string;

interface MemoryQueryListOptions<TParams extends MemoryListParams, TItem, TData> {
  /** Devtools prefix of the replica writes. */
  actionPrefix: string;
  /** Store field holding the active query's entry key. */
  activeKeyField: StoreField;
  /** Store field holding every page set by entry key (the replica view). */
  entriesField: StoreField;
  /** One server page; `page` is 1-based. */
  fetchPage: (params: TParams, page: number) => Promise<{ items: TItem[]; total: number }>;
  get: () => UserMemoryStore;
  /**
   * The flat fields existing consumers read, mirrored from the active query's
   * page set (`undefined` = the active query has no view yet).
   */
  mirror: (data: TData | undefined) => Partial<UserMemoryStore>;
  /** Plain UI fields of a newly selected query (search / sort descriptors). */
  queryFields: (params: Omit<TParams, 'pageSize'>) => Partial<UserMemoryStore>;
  /** Store field holding the replica bookkeeping slot. */
  replicaField: StoreField;
  resource: ReplicaResource<TParams, TData, ReplicaPageResult<TItem, number>>;
  /** SWR key root the resource adopts as its sync key (`userMemoryKeys.<list>.root`). */
  rootKey: string;
  set: StoreSetter<UserMemoryStore>;
  /** `useUserMemoryStore`, passed in so this module never imports the store at runtime. */
  useStore: <T>(selector: (state: UserMemoryStore) => T) => T;
}

/**
 * One offset-paged memory list (activities, contexts, experiences,
 * preferences), shared so every list behaves the same:
 *
 * - **One entry per query.** Each search / sort is its own replica entry
 *   (`memoryListKey`), so a query switch keeps the previous query's pages and
 *   persisted row, and every query paints its own cached head on the first
 *   frame. The flat store fields mirror the active query's entry.
 * - **Bounded.** At most `MAX_RECENT_MEMORY_QUERIES` query page sets
 *   survive, in memory and in IndexedDB, across reloads too.
 * - **Delete / load more / purge** go through {@link OffsetListPager}.
 * - **Edits** patch every loaded and persisted query (`linkReplicaEntity`).
 */
export class MemoryQueryList<
  TParams extends MemoryListParams,
  TItem extends { id: string },
  TData extends MemoryListData<TItem>,
> {
  readonly #list;
  readonly #options: MemoryQueryListOptions<TParams, TItem, TData>;

  constructor(options: MemoryQueryListOptions<TParams, TItem, TData>) {
    this.#options = options;
    const { activeKeyField, entriesField, get, mirror, replicaField, resource, set } = options;
    const entries = recordLens<UserMemoryStore, TData>(entriesField);
    const isActive = (state: UserMemoryStore, key: string) => state[activeKeyField] === key;

    // The canonical value is one page set per query; the flat fields mirror
    // the active query's entry in the same commit as any write to it.
    const lens: ReplicaLens<UserMemoryStore, TData> = {
      clear: (state) => ({ ...entries.clear(state), ...mirror(undefined) }),
      get: entries.get,
      keys: entries.keys,
      set: (state, key, data) => ({
        ...entries.set(state, key, data),
        ...(isActive(state, key) ? mirror(data) : undefined),
      }),
    };

    this.#list = createReplicaSlice(resource, {
      actionPrefix: options.actionPrefix,
      fetcher: async (params, cursor) => {
        const page = await options.fetchPage(params, (cursor ?? 0) + 1);
        return { items: page.items, total: page.total };
      },
      get,
      set,
      stateKey: replicaField,
      view: lens,
      // Keep each painted page set self-describing (which query it answers).
      viewFields: ({ q, sort }) => ({ q: q || undefined, sort }) as Partial<TData>,
    });
    linkReplicaEntity<TItem>([this.#list]);
    new OffsetListPager({
      keys: () => Object.keys(get()[entriesField] as Record<string, TData>),
      read: (key) => (get()[entriesField] as Record<string, TData>)[key],
      refreshHead: this.#revalidate,
      scope: () => resource.scope.get(),
      slice: this.#list,
    });
  }

  /**
   * Revalidate the mounted query. The resource syncs under its legacy SWR key
   * (`rootKey`), which the replica's own `revalidate()` (it matches
   * `replica:sync` keys only) never reaches. The bare matcher form resolves
   * once the refetch settled.
   */
  #revalidate = (): Promise<unknown> =>
    mutate((key) => Array.isArray(key) && key[0] === this.#options.rootKey);
}
