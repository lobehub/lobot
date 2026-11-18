import type { ChannelDetail } from '@lobot/types';

import { groupChannelName } from './channelName';

/**
 * A conversation between two people is titled with whoever the viewer talks to: the stored
 * title names the other person only for the one who opened it. A project's default Channel is
 * titled with the project's name, the same as its row in the list.
 */
export const channelTitle = (
  detail: Pick<ChannelDetail, 'channel' | 'members'>,
  viewerId: string | undefined,
  projectName?: string,
): string => {
  if (!detail.channel.peerUserId) return groupChannelName(detail.channel, projectName);
  const other = detail.members.find(
    (member) => member.actorType === 'user' && member.userId && member.userId !== viewerId,
  );
  return other?.userName || other?.username || other?.name || detail.channel.title;
};
