import { CURRENT_VERSION, isDesktop } from '@lobechat/const';
import {
  getMcpServerFingerprint,
  isSyncedMcpToolVisibleTo,
  type McpServerAddress,
} from '@lobechat/const/mcpApp';
import { isLocalOrPrivateUrl, safeParseJSON } from '@lobechat/utils';
import { deserializeMcpIpcPayload, serializeMcpIpcPayload } from '@lobechat/utils/mcpIpcPayload';
import { toRecord } from '@lobechat/utils/object';
import { type PluginManifest } from '@lobehub/market-sdk';
import { type CallReportRequest } from '@lobehub/market-types';
import {
  type ChatToolPayload,
  type CheckMcpInstallResult,
  type CustomPluginMetadata,
} from '@lobot/types';
import { type ReadResourceResult } from '@modelcontextprotocol/client';
import { omit } from 'es-toolkit/compat';

import { type MCPToolCallResult } from '@/libs/mcp';
import { renderMcpArgs, renderMcpUrlTemplate } from '@/libs/mcp/urlTemplate';
import { getMCPConnectionErrorType } from '@/libs/mcp/utils';
import { toolsClient } from '@/libs/trpc/client';
import { serverConfigSelectors } from '@/store/serverConfig/selectors';
import { getServerConfigStoreState } from '@/store/serverConfig/store';
import { ensureElectronIpc } from '@/utils/electron/ipc';

import { discoverService } from './discover';

/** A tool a local MCP server lists, as the desktop main process reports it. */
export interface LocalMcpTool {
  description?: string;
  inputSchema?: Record<string, unknown>;
  name: string;
  /** The tool's MCP Apps `_meta.ui.visibility`, when it declares one. */
  visibility?: string[];
}

const VIEW_SERVER_MOVED = 'This view came from another server than the tool reaches now';
const VIEW_SITE_MISMATCH = "This view's server runs elsewhere than this call would";

/** The user's `mcp_apps` flag: whether sessions on this machine announce MCP Apps. */
const isMcpAppsOn = () => {
  const state = getServerConfigStoreState();
  return !!state && serverConfigSelectors.enableMcpApps(state);
};

class MCPService {
  async getStreamableMcpServerManifest(
    params: {
      auth?: {
        accessToken?: string;
        token?: string;
        type: 'none' | 'bearer' | 'oauth2';
      };
      headers?: Record<string, string>;
      identifier: string;
      metadata?: CustomPluginMetadata;
      url: string;
    },
    signal?: AbortSignal,
  ) {
    // If in Desktop mode and URL is local address, use IPC (main process)
    // This avoids accessing user local services through remote server in production
    if (isDesktop && isLocalOrPrivateUrl(params.url)) {
      // Note: IPC doesn't support AbortSignal yet
      // With MCP Apps on, the tools only views call are listed and kept too
      const serialized = serializeMcpIpcPayload({ ...params, mcpApps: isMcpAppsOn() });
      const serializedResult = await ensureElectronIpc().mcp.getStreamableMcpServerManifest(
        serialized as any,
      );
      return deserializeMcpIpcPayload(serializedResult) as any;
    }

    // Otherwise use toolsClient (via server relay)
    return toolsClient.mcp.getStreamableMcpServerManifest.query(params, { signal });
  }
}

export const mcpService = new MCPService();
