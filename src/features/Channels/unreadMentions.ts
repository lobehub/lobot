import type { ChannelListItem, ChannelPublicMember, ChannelPublicMessage } from '@lobot/types';

import { isCurrentUserAuthor, isCurrentUserMember } from './memberName';

/**
 * Where the viewer had read up to before this visit, from the list row; null when the row is
 * missing or carries no unread mention. Opening the main conversation marks it read at once, so
 * this is taken first: the list counts `unreadCount` as `sequence - lastReadSequence`.
 */
export const readPositionBeforeVisit = (
  listed: Pick<ChannelListItem, 'mentionCount' | 'sequence' | 'unreadCount'> | undefined,
) => {
  if (!listed?.mentionCount || !listed.unreadCount) return null;
  return Math.max(0, listed.sequence - listed.unreadCount);
};

/**
 * The unread stretch a visit opened on: after `readFrom`, up to the listed `sequence` at the time.
 * Messages arriving while the conversation is open are read as they come, so they are not in it.
 * `total` is the listed mention count, Threads included.
 */
export interface UnreadMentionRange {
  readFrom: number;
  total: number;
  upTo: number;
}

/** Loaded messages in the unread range that @mention the viewer, oldest first. */
export const unreadMentionsOf = (
  messages: ChannelPublicMessage[],
  members: Pick<ChannelPublicMember, 'actorType' | 'id' | 'userId'>[],
  userId: string | undefined,
  { readFrom, upTo }: Pick<UnreadMentionRange, 'readFrom' | 'upTo'>,
) => {
  const self = members.find((member) => isCurrentUserMember(member, userId));
  if (!self) return [];
  return messages
    .filter(
      (message) =>
        message.sequence > readFrom &&
        message.sequence <= upTo &&
        !message.deletedAt &&
        message.mentions.includes(self.id) &&
        !isCurrentUserAuthor(message.author, userId),
    )
    .sort((a, b) => a.sequence - b.sequence);
};

/**
 * Whether unread history older than the loaded pages may still hold mentions: the main
 * conversation's page starts after the read position and the server has more.
 */
export const mayHaveEarlierMentions = (
  oldestLoaded: number | undefined,
  hasMore: boolean,
  readFrom: number,
) => hasMore && oldestLoaded !== undefined && oldestLoaded > readFrom + 1;
