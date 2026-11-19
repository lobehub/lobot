import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { SettingsTabs } from '@/store/global/initialState';

/** Tabs the Settings popup can render. Keep in sync with `componentMap`. */
const SETTINGS_POPUP_TABS = new Set<string>([
  SettingsTabs.About,
  SettingsTabs.Appearance,
  SettingsTabs.Hotkey,
  SettingsTabs.Notification,
  SettingsTabs.Profile,
  SettingsTabs.Proxy,
]);

const TAB_ALIASES: Record<string, string> = {
  [SettingsTabs.ChatAppearance]: SettingsTabs.Appearance,
  [SettingsTabs.Common]: SettingsTabs.Appearance,
  [SettingsTabs.Language]: SettingsTabs.Appearance,
};

export interface SettingsPopupTarget {
  hash?: string | null;
  subPage?: string | null;
  tab?: string;
}

export interface SettingsPopupState {
  closeSettings: () => void;
  closeSubPage: () => void;
  flushPending: () => void;
  hash: string | null;
  open: boolean;
  openSettings: (target?: SettingsPopupTarget) => void;
  pending: SettingsPopupTarget | null;
  queueOpen: (target?: SettingsPopupTarget) => void;
  setTab: (tab: string) => void;
  subPage: string | null;
  tab: string;
}

export const resolveSettingsTab = (tab?: string | null): string => {
  if (!tab) return SettingsTabs.Profile;
  const resolved = TAB_ALIASES[tab] ?? tab;
  return SETTINGS_POPUP_TABS.has(resolved) ? resolved : SettingsTabs.Profile;
};

/**
 * Parse a personal settings path such as `/settings/profile/username#anchor`.
 * Channel settings (`/channels/:id/settings`) and any path whose first
 * segment is not `settings` (including workspace-prefixed settings) return
 * `null`.
 */
export const parsePersonalSettingsPath = (input: string): SettingsPopupTarget | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  let hash: string | null = null;
  let search = '';

  const hashIndex = pathname.indexOf('#');
  if (hashIndex >= 0) {
    hash = pathname.slice(hashIndex + 1) || null;
    pathname = pathname.slice(0, hashIndex);
  }

  const queryIndex = pathname.indexOf('?');
  if (queryIndex >= 0) {
    search = pathname.slice(queryIndex + 1);
    pathname = pathname.slice(0, queryIndex);
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'settings') return null;

  const tabFromPath = segments[1];
  const subPage = segments[2] ?? null;
  const tabFromQuery = new URLSearchParams(search).get('tab');

  return {
    hash,
    subPage,
    tab: resolveSettingsTab(tabFromPath || tabFromQuery || SettingsTabs.Profile),
  };
};

export const isPersonalSettingsPath = (input: string): boolean =>
  parsePersonalSettingsPath(input) !== null;

export const openSettingsFromUrl = (input: string): boolean => {
  const target = parsePersonalSettingsPath(input);
  if (!target) return false;
  useSettingsPopupStore.getState().openSettings(target);
  return true;
};

export const useSettingsPopupStore = createWithEqualityFn<SettingsPopupState>()(
  (set, get) => ({
    closeSettings: () => set({ hash: null, open: false, pending: null, subPage: null }),
    closeSubPage: () => set({ hash: null, subPage: null }),
    flushPending: () => {
      const { pending } = get();
      if (!pending) return;
      set({
        hash: pending.hash ?? null,
        open: true,
        pending: null,
        subPage: pending.subPage ?? null,
        tab: resolveSettingsTab(pending.tab),
      });
    },
    hash: null,
    open: false,
    openSettings: (target) => {
      const tab = target?.tab != null ? resolveSettingsTab(target.tab) : get().tab;
      set({
        hash: target?.hash ?? null,
        open: true,
        pending: null,
        subPage: target?.subPage ?? null,
        tab,
      });
    },
    pending: null,
    queueOpen: (target) => {
      set({
        pending: {
          hash: target?.hash ?? null,
          subPage: target?.subPage ?? null,
          tab: resolveSettingsTab(target?.tab),
        },
      });
    },
    setTab: (tab) => set({ hash: null, subPage: null, tab: resolveSettingsTab(tab) }),
    subPage: null,
    tab: SettingsTabs.Profile,
  }),
  shallow,
);
