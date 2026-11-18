import { type MarketUserProfile } from '@/layout/AuthProvider/MarketAuth/types';
import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { type MarketSkillPackageFile } from '@/services/marketApi';
import { type DiscoverStore } from '@/store/discover';
import { type StoreSetter } from '@/store/types';
import type {
  AgentForkSourceResponse,
  AgentGroupForkSourceResponse,
  AssistantListResponse,
} from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import {
  agentForkSourceResource,
  agentGroupForkSourceResource,
  type MarketAgentGroupStatus,
  marketAgentGroupStatusResource,
  type MarketAgentStatus,
  marketAgentStatusResource,
  marketUserProfileKey,
  marketUserProfileResource,
  pluginAgentsResource,
  skillPackageFilesResource,
} from './projection';

const n = setNamespace('discover/market');

/** Sync flags of a market read, plus the entry key to read it by. */
interface MarketSyncResult extends ReplicaSyncResult {
  /** A request is in flight and this entry has no value to show yet. */
  isLoading: boolean;
  /** Read the value with `marketSelectors.*(queryKey)`; undefined while disabled. */
  queryKey?: string;
}

type Setter = StoreSetter<DiscoverStore>;

const toSyncResult = (
  sync: ReplicaSyncResult,
  queryKey: string,
  hasValue: boolean,
  active: boolean,
): MarketSyncResult => ({
  ...sync,
  isLoading: active && !hasValue && (!sync.isHydrated || sync.isValidating),
  queryKey: active ? queryKey : undefined,
});

export const createMarketSlice = (set: Setter, get: () => DiscoverStore, _api?: unknown) =>
  new MarketActionImpl(set, get, _api);

class MarketActionImpl {
  readonly #get: () => DiscoverStore;
  readonly #userProfile;

  constructor(set: Setter, get: () => DiscoverStore, _api?: unknown) {
    void _api;
    this.#get = get;
    createReplicaSlice(marketAgentStatusResource, {
      actionPrefix: n('agentStatus'),
      get,
      set,
      stateKey: 'marketAgentStatusReplica',
      view: recordLens<DiscoverStore, MarketAgentStatus>('marketAgentStatusMap'),
    });
    createReplicaSlice(marketAgentGroupStatusResource, {
      actionPrefix: n('agentGroupStatus'),
      get,
      set,
      stateKey: 'marketAgentGroupStatusReplica',
      view: recordLens<DiscoverStore, MarketAgentGroupStatus>('marketAgentGroupStatusMap'),
    });
    createReplicaSlice(agentForkSourceResource, {
      actionPrefix: n('agentForkSource'),
      get,
      set,
      stateKey: 'agentForkSourceReplica',
      view: recordLens<DiscoverStore, AgentForkSourceResponse>('agentForkSourceMap'),
    });
    createReplicaSlice(agentGroupForkSourceResource, {
      actionPrefix: n('agentGroupForkSource'),
      get,
      set,
      stateKey: 'agentGroupForkSourceReplica',
      view: recordLens<DiscoverStore, AgentGroupForkSourceResponse>('agentGroupForkSourceMap'),
    });
    createReplicaSlice(pluginAgentsResource, {
      actionPrefix: n('pluginAgents'),
      get,
      set,
      stateKey: 'pluginAgentsReplica',
      view: recordLens<DiscoverStore, AssistantListResponse>('pluginAgentsMap'),
    });
    createReplicaSlice(skillPackageFilesResource, {
      actionPrefix: n('skillPackageFiles'),
      get,
      set,
      stateKey: 'skillPackageFilesReplica',
      view: recordLens<DiscoverStore, MarketSkillPackageFile[]>('skillPackageFilesMap'),
    });
    this.#userProfile = createReplicaSlice(marketUserProfileResource, {
      actionPrefix: n('userProfile'),
      get,
      // No Market profile for this username (any more): drop the entry and its
      // persisted row instead of painting the old profile.
      isMissing: (profile) => profile === null,
      set,
      stateKey: 'marketUserProfileReplica',
      view: recordLens<DiscoverStore, MarketUserProfile>('marketUserProfileMap'),
    });
  }

  /**
   * The signed-in viewer's Market profile. Read it with
   * `marketSelectors.userProfile(queryKey)`; `undefined` while unloaded or when
   * the account has no Market profile yet.
   */
  useMarketUserProfile = (username: string | null | undefined): MarketSyncResult => {
    const active = !!username;
    const params = { username: username ?? '' };
    const queryKey = marketUserProfileKey(params);
    const sync = this.#userProfile.useSync(active ? params : null, {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    });
    return toSyncResult(
      sync,
      queryKey,
      active && this.#get().marketUserProfileMap[queryKey] !== undefined,
      active,
    );
  };

  /** Write a profile the server just returned from an edit, memory and persisted row. */
  setMarketUserProfile = (username: string, profile: MarketUserProfile): void => {
    this.#userProfile.update(marketUserProfileKey({ username }), () => profile);
  };
}

export type MarketAction = Pick<MarketActionImpl, keyof MarketActionImpl>;
