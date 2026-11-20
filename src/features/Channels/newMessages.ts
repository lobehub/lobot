import type { ChannelListItem, ChannelPublicMessage } from '@lobot/types';

import { isCurrentUserAuthor } from './memberName';

/**
 * Where the viewer had read the main conversation up to before this visit, from the list row;
 * null when nothing was unread. Opening the conversation marks it read at once, so this is taken
 * first: the list counts `unreadCount` as `sequence - lastReadSequence`.
 */
export const unreadFromBeforeVisit = (
  listed: Pick<ChannelListItem, 'sequence' | 'unreadCount'> | undefined,
) => {
  if (!listed?.unreadCount) return null;
  return Math.max(0, listed.sequence - listed.unreadCount);
};

/**
 * The first message of the visit's unread stretch, which the 「新」 divider goes above: the oldest
 * loaded message after `readFrom` that someone else wrote. The viewer's own messages are never news
 * to them. Messages arriving while the conversation is open are read as they come, so the divider
 * marks only what was waiting when it opened (`upTo`).
 */
export const firstNewMessageId = (
  messages: Pick<ChannelPublicMessage, 'author' | 'id' | 'sequence'>[],
  { readFrom, upTo }: { readFrom: number; upTo: number },
  userId: string | undefined,
) =>
  messages.find(
    (message) =>
      message.sequence > readFrom &&
      message.sequence <= upTo &&
      !isCurrentUserAuthor(message.author, userId),
  )?.id;
