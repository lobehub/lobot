import { useSearchParams } from 'react-router';

type ChannelSettingsTab = 'advanced' | 'general' | 'project' | 'reply';

/** The search param that opens a Channel's settings beside its feed, holding the open tab. */
export const CHANNEL_SETTINGS_PARAM = 'settings';

/**
 * An archived Channel takes no writes until it is reopened, so its replies cannot be edited. Only
 * a Channel that belongs to a project shows that project.
 */
export const channelSettingsTabs = (
  archived: boolean,
  hasProject = false,
): ChannelSettingsTab[] => [
  'general',
  ...(hasProject ? (['project'] as const) : []),
  ...(archived ? [] : (['reply'] as const)),
  'advanced',
];

/** The tab of a shared link, or the first tab when it is missing or not available here. */
export const resolveChannelSettingsTab = (
  requested: string | null,
  tabs: ChannelSettingsTab[],
): ChannelSettingsTab => tabs.find((tab) => tab === requested) ?? tabs[0];

/**
 * Opens the settings of the Channel on screen beside its feed. They replace a thread opened beside
 * it; a thread shown as the page stays.
 */
export const useOpenChannelSettings = () => {
  const [, setParams] = useSearchParams();
  return (tab: string = 'general') =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set(CHANNEL_SETTINGS_PARAM, tab);
      if (next.get('view') !== 'page') next.delete('thread');
      return next;
    });
};
