import type { ChannelPublicMember, ChannelPublicMessage } from '@lobot/types';

export const memberName = (member: ChannelPublicMember | undefined, fallback: string) =>
  member?.name || member?.userName || member?.username || fallback;

/**
 * The member's own image, if any. A person without one draws the pixel avatar generated from
 * their name (`UserAvatar`), the face the message list shows, never a stock emoji.
 */
export const memberAvatar = (member: ChannelPublicMember | undefined) =>
  (member?.actorType === 'user' ? member.userAvatar : member?.avatar) || undefined;

/** Only the viewer's own human messages may use their live personal avatar. */
export const isCurrentUserAuthor = (
  author: ChannelPublicMessage['author'],
  currentUserId: string | undefined,
) => !!currentUserId && author.type === 'user' && author.id === currentUserId;

/** Mention/menu identities use the same viewer-owned avatar as the timeline. */
export const isCurrentUserMember = (
  member: Pick<ChannelPublicMember, 'actorType' | 'userId'>,
  currentUserId: string | undefined,
) => !!currentUserId && member.actorType === 'user' && member.userId === currentUserId;

export const authorAvatar = (author: ChannelPublicMessage['author']) => author.avatar || undefined;
