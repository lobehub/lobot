import { type PluginItem } from '@lobehub/market-sdk';
import { type ToolManifest } from '@lobot/types';
import debug from 'debug';

import { createReplicaSlice, type ReplicaLens, type ReplicaPageResult } from '@/libs/replica';
import { discoverService } from '@/services/discover';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { type ToolStore } from '../../store';
import { type MCPPluginListData } from './initialState';
import { type MCPPluginListParams, mcpPluginListResource } from './projection';

const log = debug('lobe-mcp:store:action');

const n = setNamespace('mcpStore');

// Test connection result type
interface TestMcpConnectionResult {
  error?: string;
  /** STDIO process output logs for debugging */
  errorLog?: string;
  manifest?: ToolManifest;
  success: boolean;
}

/**
 * The marketplace list keeps a dedicated `mcpPluginList` field as the replica
 * view. It is `undefined` until the persisted row hydrates or the first network
 * page lands, so an un-loaded list never reads as an empty one — the gate is the
 * field's own default instead of a separate init flag.
 */
const mcpPluginListLens: ReplicaLens<ToolStore, MCPPluginListData> = {
  clear: () => ({ mcpPluginList: undefined }),
  get: (state) => state.mcpPluginList,
  set: (_state, _key, data) => ({ mcpPluginList: data }),
};

type Setter = StoreSetter<ToolStore>;
export const createMCPPluginStoreSlice = (set: Setter, get: () => ToolStore, _api?: unknown) =>
  new PluginMCPStoreActionImpl(set, get, _api);

class PluginMCPStoreActionImpl {
  constructor(set: Setter, get: () => ToolStore, _api?: unknown) {
    void _api;
    createReplicaSlice(mcpPluginListResource, {
      actionPrefix: 'mcpPluginList',
      fetcher: (params, cursor) => this.#fetchMCPPluginListPage(params, cursor),
      get,
      set,
      stateKey: 'mcpPluginListReplica',
      view: mcpPluginListLens,
      viewFields: ({ connectionType, locale, pageSize, q }) => ({
        connectionType,
        locale,
        pageSize,
        q: q || undefined,
      }),
    });
  }

  /** One page of the marketplace list; `cursor` is the page index (0 = head). */
  #fetchMCPPluginListPage = async (
    params: MCPPluginListParams,
    cursor?: number,
  ): Promise<ReplicaPageResult<PluginItem, number>> => {
    const response = await discoverService.getMCPPluginList({
      connectionType: params.connectionType,
      locale: params.locale,
      page: (cursor ?? 0) + 1,
      pageSize: params.pageSize,
      q: params.q,
    });

    return { items: response.items, total: response.totalCount };
  };
}

export type PluginMCPStoreAction = Pick<PluginMCPStoreActionImpl, keyof PluginMCPStoreActionImpl>;
