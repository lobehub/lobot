import { type FavoriteItem, type FavoriteType, toFavoriteTitle } from '@lobot/types';

import { createReplicaSlice, recordLens } from '@/libs/replica';
import { favoriteService } from '@/services/favorite';
import type { HomeStore } from '@/store/home/store';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { FAVORITE_LIST_KEY, favoriteListResource } from './projection';
import { favoriteSelectors } from './selectors';

const n = setNamespace('favorite');

type FavoriteSnapshot = Partial<Pick<FavoriteItem, 'icon' | 'path' | 'title'>>;

/** Rows added on the client before the server confirmed them. */
export const isOptimisticId = (id: string) => id.startsWith('optimistic:');

const isTarget = (item: FavoriteItem, type: FavoriteType, targetId: string) =>
  item.type === type && item.targetId === targetId;

const RETRY_DELAYS_MS = [1000, 3000];

/** Run a background write, retrying after each delay before giving up. */
const withRetry = async (run: () => Promise<void>): Promise<void> => {
  for (const delay of [...RETRY_DELAYS_MS, undefined]) {
    try {
      return await run();
    } catch (error) {
      if (delay === undefined) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

/** The snapshot fields that differ from the saved row, or undefined when none do. */
const snapshotChanges = (
  item: FavoriteItem,
  snapshot: FavoriteSnapshot,
): FavoriteSnapshot | undefined => {
  const changes = Object.fromEntries(
    Object.entries(snapshot).filter(
      ([key, value]) => value !== undefined && item[key as keyof FavoriteSnapshot] !== value,
    ),
  ) as FavoriteSnapshot;
  return Object.keys(changes).length > 0 ? changes : undefined;
};

type Setter = StoreSetter<HomeStore>;
export const createFavoriteSlice = (set: Setter, get: () => HomeStore, _api?: unknown) =>
  new FavoriteActionImpl(set, get, _api);

class FavoriteActionImpl {
  readonly #get: () => HomeStore;
  readonly #list;
  /** Writes per target reach the server in order, so a quick re-toggle cannot land reversed. */
  readonly #targetQueues = new Map<string, Promise<unknown>>();

  constructor(set: Setter, get: () => HomeStore, _api?: unknown) {
    void _api;
    this.#get = get;
    this.#list = createReplicaSlice(favoriteListResource, {
      actionPrefix: n('favoriteList'),
      fetcher: () => favoriteService.list(),
      get,
      set,
      stateKey: 'favoriteListReplica',
      view: recordLens<HomeStore, FavoriteItem[]>('favoriteListMap'),
    });
  }

  #enqueue = async <T>(type: FavoriteType, targetId: string, run: () => Promise<T>) => {
    const key = `${type}:${targetId}`;
    const previous = this.#targetQueues.get(key) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(run);
    this.#targetQueues.set(key, operation);
    try {
      return await operation;
    } finally {
      if (this.#targetQueues.get(key) === operation) this.#targetQueues.delete(key);
    }
  };

  /**
   * Keep the snapshot of a favorite in step with the page it points at (a
   * renamed topic, a new page emoji). A no-op when nothing changed or the
   * target is not a favorite. Before the list has loaded in this session (a
   * project renamed from its own settings, with the home sidebar never shown)
   * the row is looked up on the server, so the saved title still follows.
   */
  syncFavoriteSnapshot = async (
    type: FavoriteType,
    targetId: string,
    input: FavoriteSnapshot,
  ): Promise<void> => {
    const snapshot =
      input.title === undefined ? input : { ...input, title: toFavoriteTitle(input.title) };

    if (favoriteSelectors.favoriteList(this.#get()) === undefined) {
      // Nothing mounted here retries a missed write, so ride out a brief outage.
      await withRetry(async () => {
        const remote = (await favoriteService.list()).find((row) => isTarget(row, type, targetId));
        const changes = remote && snapshotChanges(remote, snapshot);
        if (remote && changes) await favoriteService.update(remote.id, changes);
      });
      return;
    }

    const item = favoriteSelectors.getFavorite(type, targetId)(this.#get());
    if (!item || isOptimisticId(item.id)) return;

    const changes = snapshotChanges(item, snapshot);
    if (!changes) return;

    await this.#list.optimistic(
      FAVORITE_LIST_KEY,
      (items = []) => items.map((row) => (row.id === item.id ? { ...row, ...changes } : row)),
      () => this.#enqueue(type, targetId, () => favoriteService.update(item.id, changes)),
    );
  };
}

export type FavoriteAction = Pick<FavoriteActionImpl, keyof FavoriteActionImpl>;
