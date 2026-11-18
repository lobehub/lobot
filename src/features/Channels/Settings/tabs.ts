type ChannelSettingsTab = 'advanced' | 'general' | 'project' | 'reply';

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

/** The `?tab=` of a shared link, or the first tab when it is missing or not available here. */
export const resolveChannelSettingsTab = (
  requested: string | null,
  tabs: ChannelSettingsTab[],
): ChannelSettingsTab => tabs.find((tab) => tab === requested) ?? tabs[0];
