import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import {
  type FavoriteAgentItem,
  type FavoritePluginItem,
  type FavoriteStatus,
  type FollowCounts,
  type FollowStatus,
  type FollowUserItem,
  type PaginatedResponse,
  type SocialTargetType,
} from '@/services/social';
import { socialService } from '@/services/social';
import { type DiscoverStore } from '@/store/discover';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import {
  favoriteAgentsResource,
  favoritePluginsResource,
  favoriteStatusKey,
  favoriteStatusResource,
  followCountsResource,
  followersResource,
  followingResource,
  followStatusResource,
  socialListKey,
  type SocialListParams,
  socialUserKey,
  type SocialUserParams,
} from './projection';

const n = setNamespace('discover/social');

/**
 * Sync flags of a social read, plus the aliases the old SWR hooks returned
 * (`isLoading` / `mutate`) so a call site only has to move its `data` read to
 * the matching `socialSelectors` entry.
 */
interface SocialSyncResult extends ReplicaSyncResult {
  /** A request is in flight and this entry has no value to show yet. */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
  /** Read the value with `socialSelectors.*(queryKey)`; undefined while disabled. */
  queryKey?: string;
}

type Setter = StoreSetter<DiscoverStore>;

export const createSocialSlice = (set: Setter, get: () => DiscoverStore, _api?: unknown) =>
  new SocialActionImpl(set, get, _api);

class SocialActionImpl {
  constructor(set: Setter, get: () => DiscoverStore, _api?: unknown) {
    void _api;
    createReplicaSlice(followStatusResource, {
      actionPrefix: n('followStatus'),
      get,
      set,
      stateKey: 'followStatusReplica',
      view: recordLens<DiscoverStore, FollowStatus>('followStatusMap'),
    });
    createReplicaSlice(followCountsResource, {
      actionPrefix: n('followCounts'),
      get,
      set,
      stateKey: 'followCountsReplica',
      view: recordLens<DiscoverStore, FollowCounts>('followCountsMap'),
    });
    createReplicaSlice(followersResource, {
      actionPrefix: n('followers'),
      get,
      set,
      stateKey: 'followersReplica',
      view: recordLens<DiscoverStore, PaginatedResponse<FollowUserItem>>('followersMap'),
    });
    createReplicaSlice(followingResource, {
      actionPrefix: n('following'),
      get,
      set,
      stateKey: 'followingReplica',
      view: recordLens<DiscoverStore, PaginatedResponse<FollowUserItem>>('followingMap'),
    });
    createReplicaSlice(favoriteAgentsResource, {
      actionPrefix: n('favoriteAgents'),
      get,
      set,
      stateKey: 'favoriteAgentsReplica',
      view: recordLens<DiscoverStore, PaginatedResponse<FavoriteAgentItem>>('favoriteAgentsMap'),
    });
    createReplicaSlice(favoriteStatusResource, {
      actionPrefix: n('favoriteStatus'),
      get,
      set,
      stateKey: 'favoriteStatusReplica',
      view: recordLens<DiscoverStore, FavoriteStatus>('favoriteStatusMap'),
    });
    createReplicaSlice(favoritePluginsResource, {
      actionPrefix: n('favoritePlugins'),
      get,
      set,
      stateKey: 'favoritePluginsReplica',
      view: recordLens<DiscoverStore, PaginatedResponse<FavoritePluginItem>>('favoritePluginsMap'),
    });
  }
}

export type SocialAction = Pick<SocialActionImpl, keyof SocialActionImpl>;
