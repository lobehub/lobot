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
 * Previously used for Telegram-style inset pages (Appearance, Language,
 * Profile). Those tabs now use `@lobehub/ui/form` like the rest of settings,
 * so they share the default 1024px card container. Kept as an empty set so
 * existing container / layout lookups stay valid.
 */
export const INSET_TABS = new Set<string>();

export const getSettingsContainerMaxWidth = (tab: string | undefined) => {
  if (tab && FULL_WIDTH_TABS.has(tab)) return '100%';
  if (tab && INSET_TABS.has(tab)) return 720;
  return 1024;
};
