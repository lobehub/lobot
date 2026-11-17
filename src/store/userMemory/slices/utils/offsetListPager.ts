import { type ReplicaOptimisticToken, type ReplicaPagedData } from '@/libs/replica';

/** The part of a paged replica slice the pager drives (structural, so any slice fits). */
export interface OffsetPagedSlice {
  beginEntityOptimistic: <TItem>(
    id: string,
    fn: (item: TItem) => TItem | undefined,
  ) => ReplicaOptimisticToken<any>[];
  collapse: (key: string) => unknown;
  loadMore: (key: string) => Promise<void>;
  /** `scope` routes a removal confirmed after an account switch to the scope that asked. */
  removeEntity: (id: string, options?: { scope?: string }) => void;
  update: (key: string, apply: (data: any) => any, options?: { persist?: boolean }) => unknown;
}

interface OffsetListPagerOptions {
  /** Entry keys loaded in memory (every page set a delete may have shifted). */
  keys: () => string[];
  /** The loaded page set of one entry (`undefined` = not loaded). */
  read: (key: string) => ReplicaPagedData<unknown, unknown> | undefined;
  /**
   * Re-read the head page of the mounted query through the list's own SWR key
   * (the awaitable bare `mutate(matcher)` form). Resolves once the refetch
   * settled, whether or not it succeeded.
   */
  refreshHead: () => Promise<unknown>;
  /** The list resource's active scope (the user the store shows). */
  scope: () => string;
  slice: OffsetPagedSlice;
}

/**
 * A delete that waited behind other paging work and found another account
 * active when its turn came. It was not sent: the server call would run with
 * the new account's credentials. The optimistic removal is rolled back.
 */
export class MemoryDeleteScopeChangedError extends Error {
  constructor() {
    super('The account changed before the delete could be sent');
    this.name = 'MemoryDeleteScopeChangedError';
  }
}

/**
 * Delete / "load more" / purge for an offset-paged memory list.
 *
 * The memory lists page by offset (cursor = page index), so a server-side
 * delete shifts every later row one slot up: the next page asked for with the
 * loaded cursor would skip the row that crossed the page boundary. The pager
 * repairs that the same way for every list:
 *
 * - **Delete**: the row leaves every loaded page set at once (optimistic, rolled
 *   back if the server rejects). Once the server confirms, `removeEntity` drops
 *   it from persisted rows too, every loaded page set collapses to its head
 *   and is marked *head-stale*, and the head is refreshed.
 * - **Head-stale guard**: "load more" on a head-stale page set — marked by a
 *   delete in this session, or *short* (fewer rows than its loaded pages hold,
 *   e.g. a persisted variant the delete patched and a later visit hydrated) —
 *   first refreshes the head; it only fetches the next page once a fresh head landed
 *   (`headLanded`). If the refresh fails, the footer shows the failure with a
 *   retry instead of paging from a stale offset.
 * - **Serialization**: deletes, pages and the purge run one after another, so
 *   load-more waits for an in-flight delete + refresh, a delete waits for a
 *   page already in flight (its offset predates the shift), and a purge never
 *   races a page that would land into the emptied list.
 */
export class OffsetListPager {
  constructor({ keys, read, refreshHead, scope, slice }: OffsetListPagerOptions) {}
}
