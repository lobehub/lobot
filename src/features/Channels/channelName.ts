/** Title the server gives the Channel a project starts with; members can rename it. */
export const DEFAULT_CHANNEL_TITLE = 'General';

/** Whether a project Channel still carries the default title, so its project's name stands in. */
export const isProjectDefaultChannel = (
  channel: { projectId?: string | null; title: string },
  projectName: string | undefined,
): projectName is string =>
  !!channel.projectId && !!projectName && channel.title === DEFAULT_CHANNEL_TITLE;

/**
 * The name a group Channel goes by: a project's default Channel is named after the project, every
 * other Channel (including one renamed from the default) by its own title.
 */
export const groupChannelName = (
  channel: { projectId?: string | null; title: string },
  projectName: string | undefined,
): string => (isProjectDefaultChannel(channel, projectName) ? projectName : channel.title);
