import { CURRENT_VERSION, isDesktop } from '@lobechat/const';
import { type PluginItem } from '@lobehub/market-sdk';
import { type ToolManifest } from '@lobot/types';
import { type TRPCClientError } from '@trpc/client';
import debug from 'debug';
import { omit } from 'es-toolkit/compat';
import { produce } from 'immer';
import { gt, valid } from 'semver';

import { type MCPErrorData } from '@/libs/mcp/types';
import { parseStdioErrorMessage } from '@/libs/mcp/types';
import { renderMcpArgs, renderMcpUrlTemplate } from '@/libs/mcp/urlTemplate';
import {
  createReplicaSlice,
  type ReplicaLens,
  type ReplicaPageResult,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { discoverService } from '@/services/discover';
import { mcpService } from '@/services/mcp';
import { pluginService } from '@/services/plugin';
import { globalHelpers } from '@/store/global/helpers';
import { mcpStoreSelectors } from '@/store/tool/selectors';
import { type StoreSetter } from '@/store/types';
import { McpConnectionType } from '@/types/discover';
import {
  type CheckMcpInstallResult,
  type McpConnectionParams,
  type MCPErrorInfo,
  type MCPInstallProgress,
} from '@/types/plugins';
import { MCPInstallStep } from '@/types/plugins';
import { ConnectorOAuthError, openConnectorOAuthPopup } from '@/utils/connectorOAuth';
import { getPlatform } from '@/utils/platform';
import { sleep } from '@/utils/sleep';
import { setNamespace } from '@/utils/storeDebug';

import { type ToolStore } from '../../store';
import { pluginSelectors } from '../plugin/selectors';
import { type MCPPluginListData, type MCPStoreState } from './initialState';
import { installOAuthPlugin } from './installOAuthPlugin';
import { MCP_PLUGIN_LIST_KEY, type MCPPluginListParams, mcpPluginListResource } from './projection';

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
