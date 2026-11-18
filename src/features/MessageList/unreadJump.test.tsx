/**
 * @vitest-environment happy-dom
 */
import type { ChannelListItem, ChannelSection } from '@lobot/types';
import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationEntry, SectionGroup } from './conversations';
import {
  entryUnread,
  foldedSectionOf,
  nextUnreadKey,
  requestUnreadJump,
  UNREAD_JUMP_STALE_MS,
  useUnreadJump,
  useUnreadJumpStore,
} from './unreadJump';

const setSectionCollapsed = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/store/channel', () => ({ channelActions: { setSectionCollapsed } }));

const row = (id: string, channel: Partial<ChannelListItem> = {}): ConversationEntry => ({
  activeAt: new Date(),
  channel: { id, ...channel } as ChannelListItem,
  type: 'channel',
});

const section = (id: string, collapsed: boolean, entries: ConversationEntry[]): SectionGroup => ({
  entries,
  section: { collapsed, id, name: id } as ChannelSection,
});

describe('entryUnread', () => {
  it('counts what the row adds to the Messages badge, a muted one only its @mentions', () => {
    expect(entryUnread(row('a', { unreadCount: 3 }))).toBe(3);
    expect(entryUnread(row('b', { mentionCount: 1, mutedAt: new Date(), unreadCount: 9 }))).toBe(1);
    expect(entryUnread(row('c', { mutedAt: new Date(), unreadCount: 9 }))).toBe(0);
    expect(entryUnread({ activeAt: new Date(), type: 'inbox' })).toBe(0);
  });
});

describe('nextUnreadKey', () => {
  const rows = [row('a'), row('b', { unreadCount: 1 }), row('c'), row('d', { unreadCount: 2 })];

  it('starts at the first unread row', () => {
    expect(nextUnreadKey(rows, undefined)).toBe('b');
  });

  it('moves on from the row the last jump landed on, wrapping to the top', () => {
    expect(nextUnreadKey(rows, 'b')).toBe('d');
    expect(nextUnreadKey(rows, 'd')).toBe('b');
  });

  it('starts over once the last row is read', () => {
    expect(nextUnreadKey(rows, 'a')).toBe('b');
  });

  it('finds nothing when every row is read', () => {
    expect(nextUnreadKey([row('a'), row('c')], undefined)).toBeUndefined();
  });
});

describe('foldedSectionOf', () => {
  it('names the folded section a row sits in, and none for an open one', () => {
    const sections = [
      section('open', false, [row('a')]),
      section('folded', true, [row('b', { unreadCount: 1 })]),
    ];
    expect(foldedSectionOf(sections, 'b')?.id).toBe('folded');
    expect(foldedSectionOf(sections, 'a')).toBeUndefined();
  });
});

describe('useUnreadJump', () => {
  const scrollIntoView = vi.fn();

  const List = ({
    groups,
  }: {
    groups: { pinned: ConversationEntry[]; rest: ConversationEntry[]; sections: SectionGroup[] };
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    useUnreadJump(ref, groups);
    const visible = [
      ...groups.pinned,
      ...groups.sections.filter((g) => !g.section.collapsed).flatMap((g) => g.entries),
      ...groups.rest,
    ];
    return (
      <div ref={ref}>
        {visible.map((entry) => (
          <a data-conversation-key={entry.channel!.id} key={entry.channel!.id}>
            {entry.channel!.id}
          </a>
        ))}
      </div>
    );
  };

  beforeEach(() => {
    useUnreadJumpStore.setState({ lastKey: undefined, requestedAt: undefined });
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('scrolls the next unread row into view, then the one after on the next click', () => {
    const groups = {
      pinned: [],
      rest: [row('a'), row('b', { unreadCount: 1 }), row('c', { unreadCount: 1 })],
      sections: [],
    };
    const { getByText } = render(<List groups={groups} />);

    act(() => void requestUnreadJump());
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(getByText('b'));

    act(() => void requestUnreadJump());
    expect(scrollIntoView.mock.contexts[1]).toBe(getByText('c'));
    expect(useUnreadJumpStore.getState().requestedAt).toBeUndefined();
  });

  it('opens the folded section the unread row sits in', () => {
    const groups = {
      pinned: [],
      rest: [row('a')],
      sections: [section('sec_later', true, [row('b', { unreadCount: 1 })])],
    };
    render(<List groups={groups} />);

    act(() => void requestUnreadJump());

    expect(setSectionCollapsed).toHaveBeenCalledWith('sec_later', false);
  });

  it('waits for rows when the list mounts before they load', () => {
    act(() => void requestUnreadJump());
    const { getByText, rerender } = render(
      <List groups={{ pinned: [], rest: [], sections: [] }} />,
    );
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<List groups={{ pinned: [], rest: [row('b', { unreadCount: 1 })], sections: [] }} />);
    expect(scrollIntoView.mock.contexts[0]).toBe(getByText('b'));
  });

  it('drops a request no list took in time', () => {
    act(() => void requestUnreadJump(Date.now() - UNREAD_JUMP_STALE_MS - 1));
    render(<List groups={{ pinned: [], rest: [row('b', { unreadCount: 1 })], sections: [] }} />);

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(useUnreadJumpStore.getState().requestedAt).toBeUndefined();
  });
});
