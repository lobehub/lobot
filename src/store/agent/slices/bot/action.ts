import {
  cacheScope,
  createReplicaSlice,
  recordLens,
  type ReplicaLens,
  type ReplicaSyncResult,
} from '@/libs/replica';
import type { SerializedPlatformDefinition } from '@/server/services/bot/platforms/types';
import { agentBotProviderService } from '@/services/agentBotProvider';
import { type StoreSetter } from '@/store/types';
import type { BotRuntimeStatusSnapshot } from '@/types/botRuntimeStatus';

import { type AgentStore } from '../../store';
import {
  type BotProviderItem,
  botProvidersResource,
  PLATFORM_DEFINITIONS_KEY,
  platformDefinitionsResource,
  withoutBotProviderSecrets,
} from './projection';

export type { BotProviderItem };

/** `useFetchBotProviders` / `useFetchPlatformDefinitions` result: replica flags plus the SWR-era aliases. */
export interface BotSyncResult extends ReplicaSyncResult {
  /** A request is in flight and there is nothing cached to show for this entry yet. */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
}

/** `botProvidersMap` is the view; the replica is its only writer. */
const botProvidersLens = recordLens<AgentStore, BotProviderItem[]>('botProvidersMap');

/**
 * The catalog is one value, not a keyed map, so it keeps its own flat field
 * (`botPlatformDefinitions`) as the replica view.
 */
const platformDefinitionsLens: ReplicaLens<AgentStore, SerializedPlatformDefinition[]> = {
  clear: () => ({ botPlatformDefinitions: undefined }),
  get: (state) => state.botPlatformDefinitions,
  keys: () => [PLATFORM_DEFINITIONS_KEY],
  set: (_state, _key, data) => ({ botPlatformDefinitions: data }),
};

/** The catalog fetch has no params; a stable empty object keeps the entry key constant. */
const PLATFORM_DEFINITIONS_PARAMS = {} as Record<string, never>;

type Setter = StoreSetter<AgentStore>;

export const createBotSlice = (set: Setter, get: () => AgentStore, _api?: unknown) =>
  new BotSliceActionImpl(set, get, _api);

class BotSliceActionImpl {
  constructor(set: Setter, get: () => AgentStore, _api?: unknown) {
    void _api;

    createReplicaSlice(botProvidersResource, {
      actionPrefix: 'botProviders',
      fetcher: async ({ agentId }) => agentBotProviderService.getByAgentId(agentId),
      get,
      set,
      stateKey: 'botProvidersReplica',
      // Cleartext credentials never reach disk: the server can hand one back in
      // the clear (iMessage's `webhookSecret` is an identifier *and* a bearer
      // secret), so the persisted row keeps only the masks. See
      // {@link withoutBotProviderSecrets}.
      toPersisted: withoutBotProviderSecrets,
      view: botProvidersLens,
    });

    createReplicaSlice(platformDefinitionsResource, {
      actionPrefix: 'botPlatformDefinitions',
      fetcher: () => agentBotProviderService.listPlatforms(),
      get,
      set,
      stateKey: 'botPlatformDefinitionsReplica',
      view: platformDefinitionsLens,
    });
  }
}

export type BotSliceAction = Pick<BotSliceActionImpl, keyof BotSliceActionImpl>;
