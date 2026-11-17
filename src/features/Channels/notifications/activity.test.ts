import type { ChannelListItem } from '@lobechat/types';
import { describe, expect, it } from 'vitest';

import { diffChannelActivity, MAX_CHANNEL_BANNERS_PER_UPDATE, snapshotChannels } from './activity';

const channel = (id: string, extra: Partial<ChannelListItem> = {}): ChannelListItem =>
  ({
    agentId: null,
    id,
    lastMessage: { content: 'hi', createdAt: new Date('2026-11-15T10:00:00Z') },
    mentionCount: 0,
    projectId: null,
    status: 'active',
    title: id,
    unreadCount: 0,
    ...extra,
  }) as ChannelListItem;

const later = (minutes: number) => ({
  content: 'new',
  createdAt: new Date(new Date('2026-11-15T10:00:00Z').getTime() + minutes * 60_000),
});

const diff = (
  before: ChannelListItem[],
  after: ChannelListItem[],
  options: Partial<Parameters<typeof diffChannelActivity>[0]> = {},
) =>
  diffChannelActivity({
    level: 'all',
    list: after,
    previous: snapshotChannels(before),
    ...options,
  }).map(({ channel, kind }) => `${channel.id}:${kind}`);

describe('diffChannelActivity', () => {
  it('only sets the baseline on the first load', () => {
    expect(
      diffChannelActivity({
        level: 'all',
        list: [channel('a', { unreadCount: 3 })],
        previous: undefined,
      }),
    ).toEqual([]);
  });

  it('announces a new message from someone else', () => {
    expect(diff([channel('a')], [channel('a', { lastMessage: later(1), unreadCount: 1 })])).toEqual(
      ['a:message'],
    );
  });

  it('announces an @mention as a mention, not a plain message', () => {
    expect(
      diff(
        [channel('a')],
        [channel('a', { lastMessage: later(1), mentionCount: 1, unreadCount: 1 })],
      ),
    ).toEqual(['a:mention']);
  });

  it('stays quiet when the user reads a Channel or sends their own message', () => {
    // Reading lowers the count; the user's own send moves the preview but not the unread count.
    expect(diff([channel('a', { unreadCount: 2 })], [channel('a', { unreadCount: 0 })])).toEqual(
      [],
    );
    expect(diff([channel('a')], [channel('a', { lastMessage: later(1) })])).toEqual([]);
  });

  it('skips the Channel the user is reading and archived Channels', () => {
    expect(
      diff(
        [channel('a'), channel('b')],
        [
          channel('a', { lastMessage: later(1), unreadCount: 1 }),
          channel('b', { lastMessage: later(1), status: 'archived', unreadCount: 1 }),
        ],
        { readingChannelId: 'a' },
      ),
    ).toEqual([]);
  });

  it('announces a Channel that just appeared with unread messages', () => {
    expect(diff([], [channel('new', { lastMessage: later(1), unreadCount: 1 })])).toEqual([
      'new:message',
    ]);
  });

  it('limits group messages to direct conversations at the mentions level', () => {
    const before = [channel('group'), channel('direct', { agentId: 'agt_1' })];
    const after = [
      channel('group', { lastMessage: later(1), unreadCount: 1 }),
      channel('direct', { agentId: 'agt_1', lastMessage: later(1), unreadCount: 1 }),
    ];
    expect(diff(before, after, { level: 'mentions' })).toEqual(['direct:message']);
  });

  it('announces only @mentions in a muted conversation', () => {
    const muted = { mutedAt: new Date('2026-11-15T09:00:00Z') };
    const before = [channel('chn_dm', muted), channel('chn_team', muted)];
    const after = [
      channel('chn_dm', { ...muted, lastMessage: later(1), unreadCount: 1 }),
      channel('chn_team', { ...muted, lastMessage: later(1), mentionCount: 1, unreadCount: 1 }),
    ];

    expect(diff(before, after)).toEqual(['chn_team:mention']);
  });

  it('announces nothing when turned off', () => {
    expect(
      diff(
        [channel('a')],
        [channel('a', { lastMessage: later(1), mentionCount: 1, unreadCount: 1 })],
        {
          level: 'off',
        },
      ),
    ).toEqual([]);
  });

  it('caps a burst and puts mentions first', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const after = ids.map((id, index) =>
      channel(id, {
        lastMessage: later(index + 1),
        mentionCount: id === 'a' ? 1 : 0,
        unreadCount: 1,
      }),
    );
    const result = diff(
      ids.map((id) => channel(id)),
      after,
    );
    expect(result).toHaveLength(MAX_CHANNEL_BANNERS_PER_UPDATE);
    expect(result[0]).toBe('a:mention');
  });
});
