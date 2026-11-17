import type {
  ChannelLastMessage,
  ChannelListItem,
  RecentItem,
  SidebarAgentItem,
} from '@lobechat/types';

import { markdownToTxt } from '@/utils/markdownToTxt';

/** A plain left click; modified clicks keep the browser's own handling of the link. */
export const isPlainClick = (
  event: Pick<MouseEvent, 'altKey' | 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export interface Conversation {
  /** Latest activity: the newer of the item itself and its latest topic. */
  activeAt: Date;
  /** The agent's direct Channel, when the row opens it. Carries its own archive / trash actions. */
  channel?: ChannelListItem;
  item: SidebarAgentItem;
  /** One-line preview from the latest topic (assistant reply, else title). */
  preview?: string;
  /** The Thread the previewed message was posted in, when it is a Thread reply. */
  previewThread?: ChannelPreviewThread;
  /** Unread messages of the agent's direct Channel, when the row opens it. */
  unread?: number;
}

interface ConversationSections {
  pinned: Conversation[];
  recent: Conversation[];
}

const recentOwnerId = (recent: RecentItem): string | undefined => {
  if (recent.type !== 'topic') return;
  // Group topics created by `execGroupAgent` persist the supervisor's `agentId`
  // *and* the group route, so the route decides ownership: reading `agentId`
  // first credits the group's replies to the supervisor and the group row never
  // picks up its own activity.
  const groupId = recent.routePath.match(/\/group\/([^/?#]+)/)?.[1];
  return groupId ?? recent.agentId ?? undefined;
};

const toTime = (value: Date | string) => new Date(value).getTime();

const oneLine = (text: string | null | undefined) =>
  (text ?? '').replaceAll(/\s+/g, ' ').trim() || undefined;

/** A Channel's latest message as one line of plain text. */
export const channelPreview = (channel: Pick<ChannelListItem, 'lastMessage'>) =>
  channel.lastMessage ? oneLine(markdownToTxt(channel.lastMessage.content)) : undefined;

export type ChannelPreviewThread = NonNullable<ChannelLastMessage['thread']>;

/**
 * The Thread a Channel's latest message was posted in. The preview names it, or a Thread reply
 * reads like the main conversation's last word. Nothing when that message has no preview text,
 * so a row's fallback line is not credited to a Thread.
 */
export const channelPreviewThread = (
  channel: Pick<ChannelListItem, 'lastMessage'> | undefined,
): ChannelPreviewThread | undefined =>
  channel && channelPreview(channel) ? (channel.lastMessage?.thread ?? undefined) : undefined;

/**
 * A row's preview line: its direct Channel's latest message once it has one, else its latest
 * topic (assistant reply, else title), else its description.
 */
export const conversationPreview = (
  description: string | null | undefined,
  topic: RecentItem | undefined,
  direct?: Pick<ChannelListItem, 'lastMessage'>,
) =>
  direct
    ? (channelPreview(direct) ?? oneLine(description))
    : oneLine(topic?.lastAssistantMessage || topic?.title || description);

/**
 * Pinned by this person atop their own list. The pin lives on their membership of the
 * conversation's Channel, so an Agent's workspace-wide sidebar pin does not pin it here.
 */
export const isPinned = (entry: { channel?: Pick<ChannelListItem, 'pinnedAt'> }) =>
  !!entry.channel?.pinnedAt;

/** When a Channel last had a message, else when it was opened. */
export const channelActivity = (channel: ChannelListItem): Date =>
  new Date(channel.lastMessage?.createdAt ?? channel.updatedAt ?? channel.createdAt);

/** Newest topic per owner (agent id, or the group named by the topic route). */
const topicsByOwner = (recents: RecentItem[] | undefined): Map<string, RecentItem> => {
  const latest = new Map<string, RecentItem>();
  for (const recent of recents ?? []) {
    const owner = recentOwnerId(recent);
    if (!owner) continue;
    const current = latest.get(owner);
    if (!current || toTime(recent.updatedAt) > toTime(current.updatedAt)) latest.set(owner, recent);
  }
  return latest;
};

/**
 * One owner's latest topic. The inbox row is not part of `items`, so it asks
 * for its own activity instead of going through the sections builder.
 */
export const latestTopicOf = (
  recents: RecentItem[] | undefined,
  ownerId: string | undefined,
): RecentItem | undefined => (ownerId ? topicsByOwner(recents).get(ownerId) : undefined);

/** The newer of an entity's own timestamp and its latest topic. */
export const latestActivity = (
  own: Date | string | undefined,
  topic: RecentItem | undefined,
): Date | undefined => {
  const ownTime = own ? toTime(own) : 0;
  const topicTime = topic ? toTime(topic.updatedAt) : 0;
  if (!ownTime && !topicTime) return undefined;
  return new Date(Math.max(ownTime, topicTime));
};

/**
 * The inbox row's activity: once it opens a direct Channel, that Channel's latest message replaces
 * its legacy topics, and editing the agent no longer moves it.
 */
export const inboxActivity = (
  own: Date | string | undefined,
  topic: RecentItem | undefined,
  direct?: ChannelListItem,
): Date | undefined => (direct ? channelActivity(direct) : latestActivity(own, topic));

/**
 * Turn the sidebar agent/group list into IM-style conversations: each row
 * carries a preview of its latest topic and is ordered by latest activity,
 * rows the person pinned first. Only conversations that exist get a row — a direct Channel
 * or a topic; the rest stay in Contacts, pinned or not, since a pin is the workspace's list
 * order and not a conversation of mine. The open one stays, and a search lists every agent
 * so a new conversation can start from it.
 */
export const buildConversationSections = (
  items: SidebarAgentItem[],
  recents: RecentItem[] | undefined,
  /** The person's direct Channel per agent id. A row that opens one shows that conversation. */
  directChannels?: Map<string, ChannelListItem>,
  {
    activeId,
    includeIdle = false,
  }: {
    /** The routed conversation, kept so the open chat always has its row. */
    activeId?: string;
    /** Keep agents and groups without any conversation yet. */
    includeIdle?: boolean;
  } = {},
): ConversationSections => {
  const latestByOwner = topicsByOwner(recents);

  const seen = new Set<string>();
  const conversations: Conversation[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    const direct = directChannels?.get(item.id);
    if (direct) {
      // The row opens the direct Channel, so its legacy topics no longer describe it, and its time
      // is that Channel's latest message: editing the agent is not a message.
      conversations.push({
        activeAt: channelActivity(direct),
        channel: direct,
        item,
        preview: conversationPreview(item.description, undefined, direct),
        previewThread: channelPreviewThread(direct),
        unread: direct.unreadCount ?? 0,
      });
      continue;
    }

    const latest = latestByOwner.get(item.id);
    if (!latest && !includeIdle && item.id !== activeId) continue;

    const itemTime = toTime(item.updatedAt);
    const latestTime = latest ? toTime(latest.updatedAt) : 0;

    conversations.push({
      activeAt: new Date(Math.max(itemTime, latestTime)),
      item,
      preview: conversationPreview(item.description, latest),
    });
  }

  conversations.sort((a, b) => b.activeAt.getTime() - a.activeAt.getTime());

  return {
    pinned: conversations.filter(isPinned),
    recent: conversations.filter((c) => !isPinned(c)),
  };
};

export type ConversationEntry =
  | { activeAt: Date; channel?: ChannelListItem; type: 'inbox' }
  | { activeAt: Date; channel: ChannelListItem; type: 'channel' }
  | (Conversation & { type: 'item' });

/**
 * One IM list like WeChat's: the rows the person pinned first, then everything else, each part
 * by latest activity. Lobe AI and group Channels are placed by their own activity unless pinned;
 * a name / title filter narrows the whole list.
 */
export const buildConversationEntries = (
  { pinned, recent }: ConversationSections,
  inbox: { activeAt?: Date; channel?: ChannelListItem; title: string } | undefined,
  query = '',
  channels: ChannelListItem[] = [],
  /** The name of the project a Channel belongs to, which a search also matches. */
  projectNameOf?: (channel: ChannelListItem) => string | undefined,
): ConversationEntry[] => {
  const keyword = query.trim().toLowerCase();
  const matches = (...names: (string | null | undefined)[]) =>
    !keyword || names.some((name) => (name ?? '').toLowerCase().includes(keyword));

  // Rows show the personal name when set (`agentDisplayName`), so match it as
  // well as the role title.
  const items = (list: Conversation[]): ConversationEntry[] =>
    list
      .filter((c) => matches(c.item.name, c.item.title))
      .map((c) => ({ ...c, type: 'item' as const }));

  const rest = [
    ...items(recent),
    ...channels
      .filter((channel) => matches(channel.title, projectNameOf?.(channel)))
      .map((channel) => ({
        activeAt: channelActivity(channel),
        channel,
        type: 'channel' as const,
      })),
  ].sort((a, b) => b.activeAt.getTime() - a.activeAt.getTime());
  if (inbox && matches(inbox.title)) {
    const activeAt = inbox.activeAt ?? new Date(0);
    const index = rest.findIndex((entry) => entry.activeAt.getTime() < activeAt.getTime());
    rest.splice(index === -1 ? rest.length : index, 0, {
      activeAt,
      channel: inbox.channel,
      type: 'inbox',
    });
  }

  const byActivity = (a: ConversationEntry, b: ConversationEntry) =>
    b.activeAt.getTime() - a.activeAt.getTime();
  return [
    ...[...items(pinned), ...rest.filter(isPinned)].sort(byActivity),
    ...rest.filter((entry) => !isPinned(entry)),
  ];
};

/** The key a list row is hidden by: its Channel, its Agent or group, or Lobe AI. */
export const conversationKey = (entry: ConversationEntry): string =>
  entry.type === 'inbox' ? 'inbox' : entry.type === 'channel' ? entry.channel.id : entry.item.id;

/**
 * Drops the rows the person hid, like WeChat's "Hide chat": one comes back once it has activity
 * after it was hidden. A search still finds every row.
 */
export const withoutHidden = (
  entries: ConversationEntry[],
  hiddenAt: ReadonlyMap<string, number>,
  query = '',
): ConversationEntry[] =>
  query.trim() || hiddenAt.size === 0
    ? entries
    : entries.filter((entry) => {
        const hidden = hiddenAt.get(conversationKey(entry));
        return hidden === undefined || entry.activeAt.getTime() > hidden;
      });

/**
 * The Messages tab badge: the sum of what the list rows show. A row that opens a direct Channel
 * counts that Channel's unread messages instead of its Agent's unread topics, and an archived
 * group Channel has no row. A muted Channel counts only its unread @mentions.
 */
export const messagesUnreadCount = (
  items: Pick<SidebarAgentItem, 'id' | 'unreadCount'>[],
  channels: ChannelListItem[] | undefined,
): number => {
  let sum = 0;
  const directAgentIds = new Set<string>();
  for (const channel of channels ?? []) {
    const direct = !!channel.agentId && !channel.projectId;
    if (direct) directAgentIds.add(channel.agentId!);
    else if (channel.agentId || channel.status === 'archived') continue;
    // A muted conversation adds only what @mentions the user, like WeChat.
    sum += channel.mutedAt ? (channel.mentionCount ?? 0) : (channel.unreadCount ?? 0);
  }
  for (const item of items) {
    if (!directAgentIds.has(item.id)) sum += item.unreadCount ?? 0;
  }
  return sum;
};

/** IM-style timestamp: time today, weekday this week, date otherwise. */
export const formatConversationTime = (date: Date, now: Date = new Date()): string => {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = date.getTime();
  const pad = (n: number) => String(n).padStart(2, '0');

  if (time >= startOfToday) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}/${date.getDate()}`;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

/**
 * Who a conversation is with when it pictures one counterpart instead of "#": the other person,
 * or another person's shared Agent. The server lists that counterpart as the only avatar.
 */
export const directCounterpart = (
  channel: Pick<ChannelListItem, 'memberAvatars' | 'peerUserId' | 'sharedAgent'>,
) => {
  if (!channel.peerUserId && !channel.sharedAgent) return undefined;
  const actorType = channel.peerUserId ? 'user' : 'agent';
  return channel.memberAvatars?.find((member) => member.actorType === actorType);
};

/** A reply in progress, as the composer's activity line names it. */
export type ConversationActivity = 'typing' | 'working';

/**
 * A direct Channel's reply state on its row: preparing types, running works, blocked stays on
 * the preview (its avatar already shows it waiting).
 */
export const replyActivity = (state?: string): ConversationActivity | undefined =>
  state === 'working' ? 'working' : state === 'thinking' ? 'typing' : undefined;
