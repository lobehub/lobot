import { describe, expect, it } from 'vitest';

import { DEFAULT_FEATURE_FLAGS, mapFeatureFlagsEnvToState } from '@/config/featureFlags';
import { merge } from '@/utils/merge';

import { featureFlagsSelectors, serverConfigSelectors } from './selectors';
import { createServerConfigStore, type ServerConfigStore } from './store';

// Fresh-state store per test: the app keeps one singleton, so reset its state
// to the defaults merged with the given initial state.
const serverConfigStore = createServerConfigStore();
const defaultServerConfigState = serverConfigStore.getState();
const initServerConfigStore = (initState: Partial<ServerConfigStore>) => {
  serverConfigStore.setState(merge(defaultServerConfigState, initState), true);
  return serverConfigStore;
};

describe('featureFlagsSelectors', () => {
  it('should return feature flags from store', () => {
    const store = initServerConfigStore({
      featureFlags: {
        ...mapFeatureFlagsEnvToState(DEFAULT_FEATURE_FLAGS),
        isAgentEditable: false,
        showProvider: true,
        showMarket: true,
        showAiImage: true,
      },
    });

    const result = featureFlagsSelectors(store.getState());

    expect(result.isAgentEditable).toBe(false);
    expect(result.showProvider).toBe(true);
    expect(result.showMarket).toBe(true);
    expect(result.showAiImage).toBe(true);
  });
});

describe('serverConfigSelectors', () => {
  describe('enableDashboard', () => {
    it('is off by default and on only when the flag resolves to true', () => {
      expect(serverConfigSelectors.enableDashboard(initServerConfigStore({}).getState())).toBe(
        false,
      );
      const on = initServerConfigStore({
        featureFlags: {
          ...mapFeatureFlagsEnvToState({ ...DEFAULT_FEATURE_FLAGS, dashboard: true }),
        },
      });
      expect(serverConfigSelectors.enableDashboard(on.getState())).toBe(true);
    });
  });

  describe('enableGatewayMode', () => {
    it('should return true when gateway mode is enabled', () => {
      const store = initServerConfigStore({
        serverConfig: {
          aiProvider: {},
          enableGatewayMode: true,
          telemetry: {},
        },
      });

      const result = serverConfigSelectors.enableGatewayMode(store.getState());

      expect(result).toBe(true);
    });

    it('should return false when gateway mode is not defined', () => {
      const store = initServerConfigStore({
        serverConfig: {
          aiProvider: {},
          telemetry: {},
        },
      });

      const result = serverConfigSelectors.enableGatewayMode(store.getState());

      expect(result).toBe(false);
    });
  });
});
