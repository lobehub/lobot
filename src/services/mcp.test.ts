import { type ToolManifest } from '@lobot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mcpService } from './mcp';

const mockElectronIpc = {
  mcp: {
    getStreamableMcpServerManifest: vi.fn(),
  },
};

const environment = vi.hoisted(() => ({
  isDesktop: false,
}));

vi.mock('@/store/serverConfig/store', () => ({
  getServerConfigStoreState: () => ({
    featureFlags: { enableMcpApps: false },
    serverConfig: {},
  }),
}));

// Mock dependencies. Spread the real module so the other exports stay available.
vi.mock('@lobechat/const', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  CURRENT_VERSION: '1.0.0',
  get isDesktop() {
    return environment.isDesktop;
  },
}));

vi.mock('@lobechat/utils', () => ({
  isLocalOrPrivateUrl: vi.fn((url: string) => {
    return url.includes('127.0.0.1') || url.includes('localhost') || url.includes('192.168.');
  }),
  safeParseJSON: vi.fn((str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }),
}));

vi.mock('@/libs/trpc/client', () => ({
  toolsClient: {
    mcp: {
      getStreamableMcpServerManifest: {
        query: vi.fn(),
      },
    },
  },
}));

vi.mock('@/utils/electron/ipc', () => ({
  ensureElectronIpc: () => mockElectronIpc,
}));

vi.mock('./discover', () => ({
  discoverService: {},
}));

describe('MCPService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    environment.isDesktop = false;
  });

  describe('getStreamableMcpServerManifest', () => {
    it('should use toolsClient for streamable URLs when not on desktop', async () => {
      const { toolsClient } = await import('@/libs/trpc/client');
      const mockManifest: ToolManifest = {
        identifier: 'streamable-server',
        version: '1',
        meta: { title: 'Streamable MCP Server', avatar: '🌐' },
        api: [
          {
            name: 'test',
            description: 'Test API',
            parameters: { type: 'object', properties: {} },
          },
        ],
      };
      vi.mocked(toolsClient.mcp.getStreamableMcpServerManifest.query).mockResolvedValue(
        mockManifest,
      );

      const params = {
        identifier: 'streamable-server',
        url: 'http://127.0.0.1:3000/manifest',
        auth: { type: 'none' as const },
      };

      const result = await mcpService.getStreamableMcpServerManifest(params);

      expect(result).toEqual(mockManifest);
      expect(toolsClient.mcp.getStreamableMcpServerManifest.query).toHaveBeenCalledWith(params, {
        signal: undefined,
      });
    });

    it('should use toolsClient for remote URLs', async () => {
      const { toolsClient } = await import('@/libs/trpc/client');
      const mockManifest: ToolManifest = {
        identifier: 'remote-server',
        version: '1',
        meta: { title: 'Remote MCP Server', avatar: '🌍' },
        api: [
          {
            name: 'remoteTest',
            description: 'Remote Test API',
            parameters: { type: 'object', properties: {} },
          },
        ],
      };
      vi.mocked(toolsClient.mcp.getStreamableMcpServerManifest.query).mockResolvedValue(
        mockManifest,
      );

      const params = {
        identifier: 'remote-server',
        url: 'https://api.example.com/manifest',
        auth: { type: 'bearer' as const, token: 'abc123' },
        headers: { 'X-Custom': 'header' },
      };

      const abortController = new AbortController();
      const result = await mcpService.getStreamableMcpServerManifest(
        params,
        abortController.signal,
      );

      expect(result).toEqual(mockManifest);
      expect(toolsClient.mcp.getStreamableMcpServerManifest.query).toHaveBeenCalledWith(params, {
        signal: abortController.signal,
      });
    });

    it('should handle different URL formats correctly', async () => {
      const { toolsClient } = await import('@/libs/trpc/client');
      const mockManifest: ToolManifest = {
        identifier: 'server',
        version: '1',
        meta: { title: 'URL Test Server', avatar: '🔗' },
        api: [
          {
            name: 'urlTest',
            description: 'URL Test API',
            parameters: { type: 'object', properties: {} },
          },
        ],
      };
      vi.mocked(toolsClient.mcp.getStreamableMcpServerManifest.query).mockResolvedValue(
        mockManifest,
      );

      const params = {
        identifier: 'server',
        url: 'http://localhost:8080/manifest',
        auth: { type: 'none' as const },
      };

      const result = await mcpService.getStreamableMcpServerManifest(params);

      expect(result).toEqual(mockManifest);
      expect(toolsClient.mcp.getStreamableMcpServerManifest.query).toHaveBeenCalled();
    });

    it('should handle OAuth2 authentication', async () => {
      const { toolsClient } = await import('@/libs/trpc/client');
      const mockManifest: ToolManifest = {
        identifier: 'oauth-server',
        version: '1',
        meta: { title: 'OAuth Server', avatar: '🔐' },
        api: [
          {
            name: 'oauthTest',
            description: 'OAuth Test API',
            parameters: { type: 'object', properties: {} },
          },
        ],
      };
      vi.mocked(toolsClient.mcp.getStreamableMcpServerManifest.query).mockResolvedValue(
        mockManifest,
      );

      const params = {
        identifier: 'oauth-server',
        url: 'https://api.oauth.com/manifest',
        auth: {
          type: 'oauth2' as const,
          accessToken: 'access_token_123',
        },
        metadata: {
          avatar: '🔐',
          description: 'OAuth secured API',
          name: 'OAuth API',
        },
      };

      const result = await mcpService.getStreamableMcpServerManifest(params);

      expect(result).toEqual(mockManifest);
      expect(toolsClient.mcp.getStreamableMcpServerManifest.query).toHaveBeenCalledWith(
        params,
        expect.any(Object),
      );
    });
  });
});
