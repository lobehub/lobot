import { cssVar } from '@lobehub/ui';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

import { channelActions } from '@/store/channel';

import { type ConversationEntry, conversationKey, type SectionGroup } from './conversations';

/** A request older than this was made while no list was there to take it, so it is dropped. */
export const UNREAD_JUMP_STALE_MS = 3000;

interface UnreadJumpState {
  /** The row the last jump landed on, so the next one moves on to the following unread row. */
  lastKey?: string;
  /** When a badge asked for a jump the list has not made yet. */
  requestedAt?: number;
}

export const useUnreadJumpStore = create<UnreadJumpState>(() => ({}));

/**
 * Asks the Messages list to bring its next unread conversation into view, as a click on an already
 * open badge (the Messages tab, the active workspace tile) does. The list may mount after the ask.
 */
export const requestUnreadJump = (now = Date.now()) =>
  useUnreadJumpStore.setState({ requestedAt: now });

/** What a row adds to the Messages badge: a muted conversation only its unread @mentions. */
export const entryUnread = (entry: ConversationEntry): number => {
  const channel = entry.channel;
  if (!channel) return 0;
  return channel.mutedAt ? (channel.mentionCount ?? 0) : (channel.unreadCount ?? 0);
};

/** The rows in the order the list shows them: pinned, the person's sections, then the rest. */
export const rowsInListOrder = (groups: {
  pinned: ConversationEntry[];
  rest: ConversationEntry[];
  sections: SectionGroup[];
}): ConversationEntry[] => [
  ...groups.pinned,
  ...groups.sections.flatMap((group) => group.entries),
  ...groups.rest,
];

/**
 * The unread row a jump lands on: the first one after the row the last jump landed on, wrapping
 * to the top, like Telegram's double tap on Chats. None when nothing is unread.
 */
export const nextUnreadKey = (
  rows: ConversationEntry[],
  lastKey: string | undefined,
): string | undefined => {
  const unread = rows.filter((row) => entryUnread(row) > 0).map(conversationKey);
  if (unread.length === 0) return undefined;
  const index = lastKey ? unread.indexOf(lastKey) : -1;
  return unread[(index + 1) % unread.length];
};

/** The folded section a row sits in, which has to open before the row can show. */
export const foldedSectionOf = (sections: SectionGroup[], key: string) =>
  sections.find(
    (group) =>
      group.section.collapsed && group.entries.some((entry) => conversationKey(entry) === key),
  )?.section;

const flash = (row: HTMLElement) => {
  row.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  row.animate?.([{ backgroundColor: cssVar.colorFillSecondary }, {}], {
    duration: 1200,
    easing: 'ease-out',
  });
};

/**
 * Takes the list's pending jump request: picks the next unread row, opens the folded section it
 * sits in, then scrolls it into view and flashes it once it renders.
 */
export const useUnreadJump = (
  container: RefObject<HTMLElement | null>,
  groups: { pinned: ConversationEntry[]; rest: ConversationEntry[]; sections: SectionGroup[] },
  /** Opens a folded group the list owns. Returns true when it did, so no section is written. */
  openSection?: (id: string) => boolean,
) => {
  const requestedAt = useUnreadJumpStore((s) => s.requestedAt);
  const [target, setTarget] = useState<string>();
  const openSectionRef = useRef(openSection);
  openSectionRef.current = openSection;

  useEffect(() => {
    if (requestedAt === undefined) return;
    if (Date.now() - requestedAt > UNREAD_JUMP_STALE_MS) {
      useUnreadJumpStore.setState({ requestedAt: undefined });
      return;
    }

    const key = nextUnreadKey(rowsInListOrder(groups), useUnreadJumpStore.getState().lastKey);
    // A list that just mounted may still be loading its rows: keep the request for them.
    if (!key) return;
    useUnreadJumpStore.setState({ lastKey: key, requestedAt: undefined });

    const folded = foldedSectionOf(groups.sections, key);
    if (folded && !openSectionRef.current?.(folded.id)) {
      void channelActions
        .setSectionCollapsed(folded.id, false)
        .catch((error) => console.error('Failed to open section', error));
    }
    setTarget(key);
  }, [groups, requestedAt]);

  useEffect(() => {
    if (!target) return;
    const row = container.current?.querySelector<HTMLElement>(
      `[data-conversation-key="${CSS.escape(target)}"]`,
    );
    // A folded section renders the row on its next pass.
    if (!row) return;
    setTarget(undefined);
    flash(row);
  }, [container, groups, target]);
};
