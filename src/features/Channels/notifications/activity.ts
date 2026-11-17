import type { ChannelListItem } from '@lobechat/types';

/**
 * Which Channel activity raises a desktop notification:
 * - `all`: every new message someone else posts;
 * - `mentions`: @mentions of the user, plus direct conversations;
 * - `off`: none (the in-app unread counts still update).
 */
export type ChannelNotificationLevel = 'all' | 'mentions' | 'off';

/** A burst (reconnect, many Channels at once) announces this many and stays quiet about the rest. */
export const MAX_CHANNEL_BANNERS_PER_UPDATE = 3;

interface ChannelActivitySnapshot {
  lastAt: number;
  mentions: number;
  unread: number;
}

export type ChannelActivitySnapshots = Map<string, ChannelActivitySnapshot>;

export interface ChannelActivityEvent {
  channel: ChannelListItem;
  kind: 'mention' | 'message';
}

const time = (value: Date | string | null | undefined) => (value ? new Date(value).getTime() : 0);

export const snapshotChannels = (list: ChannelListItem[]): ChannelActivitySnapshots =>
  new Map(
    list.map((channel) => [
      channel.id,
      {
        lastAt: time(channel.lastMessage?.createdAt ?? channel.updatedAt),
        mentions: channel.mentionCount ?? 0,
        unread: channel.unreadCount ?? 0,
      },
    ]),
  );

/** A direct conversation: one person and their bound Agent. */
const isDirect = (channel: ChannelListItem) => !!channel.agentId && !channel.projectId;

interface DiffParams {
  level: ChannelNotificationLevel;
  list: ChannelListItem[];
  /** `undefined` on the first load: that load only sets the baseline, it announces nothing. */
  previous: ChannelActivitySnapshots | undefined;
  /** The Channel on screen while the window has focus; the user is already reading it. */
  readingChannelId?: string;
}

/**
 * The Channel activity worth a notification since the previous list: unread messages or
 * @mentions that grew. Counts only grow from other people's messages, so the user's own
 * sends never notify; reading a Channel lowers them and announces nothing.
 */
export const diffChannelActivity = ({
  level,
  list,
  previous,
  readingChannelId,
}: DiffParams): ChannelActivityEvent[] => {
  if (!previous || level === 'off') return [];

  const events: ChannelActivityEvent[] = [];
  for (const channel of list) {
    if (channel.status === 'archived' || channel.id === readingChannelId) continue;

    const before = previous.get(channel.id);
    const unread = channel.unreadCount ?? 0;
    const mentions = channel.mentionCount ?? 0;
    // A Channel new to the list (someone just added the user) counts from zero.
    const mentioned = mentions > (before?.mentions ?? 0);
    const newMessage =
      unread > (before?.unread ?? 0) &&
      time(channel.lastMessage?.createdAt ?? channel.updatedAt) > (before?.lastAt ?? 0);

    if (mentioned) events.push({ channel, kind: 'mention' });
    else if (newMessage && (level === 'all' || isDirect(channel)))
      events.push({ channel, kind: 'message' });
  }

  // Mentions first, then the most recent activity.
  return events
    .sort(
      (a, b) =>
        Number(b.kind === 'mention') - Number(a.kind === 'mention') ||
        time(b.channel.lastMessage?.createdAt) - time(a.channel.lastMessage?.createdAt),
    )
    .slice(0, MAX_CHANNEL_BANNERS_PER_UPDATE);
};
