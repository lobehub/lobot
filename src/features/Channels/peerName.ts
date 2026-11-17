import type { ChannelListItem } from '@lobechat/types';

/**
 * The other person in a conversation between two people, as the viewer knows them. The stored
 * title names them only for whoever opened the conversation.
 */
export const peerName = (
  channel: Pick<ChannelListItem, 'memberAvatars' | 'peerUserId' | 'title'>,
): string =>
  channel.memberAvatars?.find((member) => member.id === channel.peerUserId)?.name || channel.title;
