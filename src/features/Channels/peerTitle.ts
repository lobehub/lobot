import type { ChannelDetail } from '@lobechat/types';

/**
 * A conversation between two people is titled with whoever the viewer talks to: the stored
 * title names the other person only for the one who opened it.
 */
export const channelTitle = (
  detail: Pick<ChannelDetail, 'channel' | 'members'>,
  viewerId: string | undefined,
): string => {
  if (!detail.channel.peerUserId) return detail.channel.title;
  const other = detail.members.find(
    (member) => member.actorType === 'user' && member.userId && member.userId !== viewerId,
  );
  return other?.userName || other?.username || other?.name || detail.channel.title;
};
