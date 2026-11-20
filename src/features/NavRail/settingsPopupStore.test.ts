import { afterEach, describe, expect, it } from 'vitest';

import { SettingsTabs } from '@/store/global/initialState';

import {
  isPersonalSettingsPath,
  parsePersonalSettingsPath,
  resolveSettingsTab,
  useSettingsPopupStore,
} from './settingsPopupStore';

const resetStore = () =>
  useSettingsPopupStore.setState({
    hash: null,
    open: false,
    pending: null,
    subPage: null,
    tab: SettingsTabs.Profile,
  });

describe('resolveSettingsTab', () => {
  it('maps legacy aliases and unknown tabs onto popup tabs', () => {
    expect(resolveSettingsTab()).toBe(SettingsTabs.Profile);
    expect(resolveSettingsTab('common')).toBe(SettingsTabs.Profile);
    expect(resolveSettingsTab('chat-appearance')).toBe(SettingsTabs.Profile);
    expect(resolveSettingsTab('language')).toBe(SettingsTabs.Profile);
    expect(resolveSettingsTab(SettingsTabs.Language)).toBe(SettingsTabs.Profile);
    expect(resolveSettingsTab(SettingsTabs.Appearance)).toBe(SettingsTabs.Appearance);
    expect(resolveSettingsTab('hotkey')).toBe(SettingsTabs.Hotkey);
    expect(resolveSettingsTab('provider')).toBe(SettingsTabs.Profile);
    expect(resolveSettingsTab('devices')).toBe(SettingsTabs.Profile);
  });
});

describe('parsePersonalSettingsPath', () => {
  it('parses personal settings paths, including sub-pages and hashes', () => {
    expect(parsePersonalSettingsPath('/settings')).toEqual({
      hash: null,
      subPage: null,
      tab: SettingsTabs.Profile,
    });
    expect(parsePersonalSettingsPath('/settings/profile/username#x')).toEqual({
      hash: 'x',
      subPage: 'username',
      tab: SettingsTabs.Profile,
    });
    expect(parsePersonalSettingsPath('/settings?tab=appearance')).toEqual({
      hash: null,
      subPage: null,
      tab: SettingsTabs.Profile,
    });
    expect(parsePersonalSettingsPath('/settings/appearance#appearance-theme-mode')).toEqual({
      hash: 'appearance-theme-mode',
      subPage: null,
      tab: SettingsTabs.Profile,
    });
    expect(parsePersonalSettingsPath('/settings/appearance/font')).toEqual({
      hash: null,
      subPage: 'font',
      tab: SettingsTabs.Appearance,
    });
    expect(parsePersonalSettingsPath('/settings/common')).toEqual({
      hash: null,
      subPage: null,
      tab: SettingsTabs.Profile,
    });
  });

  it('ignores channel settings and workspace-prefixed paths', () => {
    expect(parsePersonalSettingsPath('/channels/chn_1/settings')).toBeNull();
    expect(parsePersonalSettingsPath('/acme/settings/profile')).toBeNull();
    expect(parsePersonalSettingsPath('/acme/settings/general')).toBeNull();
    expect(isPersonalSettingsPath('/settings/about')).toBe(true);
    expect(isPersonalSettingsPath('/channels/chn_1/settings')).toBe(false);
  });
});

describe('useSettingsPopupStore', () => {
  afterEach(() => {
    resetStore();
  });

  it('opens a tab and sub-page, and queues a deep link until flush', () => {
    const { openSettings, queueOpen, flushPending, closeSubPage, closeSettings } =
      useSettingsPopupStore.getState();

    openSettings({ subPage: 'font', tab: SettingsTabs.Appearance });
    expect(useSettingsPopupStore.getState()).toMatchObject({
      open: true,
      subPage: 'font',
      tab: SettingsTabs.Appearance,
    });

    closeSubPage();
    expect(useSettingsPopupStore.getState()).toMatchObject({
      subPage: null,
      tab: SettingsTabs.Profile,
    });

    openSettings({ tab: SettingsTabs.Appearance });
    expect(useSettingsPopupStore.getState().tab).toBe(SettingsTabs.Profile);

    closeSettings();
    expect(useSettingsPopupStore.getState().open).toBe(false);

    queueOpen({ subPage: 'username', tab: SettingsTabs.Profile });
    expect(useSettingsPopupStore.getState()).toMatchObject({
      open: false,
      pending: { subPage: 'username', tab: SettingsTabs.Profile },
    });

    flushPending();
    expect(useSettingsPopupStore.getState()).toMatchObject({
      open: true,
      pending: null,
      subPage: 'username',
      tab: SettingsTabs.Profile,
    });
  });
});
