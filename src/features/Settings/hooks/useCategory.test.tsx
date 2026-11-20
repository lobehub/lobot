import { cleanup, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mapFeatureFlagsEnvToState } from '@/config/featureFlags';
import { SettingsTabs } from '@/store/global/initialState';
import { createServerConfigStore, Provider } from '@/store/serverConfig/store';

import { SettingsGroupKey, useCategory } from './useCategory';

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: vi.fn(() => null), removeItem: vi.fn(), setItem: vi.fn() },
  });
});

const renderCategory = (featureFlags: Record<string, boolean> = {}) => {
  // The server config store is a singleton: reset its flags for every render.
  const store = createServerConfigStore();
  store.setState({
    featureFlags: { ...mapFeatureFlagsEnvToState({}), ...featureFlags },
    serverConfig: { aiProvider: {}, enableBusinessFeatures: true, telemetry: {} } as any,
  });

  return renderHook(() => useCategory(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider createStore={() => store}>{children}</Provider>
    ),
  }).result.current;
};

afterEach(() => cleanup());

describe('settings useCategory', () => {
  it('lists only the everyday sections, in two groups', () => {
    const groups = renderCategory();

    expect(groups.map((group) => group.key)).toEqual([
      SettingsGroupKey.General,
      SettingsGroupKey.System,
    ]);
    expect(groups[1].items.map((item) => item.key)).toEqual([SettingsTabs.About]);
    expect(groups[0].items.map((item) => item.key)).not.toContain(SettingsTabs.Appearance);
    expect(groups[0].items.map((item) => item.key)).toContain(SettingsTabs.Notification);
    expect(groups[0].items.map((item) => item.key)).toContain(SettingsTabs.Hotkey);
  });

  it('never offers configuration surfaces such as providers, skills, OAuth apps or labs', () => {
    const keys = renderCategory({ showApiKeyManage: true, showProvider: true }).flatMap((group) =>
      group.items.map((item) => item.key),
    );

    for (const hidden of [
      SettingsTabs.Provider,
      SettingsTabs.Skill,
      SettingsTabs.OAuthApps,
      SettingsTabs.APIKey,
      SettingsTabs.Plans,
      SettingsTabs.Labs,
      SettingsTabs.Advanced,
    ])
      expect(keys).not.toContain(hidden);
  });

  it('hides About when docs are hidden', () => {
    const keys = renderCategory({ hideDocs: true }).flatMap((group) =>
      group.items.map((item) => item.key),
    );

    expect(keys).not.toContain(SettingsTabs.About);
  });
});
