/**
 * The server opens a Channel alongside some creations (a new project's default Channel, a new
 * Agent's direct conversation); refetch the Channel list instead of waiting for its idle poll.
 * The Channel store loads on demand, so callers outside Channels do not pull it in.
 */
export const refreshChannelList = (): void => {
  void import('@/store/channel')
    .then(({ channelActions }) => channelActions.refreshList())
    .catch((error) => console.error('[channel] failed to refresh the Channel list', error));
};
