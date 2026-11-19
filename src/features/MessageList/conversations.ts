import type {
  ChannelLastMessage,
  ChannelListItem,
  ChannelSection,
  SidebarAgentItem,
} from '@lobot/types';
import { t } from 'i18next';

import { contactCardPreview } from '@/features/ContactCardShare/cardText';
import { markdownToTxt } from '@/utils/markdownToTxt';

/** A plain left click; modified clicks keep the browser's own handling of the link. */
export const isPlainClick = (
  event: Pick<MouseEvent, 'altKey' | 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export interface Conversation {
  /** Latest activity: its direct Channel's latest message, else the item's own update time. */
  activeAt: Date;
  /** The agent's direct Channel, when the row opens it. Carries its own archive / trash actions. */
  channel?: ChannelListItem;
  item: SidebarAgentItem;
  /** One-line preview: the direct Channel's latest message, else the item's description. */
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

const oneLine = (text: string | null | undefined) =>
  (text ?? '').replaceAll(/\s+/g, ' ').trim() || undefined;

/** Who reads a preview, so their own message is named as theirs. */
export interface PreviewViewer {
  /** A group names every sender; a conversation of two names only the viewer's own messages. */
  group?: boolean;
  /** The signed-in person. */
  userId?: string;
}

/** A message's text as one line, else what it carries ("[Image]") when it was only files. */
const messageBody = ({ attachments, card, content }: ChannelLastMessage) => {
  // A shared card reads in the viewer's language rather than as the stored English text.
  if (card) return contactCardPreview(card);
  const text = oneLine(markdownToTxt(content));
  if (text || !attachments) return text;
  return t(attachments.fileType.startsWith('image/') ? 'preview.image' : 'preview.file', {
    ns: 'channel',
  });
};

/** The name a preview starts with: "Me" for the viewer, the sender's name in a group. */
const senderName = ({ author }: ChannelLastMessage, { group, userId }: PreviewViewer) => {
  if (!author) return;
  if (userId && author.type === 'user' && author.id === userId)
    return t('preview.self', { ns: 'channel' });
  return group ? author.name || undefined : undefined;
};

/**
 * A Channel's latest message as one line, led by its sender like WeChat's list: "Me: [Image]"
 * for the viewer's own message, and "Alice: …" for anyone else's in a group.
 */
export const channelPreview = (
  channel: Pick<ChannelListItem, 'lastMessage'>,
  viewer: PreviewViewer = {},
) => {
  const message = channel.lastMessage;
  if (!message) return;
  const content = messageBody(message);
  if (!content) return;
  const name = senderName(message, viewer);
  return name ? t('preview.sender', { content, name, ns: 'channel' }) : content;
};

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

/** A row's preview line: its direct Channel's latest message once it has one, else its description. */
export const conversationPreview = (
  description: string | null | undefined,
  direct?: Pick<ChannelListItem, 'lastMessage'>,
  /** The signed-in person, whose own latest message reads "Me: …". */
  userId?: string,
) => (direct && channelPreview(direct, { userId })) || oneLine(description);

/**
 * Pinned by this person atop their own list. The pin lives on their membership of the
 * conversation's Channel, so an Agent's workspace-wide sidebar pin does not pin it here.
 */
export const isPinned = (entry: {
  channel?: Pick<ChannelListItem, 'pinnedAt'>;
  defaultPinned?: boolean;
}) => (entry.channel ? !!entry.channel.pinnedAt : !!entry.defaultPinned);

/** When a Channel last had a message, else when it was opened. */
export const channelActivity = (channel: ChannelListItem): Date =>
  new Date(channel.lastMessage?.createdAt ?? channel.updatedAt ?? channel.createdAt);

/**
 * The inbox row's activity: its direct Channel's latest message once it has one, else the agent's
 * own update time.
 */
export const inboxActivity = (
  own: Date | string | undefined,
  direct?: ChannelListItem,
): Date | undefined => (direct ? channelActivity(direct) : own ? new Date(own) : undefined);

/**
 * Turn the sidebar agent/group list into IM-style conversations: each row
 * carries a preview of its direct Channel and is ordered by latest activity,
 * rows the person pinned first. Only conversations that exist get a row — a direct Channel;
 * the rest stay in Contacts, pinned or not, since a pin is the workspace's list
 * order and not a conversation of mine. The open one stays, and a search lists every agent
 * so a new conversation can start from it.
 */
export const buildConversationSections = (
  items: SidebarAgentItem[],
  /** The person's direct Channel per agent id. A row that opens one shows that conversation. */
  directChannels?: Map<string, ChannelListItem>,
  {
    activeId,
    includeIdle = false,
    userId,
  }: {
    /** The routed conversation, kept so the open chat always has its row. */
    activeId?: string;
    /** Keep agents and groups without any conversation yet. */
    includeIdle?: boolean;
    /** The signed-in person, whose own latest message previews as "Me: …". */
    userId?: string;
  } = {},
): ConversationSections => {
  const seen = new Set<string>();
  const conversations: Conversation[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    const direct = directChannels?.get(item.id);
    if (direct) {
      // Its time is the Channel's latest message: editing the agent is not a message.
      conversations.push({
        activeAt: channelActivity(direct),
        channel: direct,
        item,
        preview: conversationPreview(item.description, direct, userId),
        previewThread: channelPreviewThread(direct),
        unread: direct.unreadCount ?? 0,
      });
      continue;
    }

    if (!includeIdle && item.id !== activeId) continue;

    conversations.push({
      activeAt: new Date(item.updatedAt),
      item,
      preview: conversationPreview(item.description),
    });
  }

  conversations.sort((a, b) => b.activeAt.getTime() - a.activeAt.getTime());

  return {
    pinned: conversations.filter(isPinned),
    recent: conversations.filter((c) => !isPinned(c)),
  };
};

export type ConversationEntry =
  | {
      activeAt: Date;
      channel?: ChannelListItem;
      /** Lobe AI before its direct Channel exists: a new person finds it pinned. */
      defaultPinned?: boolean;
      type: 'inbox';
    }
  | { activeAt: Date; channel: ChannelListItem; type: 'channel' }
  | (Conversation & { type: 'item' });

/**
 * One IM list like WeChat's: the rows the person pinned first, then everything else, each part
 * by latest activity. Lobe AI and group Channels are placed by their own activity unless pinned;
 * a name / title filter narrows the whole list.
 */
export const buildConversationEntries = (
  { pinned, recent }: ConversationSections,
  inbox:
    | { activeAt?: Date; channel?: ChannelListItem; defaultPinned?: boolean; title: string }
    | undefined,
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
      defaultPinned: inbox.defaultPinned,
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

export interface SectionGroup {
  entries: ConversationEntry[];
  section: ChannelSection;
}

/**
 * Splits the list into the person's pinned rows, each of their own sections in order, and the
 * rest. A pin wins over a section, so a pinned conversation leads the list; a row filed under a
 * section that no longer exists falls back to the rest. Each part keeps the list's order.
 */
export const groupBySection = (
  entries: ConversationEntry[],
  sections: ChannelSection[] = [],
): { pinned: ConversationEntry[]; rest: ConversationEntry[]; sections: SectionGroup[] } => {
  const bySection = new Map(sections.map((section) => [section.id, [] as ConversationEntry[]]));
  const pinned: ConversationEntry[] = [];
  const rest: ConversationEntry[] = [];
  for (const entry of entries) {
    if (isPinned(entry)) {
      pinned.push(entry);
      continue;
    }
    const filed = entry.channel?.sectionId ? bySection.get(entry.channel.sectionId) : undefined;
    (filed ?? rest).push(entry);
  }
  return {
    pinned,
    rest,
    sections: sections.map((section) => ({ entries: bySection.get(section.id)!, section })),
  };
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
 * The Messages tab badge: the sum of what the list rows show, every row being a Channel. An Agent's
 * Channel inside a project and an archived group Channel have no row. A muted Channel counts only
 * its unread @mentions.
 */
export const messagesUnreadCount = (channels: ChannelListItem[] | undefined): number => {
  let sum = 0;
  for (const channel of channels ?? []) {
    const direct = !!channel.agentId && !channel.projectId;
    if (!direct && (channel.agentId || channel.status === 'archived')) continue;
    // A muted conversation adds only what @mentions the user, like WeChat.
    sum += channel.mutedAt ? (channel.mentionCount ?? 0) : (channel.unreadCount ?? 0);
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

const sameValue = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b) || Object.getPrototypeOf(a) !== Object.prototype)
    return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.is(left[key], right[key]))
  );
};

const sameEntry = (a: ConversationEntry, b: ConversationEntry) => {
  const left = a as unknown as Record<string, unknown>;
  const right = b as unknown as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => sameValue(left[key], right[key]))
  );
};

/**
 * Hands back the previous entry object wherever a rebuilt entry says the same thing, so memoized
 * rows skip the re-render. The list is rebuilt whenever another conversation opens, and each
 * build makes fresh `activeAt` dates; without this every row repainted on every switch.
 */
export const reuseUnchangedEntries = (
  previous: ConversationEntry[],
  next: ConversationEntry[],
): ConversationEntry[] => {
  if (previous.length === 0) return next;
  const byKey = new Map(previous.map((entry) => [conversationKey(entry), entry] as const));
  let changed = previous.length !== next.length;
  const merged = next.map((entry, index) => {
    const old = byKey.get(conversationKey(entry));
    const kept = old && sameEntry(old, entry) ? old : entry;
    if (kept !== previous[index]) changed = true;
    return kept;
  });
  return changed ? merged : previous;
};
