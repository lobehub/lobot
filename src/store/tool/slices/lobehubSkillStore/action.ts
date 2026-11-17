import { getLobehubSkillProviderById } from '@lobechat/const';
import { produce } from 'immer';

import {
  cacheScope,
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  type ReplicaLens,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { toolsClient } from '@/libs/trpc/client';
import { type StoreSetter } from '@/store/types';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';
import { isSkillConnectionError } from '@/types/skillConnectionError';
import { type ConnectorActionError, toConnectorActionError } from '@/utils/connectorActionError';
import { setNamespace } from '@/utils/storeDebug';

import { type ToolStore } from '../../store';
import { type LobehubSkillStoreState } from './initialState';
import {
  createLobehubSkillLocalIntent,
  LOBEHUB_SKILL_SERVERS_KEY,
  type LobehubSkillLocalIntent,
  lobehubSkillProviderToolsResource,
  lobehubSkillServersEntity,
  lobehubSkillServersResource,
  mapProviderTools,
  mergeLobehubSkillServers,
} from './projection';
import {
  type CallLobehubSkillToolParams,
  type CallLobehubSkillToolResult,
  type LobehubSkillServer,
  type LobehubSkillTool,
} from './types';
import { LobehubSkillStatus } from './types';

const n = setNamespace('lobehubSkillStore');

/**
 * LobeHub Skill Store Actions
 */

/** The connections list is one entry, so every sync shares these params. */
const SERVERS_PARAMS = {} as Record<string, never>;

/**
 * The connections list keeps its long-standing flat `lobehubSkillServers` field
 * as the replica view, so every selector reads what it did. `undefined` means
 * "not loaded yet": the engine only hydrates an empty slot, so an empty-array
 * default would read as a real value and block the persisted row.
 */
const serversLens: ReplicaLens<ToolStore, LobehubSkillServer[]> = {
  clear: () => ({ lobehubSkillServers: undefined }),
  get: (state) => state.lobehubSkillServers,
  keys: (state) => (state.lobehubSkillServers ? [LOBEHUB_SKILL_SERVERS_KEY] : []),
  set: (_state, _key, data) => ({ lobehubSkillServers: data }),
};

/** The connections sync, plus the `mutate` alias the skills surfaces call. */
interface LobehubSkillConnectionsSyncResult extends ReplicaSyncResult {
  /**
   * Nothing has been painted yet (no persisted row, no response) and a sync is
   * in flight. This is the `isLoading` the callers gated on before the replica
   * — it must stay on the public surface: a caller that reads "un-loaded" as
   * "empty" would flash a false state on a cold start (see `ToolAuthAlert`).
   */
  isLoading: boolean;
  /** Alias of `revalidate`, kept for the existing "reload skills" control. */
  mutate: () => Promise<unknown>;
}

type Setter = StoreSetter<ToolStore>;
export const createLobehubSkillStoreSlice = (set: Setter, get: () => ToolStore, _api?: unknown) =>
  new LobehubSkillStoreActionImpl(set, get, _api);

class LobehubSkillStoreActionImpl {
  #intent = createLobehubSkillLocalIntent();
  #intentScope?: string;
  /**
   * The user's connected providers — a `local-replica` list, so the
   * persisted row paints before the network answers and a connect / revoke shows
   * on the row at once.
   */
  readonly #servers;

  constructor(set: Setter, get: () => ToolStore, _api?: unknown) {
    void _api;
    this.#servers = createReplicaSlice(lobehubSkillServersResource, {
      actionPrefix: 'lobehubSkillServers',
      entity: lobehubSkillServersEntity,
      fetcher: () => this.#fetchServers(),
      get,
      // A list response replaces the whole value; merge local intent the
      // response predates so an in-flight sync cannot drop a just-connected
      // provider or resurrect a just-revoked one. The confirmed value is passed
      // in too, so a response without a tool catalog keeps the tools the row
      // already holds (see `mergeLobehubSkillServers`).
      merge: (incoming, confirmed) =>
        mergeLobehubSkillServers(incoming, this.#localIntent(), confirmed),
      set,
      stateKey: 'lobehubSkillServersReplica',
      view: serversLens,
    });
    linkReplicaEntity<LobehubSkillServer>([this.#servers]);
    createReplicaSlice(lobehubSkillProviderToolsResource, {
      actionPrefix: 'lobehubSkillProviderTools',
      fetcher: async (provider) => {
        const response = await toolsClient.market.connectListTools.query({ provider });
        return mapProviderTools(response.tools);
      },
      get,
      set,
      stateKey: 'lobehubSkillToolsReplica',
      view: recordLens<ToolStore, LobehubSkillTool[]>('lobehubSkillToolsMap'),
    });
  }

  /**
   * Local intent of the active identity. Kept per scope: the intent is about
   * this user's unsynced writes, so a workspace / user switch starts clean
   * rather than carrying the previous identity's pending rows over.
   */
  #localIntent = (): LobehubSkillLocalIntent => {
    const scope = cacheScope.get();
    if (scope !== this.#intentScope) {
      this.#intentScope = scope;
      this.#intent = createLobehubSkillLocalIntent();
    }
    return this.#intent;
  };

  /** The user's connected providers (`connectListConnections`). */
  #fetchServers = async (): Promise<LobehubSkillServer[]> => {
    const response = await toolsClient.market.connectListConnections.query();

    return response.connections.map((conn: any) => {
      // Get provider config from local definition for correct display name
      const providerConfig = getLobehubSkillProviderById(conn.providerId);
      return {
        cachedAt: Date.now(),
        icon: conn.icon,
        identifier: conn.providerId,
        isConnected: true,
        // Use local config label (e.g., "Linear") instead of API's providerName (which is user's name on that service)
        name: providerConfig?.label || conn.providerId,
        providerUsername: conn.providerUsername,
        scopes: conn.scopes,
        status: LobehubSkillStatus.CONNECTED,
        tokenExpiresAt: conn.tokenExpiresAt,
      };
    });
  };
}

export type LobehubSkillStoreAction = Pick<
  LobehubSkillStoreActionImpl,
  keyof LobehubSkillStoreActionImpl
>;
