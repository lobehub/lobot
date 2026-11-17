import { SettingsTabs } from '@/store/global/initialState';

/**
 * Tabs that draw their own navigation header and container: the split panes
 * (provider, skill) and the connector page that reuses the skill pane. Every
 * other tab renders under the one shared header that shows the tab title.
 * Their skeletons provide a `Page` for the same reason.
 */
export const OWN_FRAME_TABS = new Set<string>([
  SettingsTabs.Connector,
  SettingsTabs.Provider,
  SettingsTabs.Skill,
]);

/** In-frame tabs whose container spans the pane, e.g. a card grid that adds columns as it widens. */
const FULL_WIDTH_TABS = new Set<string>([SettingsTabs.Devices]);

/**
 * Tabs laid out as Telegram-style inset groups: rounded cards straight on the
 * window background (Settings is a detached section, see `isDetachedNavKey`),
 * in a narrower column so label and value stay within one glance. Other tabs
 * keep a white page, drawn as a card by the settings layout.
 */
export const INSET_TABS = new Set<string>([
  SettingsTabs.Appearance,
  SettingsTabs.Language,
  SettingsTabs.Profile,
]);

export const getSettingsContainerMaxWidth = (tab: string | undefined) => {
  if (tab && FULL_WIDTH_TABS.has(tab)) return '100%';
  if (tab && INSET_TABS.has(tab)) return 720;
  return 1024;
};
