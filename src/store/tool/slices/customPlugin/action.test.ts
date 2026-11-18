import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mcpService } from '@/services/mcp';
import { type LobeToolCustomPlugin } from '@/types/tool/plugin';

import { useToolStore } from '../../store';

beforeEach(() => {
  vi.resetAllMocks();
});
vi.mock('@/services/plugin', () => ({
  pluginService: {
    updatePlugin: vi.fn(),
    createCustomPlugin: vi.fn(),
    uninstallPlugin: vi.fn(),
    updatePluginManifest: vi.fn(),
    getInstalledPlugins: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/mcp', () => ({
  mcpService: {
    getStreamableMcpServerManifest: vi.fn(),
  },
}));

vi.mock('i18next', () => ({
  t: (_key: string, options?: { error?: string }) => options?.error || 'Plugin refresh failed',
}));

describe('useToolStore:customPlugin', () => {
  describe('reinstallCustomPlugin', () => {
    it('retains the connection failure on the plugin row', async () => {
      const pluginId = 'broken-plugin';
      vi.mocked(mcpService.getStreamableMcpServerManifest).mockRejectedValueOnce({
        cause: 'Connection refused',
        message: 'connectionError',
      });

      act(() => {
        useToolStore.setState({
          installedPlugins: [
            {
              customParams: { mcp: { url: 'https://mcp.example.com' } },
              identifier: pluginId,
              type: 'customPlugin',
            } as LobeToolCustomPlugin,
          ],
          pluginInstallErrors: {},
        });
      });

      const { result } = renderHook(() => useToolStore());

      await act(async () => {
        await result.current.reinstallCustomPlugin(pluginId);
      });

      expect(result.current.pluginInstallErrors[pluginId]).toEqual({
        cause: 'Connection refused',
        message: 'connectionError',
      });
      expect(result.current.pluginInstallLoading[pluginId]).toBe(false);
    });
  });
});
