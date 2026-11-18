import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { type DiscoverStore } from '@/store/discover';
import { type StoreSetter } from '@/store/types';
import { type DiscoverUserProfile } from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import { userProfileResource } from './projection';

const n = setNamespace('discover/user');

/**
 * Sync flags of a community profile read, plus the aliases the old SWR hook
 * returned (`isLoading` / `mutate`) so a call site only has to move its `data`
 * read to `userSelectors.userProfile(fetchHook.queryKey)`.
 */
interface UserProfileSyncResult extends ReplicaSyncResult {
  /** A request is in flight and this entry has no value to show yet. */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
  /** Read the value with `userSelectors.userProfile(queryKey)`; undefined while disabled. */
  queryKey?: string;
}

type Setter = StoreSetter<DiscoverStore>;

export const createUserSlice = (set: Setter, get: () => DiscoverStore, _api?: unknown) =>
  new UserActionImpl(set, get, _api);

class UserActionImpl {
  readonly #profile;

  constructor(set: Setter, get: () => DiscoverStore, _api?: unknown) {
    void _api;
    this.#profile = createReplicaSlice(userProfileResource, {
      actionPrefix: n('profile'),
      get,
      // The server no longer knows this handle: drop the entry and its
      // persisted row rather than keep serving the cached profile.
      isMissing: (profile) => profile === null,
      set,
      stateKey: 'userProfileReplica',
      view: recordLens<DiscoverStore, DiscoverUserProfile>('userProfileMap'),
    });
  }

  /**
   * Refetch every community profile on screen after the viewer edited their
   * Market profile or claimed resources.
   */
  refreshUserProfiles = async (): Promise<void> => {
    await this.#profile.revalidate();
  };
}

export type UserAction = Pick<UserActionImpl, keyof UserActionImpl>;
