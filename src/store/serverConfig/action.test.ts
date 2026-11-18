import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { globalService } from '@/services/global';
import { type GlobalRuntimeConfig } from '@/types/serverConfig';
import { merge } from '@/utils/merge';
import { withSWR } from '~test-utils';

import { createServerConfigStore, type ServerConfigStore } from './store';

vi.mock('@/services/global', () => ({
  globalService: { getGlobalConfig: vi.fn() },
}));

// Fresh-state store per test: the app keeps one singleton, so reset its state
// to the defaults merged with the given initial state.
const serverConfigStore = createServerConfigStore();
const defaultServerConfigState = serverConfigStore.getState();
const initServerConfigStore = (initState: Partial<ServerConfigStore>) => {
  serverConfigStore.setState(merge(defaultServerConfigState, initState), true);
  return serverConfigStore;
};

const getGlobalConfig = vi.mocked(globalService.getGlobalConfig);

const mockGlobalConfig: GlobalRuntimeConfig = {
  serverConfig: {
    telemetry: {
      langfuse: undefined,
    },
    aiProvider: {},
  },
  serverFeatureFlags: {
    enableDevDock: true,
    enableWebrtc: true,
  },
} as any;

const renderInit = (store: typeof serverConfigStore) =>
  renderHook(() => store.getState().useInitServerConfig(), { wrapper: withSWR });

beforeEach(() => {
  vi.clearAllMocks();
  getGlobalConfig.mockResolvedValue(mockGlobalConfig);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ServerConfigAction', () => {
  describe('useInitServerConfig', () => {
    it('should update store state on successful fetch', async () => {
      const store = initServerConfigStore({});

      renderInit(store);

      await waitFor(() => expect(store.getState().serverConfigLoaded).toBe(true));
      const state = store.getState();
      expect(state.serverConfigInit).toBe(true);
      expect(state.serverConfig).toEqual(mockGlobalConfig.serverConfig);
      expect(state.featureFlags).toEqual(mockGlobalConfig.serverFeatureFlags);
      expect(state.canAccessDevDock).toBe(true);
      expect(getGlobalConfig).toHaveBeenCalledTimes(1);
    });

    it('should mark server config as initialized when the fetch fails', async () => {
      getGlobalConfig.mockRejectedValue(new Error('network error'));

      const store = initServerConfigStore({});

      renderInit(store);

      await waitFor(() => expect(store.getState().serverConfigInit).toBe(true));
      // The fallback is not a loaded config: consumers that prune data
      // against server-gated catalogs must keep waiting.
      expect(store.getState().serverConfigLoaded).toBe(false);
      expect(store.getState().serverConfig).toEqual({ aiProvider: {}, telemetry: {} });
      expect(store.getState().canAccessDevDock).toBe(false);
    });

    it('should set serverConfig and featureFlags correctly', async () => {
      getGlobalConfig.mockResolvedValue({
        serverConfig: {
          telemetry: { langfuse: { publicKey: 'test-key' } },
          aiProvider: {},
        },
        serverFeatureFlags: {
          enableDevDock: false,
          enableWebrtc: false,
        },
      } as any);

      const store = initServerConfigStore({});

      renderInit(store);

      await waitFor(() => expect(store.getState().serverConfigLoaded).toBe(true));
      expect(store.getState().canAccessDevDock).toBe(false);
    });

    // A later answer would overwrite `featureFlags` and drop DevDock overrides.
    it('does not refetch once the config has loaded', async () => {
      const store = initServerConfigStore({});

      const { result } = renderInit(store);
      await waitFor(() => expect(store.getState().serverConfigLoaded).toBe(true));

      await result.current.revalidate();

      expect(getGlobalConfig).toHaveBeenCalledTimes(1);
    });
  });
});
