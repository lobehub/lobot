import { isDesktop } from '@lobechat/const';
import { isLocalOrPrivateUrl } from '@lobechat/utils';
import { deserializeMcpIpcPayload, serializeMcpIpcPayload } from '@lobechat/utils/mcpIpcPayload';
import { type CustomPluginMetadata } from '@lobot/types';

import { toolsClient } from '@/libs/trpc/client';
import { serverConfigSelectors } from '@/store/serverConfig/selectors';
import { getServerConfigStoreState } from '@/store/serverConfig/store';
import { ensureElectronIpc } from '@/utils/electron/ipc';

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
