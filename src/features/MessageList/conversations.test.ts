import type {
  ChannelLastMessage,
  ChannelListItem,
  ChannelSection,
  SidebarAgentItem,
} from '@lobot/types';
import i18n from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import channelZh from '../../../locales/zh-CN/channel.json';
import {
  buildConversationEntries,
  buildConversationSections,
  channelPreview,
  type ConversationEntry,
  directCounterpart,
  formatConversationTime,
  groupBySection,
  inboxActivity,
  messagesUnreadCount,
  reuseUnchangedEntries,
  withoutHidden,
} from './conversations';

const agent = (id: string, updatedAt: string, extra: Partial<SidebarAgentItem> = {}) =>
  ({
    id,
    pinned: false,
    title: id,
    type: 'agent',
    updatedAt: new Date(updatedAt),
    ...extra,
  }) as SidebarAgentItem;

/** The person's direct Channel with an Agent, pinned atop their own list. */
const pinnedDirect = (agentId: string) =>
  ({
    agentId,
    createdAt: new Date('2026-01-01'),
    id: `chn_${agentId}`,
    lastMessage: null,
    pinnedAt: new Date('2026-01-02'),
  }) as ChannelListItem;

/** A direct Channel with an Agent whose latest message was at `at`. */
const direct = (agentId: string, at: string, extra: Partial<ChannelListItem> = {}) =>
  ({
    agentId,
    createdAt: new Date('2026-01-01'),
    id: `chn_${agentId}`,
    lastMessage: { content: `${agentId} says hi`, createdAt: new Date(at) },
    ...extra,
  }) as ChannelListItem;

describe('buildConversationSections', () => {
  it('orders by latest message, pinned first, with the latest message as preview', () => {
    const { pinned, recent } = buildConversationSections(
      [agent('a', '2026-10-01'), agent('b', '2026-10-02'), agent('p', '2026-09-01')],
      new Map([
        ['a', direct('a', '2026-10-05')],
        ['b', direct('b', '2026-10-03')],
        ['p', pinnedDirect('p')],
      ]),
    );

    expect(pinned.map((c) => c.item.id)).toEqual(['p']);
    expect(recent.map((c) => c.item.id)).toEqual(['a', 'b']);
    expect(recent[0].preview).toBe('a says hi');
  });

  // Agents without a direct Channel got a row from their old topics; only Channels are
  // conversations now.
  it('lists only agents with a direct Channel, and the open one', () => {
    const items = [
      agent('talked', '2026-10-01'),
      agent('idle', '2026-10-09'),
      agent('idle-group', '2026-10-09', { type: 'group' }),
      agent('open', '2026-10-01'),
      // Pinned by a workspace member, but this person never talked to it.
      agent('pinned', '2026-10-01', { pinned: true }),
    ];

    const { pinned, recent } = buildConversationSections(
      items,
      new Map([['talked', direct('talked', '2026-10-02')]]),
      { activeId: 'open' },
    );

    expect(pinned).toEqual([]);
    expect(recent.map((c) => c.item.id)).toEqual(['talked', 'open']);
  });

  // An Agent's sidebar pin is shared by the whole workspace, so it pinned the row for everyone.
  it("pins only the person's own conversations, not an Agent's workspace pin", () => {
    const { pinned, recent } = buildConversationSections(
      [agent('team-pin', '2026-10-01', { pinned: true }), agent('mine', '2026-10-01')],
      new Map([
        ['team-pin', direct('team-pin', '2026-10-03')],
        ['mine', pinnedDirect('mine')],
      ]),
    );

    expect(pinned.map((c) => c.item.id)).toEqual(['mine']);
    expect(recent.map((c) => c.item.id)).toEqual(['team-pin']);
  });

  it('keeps every agent while searching so a new conversation can start', () => {
    const { recent } = buildConversationSections(
      [agent('idle', '2026-10-09'), agent('idle-group', '2026-10-08', { type: 'group' })],
      undefined,
      { includeIdle: true },
    );

    expect(recent.map((c) => c.item.id)).toEqual(['idle', 'idle-group']);
  });

  it('drops duplicate ids and falls back to the description', () => {
    const { recent } = buildConversationSections(
      [agent('a', '2026-10-01', { description: 'helps' }), agent('a', '2026-10-01')],
      undefined,
      { includeIdle: true },
    );

    expect(recent).toHaveLength(1);
    expect(recent[0].preview).toBe('helps');
  });
});

describe('buildConversationSections with direct Channels', () => {
  // The row opened the direct Channel but still showed the legacy topic's badge, preview and time.
  it('describes an agent row by the direct Channel it opens', () => {
    const direct = {
      agentId: 'a',
      createdAt: new Date('2026-10-01'),
      id: 'chn_a',
      lastMessage: { content: '**Done**, see\n the PR', createdAt: new Date('2026-10-09') },
      unreadCount: 2,
    } as ChannelListItem;
    const { recent } = buildConversationSections(
      [agent('a', '2026-10-01', { unreadCount: 5 }), agent('b', '2026-10-05')],
      new Map([['a', direct]]),
    );

    // `b` has no direct Channel.
    expect(recent.map((c) => c.item.id)).toEqual(['a']);
    expect(recent[0]).toMatchObject({
      activeAt: new Date('2026-10-09'),
      preview: 'Done, see the PR',
      unread: 2,
    });
  });

  // Editing the agent (avatar, model, sync) moved the row to the top with that edit's time.
  it('times an agent row by its direct Channel latest message, not the agent edit', () => {
    const direct = {
      agentId: 'a',
      createdAt: new Date('2026-10-01'),
      id: 'chn_a',
      lastMessage: { content: 'hi', createdAt: new Date('2026-10-03') },
    } as ChannelListItem;
    const { recent } = buildConversationSections(
      [agent('a', '2026-10-09')],
      new Map([['a', direct]]),
    );

    expect(recent[0].activeAt).toEqual(new Date('2026-10-03'));
  });

  it('falls back to the agent description while its direct Channel is empty', () => {
    const direct = {
      agentId: 'a',
      createdAt: new Date('2026-10-01'),
      id: 'chn_a',
      lastMessage: null,
      unreadCount: 0,
    } as ChannelListItem;
    const { recent } = buildConversationSections(
      [agent('a', '2026-10-01', { description: 'Cooks dinner' })],
      new Map([['a', direct]]),
    );

    expect(recent[0]).toMatchObject({ preview: 'Cooks dinner', unread: 0 });
  });

  // A newer Thread reply read like the main conversation's last word.
  it('names the Thread a latest reply was posted in', () => {
    const direct = {
      agentId: 'a',
      createdAt: new Date('2026-10-01'),
      id: 'chn_a',
      lastMessage: {
        content: 'Conflict resolved',
        createdAt: new Date('2026-10-09'),
        thread: { id: 'thr_1', title: 'Member model' },
      },
    } as ChannelListItem;
    const { recent } = buildConversationSections(
      [agent('a', '2026-10-01')],
      new Map([['a', direct]]),
    );

    expect(recent[0]).toMatchObject({
      activeAt: new Date('2026-10-09'),
      preview: 'Conflict resolved',
      previewThread: { id: 'thr_1', title: 'Member model' },
    });
  });
});

describe('formatConversationTime', () => {
  const now = new Date(2026, 9, 26, 15, 0);

  it.each([
    [new Date(2026, 9, 26, 9, 5), '09:05'],
    [new Date(2026, 9, 25, 23, 59), '10/25'],
    [new Date(2025, 0, 2), '2025/1/2'],
  ])('formats %s as %s', (date, expected) => {
    expect(formatConversationTime(date, now)).toBe(expected);
  });
});

describe('buildConversationEntries', () => {
  const sections = buildConversationSections(
    [
      agent('a', '2026-10-05', { title: 'Alpha' }),
      agent('b', '2026-10-01', { title: 'Beta' }),
      agent('p', '2026-09-01', { title: 'Pinned' }),
    ],
    new Map([
      [
        'p',
        {
          ...pinnedDirect('p'),
          lastMessage: { content: 'hi', createdAt: new Date('2026-09-01') },
        } as ChannelListItem,
      ],
    ]),
    { includeIdle: true },
  );
  const ids = (entries: ReturnType<typeof buildConversationEntries>) =>
    entries.map((e) =>
      e.type === 'inbox' ? 'inbox' : e.type === 'channel' ? e.channel.id : e.item.id,
    );
  const channel = (id: string, title: string, updatedAt: string) =>
    ({
      createdAt: new Date('2026-01-01'),
      id,
      title,
      updatedAt: new Date(updatedAt),
    }) as ChannelListItem;

  it('places Lobe AI by its own activity instead of pinning it on top', () => {
    expect(
      ids(
        buildConversationEntries(sections, { activeAt: new Date('2026-10-03'), title: 'Lobe AI' }),
      ),
    ).toEqual(['p', 'a', 'inbox', 'b']);
  });

  it('puts Lobe AI last until its activity is known', () => {
    expect(ids(buildConversationEntries(sections, { title: 'Lobe AI' }))).toEqual([
      'p',
      'a',
      'b',
      'inbox',
    ]);
  });

  it('filters every row, Lobe AI included, by title', () => {
    expect(ids(buildConversationEntries(sections, { title: 'Lobe AI' }, 'bet'))).toEqual(['b']);
    expect(ids(buildConversationEntries(sections, { title: 'Lobe AI' }, 'lobe'))).toEqual([
      'inbox',
    ]);
  });

  it('matches the personal name shown on the row, not only the role title', () => {
    const named = {
      pinned: [],
      recent: [
        {
          activeAt: new Date('2026-01-01'),
          item: agent('n', '2026-01-01', { name: 'Alice', title: 'Health Assistant' }),
        },
      ],
    };

    expect(ids(buildConversationEntries(named, undefined, 'alice'))).toEqual(['n']);
    expect(ids(buildConversationEntries(named, undefined, 'health'))).toEqual(['n']);
  });

  it('orders group Channels with the other conversations by their latest message', () => {
    const channels = [
      channel('chn_team', 'Team', '2026-10-03'),
      channel('chn_old', 'Archive talk', '2026-08-01'),
    ];

    expect(ids(buildConversationEntries(sections, undefined, '', channels))).toEqual([
      'p',
      'a',
      'chn_team',
      'b',
      'chn_old',
    ]);
    expect(ids(buildConversationEntries(sections, undefined, 'team', channels))).toEqual([
      'chn_team',
    ]);
  });

  it('leads with every pinned conversation, group Channels and Lobe AI included', () => {
    const channels = [
      { ...channel('chn_team', 'Team', '2026-10-03'), pinnedAt: new Date('2026-10-04') },
      channel('chn_old', 'Archive talk', '2026-08-01'),
    ];
    const inbox = {
      activeAt: new Date('2026-08-02'),
      channel: pinnedDirect('inbox'),
      title: 'Lobe AI',
    };

    expect(ids(buildConversationEntries(sections, inbox, '', channels))).toEqual([
      'chn_team',
      'p',
      'inbox',
      'a',
      'b',
      'chn_old',
    ]);
  });

  it("finds a project Channel by its project's name", () => {
    const channels = [
      { ...channel('chn_general', 'General', '2026-10-03'), projectId: 'pro_1' },
      channel('chn_team', 'Team', '2026-10-02'),
    ];
    const projectNameOf = (c: ChannelListItem) => (c.projectId ? 'Apollo' : undefined);

    expect(
      ids(buildConversationEntries(sections, undefined, 'apollo', channels, projectNameOf)),
    ).toEqual(['chn_general']);
  });
});

describe('messagesUnreadCount', () => {
  const channel = (patch: Partial<ChannelListItem>) =>
    ({
      agentId: null,
      projectId: null,
      status: 'active',
      unreadCount: 0,
      ...patch,
    }) as ChannelListItem;

  it('counts only the unread @mentions of a muted conversation', () => {
    const mutedAt = new Date('2026-11-15');
    expect(
      messagesUnreadCount([
        channel({ id: 'chn_quiet', mentionCount: 0, mutedAt, unreadCount: 7 }),
        channel({ id: 'chn_called', mentionCount: 1, mutedAt, unreadCount: 4 }),
        channel({ id: 'chn_loud', unreadCount: 2 }),
      ]),
    ).toBe(3);
  });

  it('sums the list rows: direct, group and project Channels', () => {
    const channels = [
      channel({ agentId: 'agt_direct', id: 'chn_direct', unreadCount: 1 }),
      channel({ agentId: 'agt_inbox', id: 'chn_inbox', unreadCount: 3 }),
      channel({ id: 'chn_team', unreadCount: 4 }),
      channel({ id: 'chn_project', projectId: 'pro_1', unreadCount: 6 }),
    ];

    expect(messagesUnreadCount(channels)).toBe(14);
  });

  it('leaves out archived group Channels, which have no row', () => {
    const channels = [channel({ id: 'chn_old', status: 'archived', unreadCount: 7 })];

    expect(messagesUnreadCount(channels)).toBe(0);
  });

  it('counts nothing while Channels are off', () => {
    expect(messagesUnreadCount(undefined)).toBe(0);
  });
});

describe('inboxActivity', () => {
  const direct = (createdAt: string) =>
    ({ lastMessage: { content: 'hi', createdAt } }) as unknown as ChannelListItem;

  it('ignores an agent edit newer than the direct Channel latest message', () => {
    expect(inboxActivity('2026-10-09', direct('2026-10-05'))).toEqual(new Date('2026-10-05'));
  });

  it('falls back to the agent time without a direct Channel', () => {
    expect(inboxActivity('2026-10-02')).toEqual(new Date('2026-10-02'));
    expect(inboxActivity(undefined)).toBeUndefined();
  });
});

describe('directCounterpart', () => {
  const person = {
    actorType: 'user' as const,
    avatar: null,
    backgroundColor: null,
    id: 'u_bob',
    name: 'Bob',
  };
  const agent = {
    actorType: 'agent' as const,
    avatar: '🤖',
    backgroundColor: null,
    id: 'agt_1',
    name: 'Helper',
  };

  it('pictures the other person of a conversation between people', () => {
    expect(directCounterpart({ memberAvatars: [person], peerUserId: 'u_bob' })).toBe(person);
  });

  it('pictures the shared Agent of a direct conversation with it', () => {
    expect(directCounterpart({ memberAvatars: [agent], sharedAgent: true })).toBe(agent);
  });

  it('leaves groups to their own avatar', () => {
    expect(directCounterpart({ memberAvatars: [person, agent] })).toBeUndefined();
  });
});

describe('groupBySection', () => {
  const section = (id: string): ChannelSection => ({
    collapsed: false,
    createdAt: new Date('2026-01-01'),
    id,
    name: id,
    sort: null,
    updatedAt: new Date('2026-01-01'),
  });
  const entry = (id: string, patch: Partial<ChannelListItem> = {}): ConversationEntry => ({
    activeAt: new Date('2026-01-01'),
    channel: { id, ...patch } as ChannelListItem,
    type: 'channel',
  });
  const ids = (entries: ConversationEntry[]) =>
    entries.map((e) => (e.type === 'inbox' ? 'inbox' : e.channel!.id));

  it('puts pinned rows first, then each section in its order, then the rest', () => {
    const groups = groupBySection(
      [
        entry('a', { sectionId: 's2' }),
        entry('b'),
        entry('c', { pinnedAt: new Date(), sectionId: 's1' }),
        entry('d', { sectionId: 's1' }),
        entry('e', { sectionId: 's1' }),
      ],
      [section('s1'), section('s2'), section('s3')],
    );

    expect(ids(groups.pinned)).toEqual(['c']);
    expect(groups.sections.map((g) => [g.section.id, ids(g.entries)])).toEqual([
      ['s1', ['d', 'e']],
      ['s2', ['a']],
      ['s3', []],
    ]);
    expect(ids(groups.rest)).toEqual(['b']);
  });

  it('keeps a row filed under a missing section, and every row without sections, in the rest', () => {
    const rows = [
      entry('a', { sectionId: 'gone' }),
      { activeAt: new Date(), type: 'inbox' as const },
    ];

    expect(ids(groupBySection(rows, [section('s1')]).rest)).toEqual(['a', 'inbox']);
    expect(ids(groupBySection(rows).rest)).toEqual(['a', 'inbox']);
  });
});

describe('withoutHidden', () => {
  const entries = buildConversationEntries(
    {
      pinned: [],
      recent: [
        { activeAt: new Date('2026-10-05'), item: agent('a', '2026-10-01') },
        { activeAt: new Date('2026-10-03'), item: agent('b', '2026-10-01') },
      ],
    },
    { activeAt: new Date('2026-10-02'), title: 'Lobe AI' },
    '',
    [
      {
        createdAt: new Date('2026-10-01'),
        id: 'chn_team',
        title: 'Team',
        updatedAt: new Date('2026-10-04'),
      } as ChannelListItem,
    ],
  );
  const ids = (list: typeof entries) =>
    list.map((e) =>
      e.type === 'inbox' ? 'inbox' : e.type === 'channel' ? e.channel.id : e.item.id,
    );
  const at = (date: string) => new Date(date).getTime();

  it('drops a row hidden after its latest activity, whatever kind of row it is', () => {
    const hidden = new Map([
      ['b', at('2026-10-04')],
      ['chn_team', at('2026-10-04')],
      ['inbox', at('2026-10-03')],
    ]);
    expect(ids(withoutHidden(entries, hidden))).toEqual(['a']);
  });

  it('brings a hidden row back once it has newer activity', () => {
    expect(ids(withoutHidden(entries, new Map([['a', at('2026-10-04')]])))).toEqual([
      'a',
      'chn_team',
      'b',
      'inbox',
    ]);
  });

  it('lets a search find hidden rows', () => {
    expect(ids(withoutHidden(entries, new Map([['b', at('2026-10-09')]]), 'b'))).toContain('b');
  });
});

describe('reuseUnchangedEntries', () => {
  const team = {
    createdAt: new Date('2026-10-01'),
    id: 'chn_team',
    title: 'Team',
    updatedAt: new Date('2026-10-04'),
  } as ChannelListItem;
  const a = agent('a', '2026-10-01');
  const b = agent('b', '2026-10-01');
  // Every build makes fresh entry objects and fresh `activeAt` dates, as opening another
  // conversation does.
  const build = (bActiveAt = '2026-10-03') =>
    buildConversationEntries(
      {
        pinned: [],
        recent: [
          { activeAt: new Date('2026-10-05'), item: a, preview: 'hi' },
          { activeAt: new Date(bActiveAt), item: b },
        ],
      },
      { activeAt: new Date('2026-10-02'), title: 'Lobe AI' },
      '',
      [team],
    );

  it('keeps the previous list and entry objects when a rebuild says the same thing', () => {
    const first = build();
    const second = build();
    expect(second[0]).not.toBe(first[0]);

    const reused = reuseUnchangedEntries(first, second);

    expect(reused).toBe(first);
  });

  it('swaps in only the entries that changed', () => {
    const first = build();
    const reused = reuseUnchangedEntries(first, build('2026-10-06'));
    const byKey = (list: typeof first, key: string) =>
      list.find((e) => (e.type === 'item' ? e.item.id : e.type) === key);

    expect(reused).not.toBe(first);
    expect(byKey(reused, 'a')).toBe(byKey(first, 'a'));
    expect(byKey(reused, 'inbox')).toBe(byKey(first, 'inbox'));
    expect(byKey(reused, 'b')).not.toBe(byKey(first, 'b'));
    expect(reused[0]).toBe(byKey(reused, 'b'));
  });
});

describe('channelPreview', () => {
  beforeAll(() => {
    i18n.addResourceBundle('zh-CN', 'channel', channelZh, true, true);
  });

  const withLast = (lastMessage: Partial<ChannelLastMessage>) => ({
    lastMessage: { content: '', createdAt: new Date('2026-11-18'), thread: null, ...lastMessage },
  });
  const me = { id: 'user_me', name: 'Arvin', type: 'user' as const };
  const alice = { id: 'user_alice', name: 'Alice', type: 'user' as const };
  const image = { count: 1, fileType: 'image/png' };

  // A message of only an image previewed as nothing, and the viewer's own message was unmarked.
  it('reads the viewer’s own image-only message as "我: [图片]"', () => {
    expect(channelPreview(withLast({ attachments: image, author: me }), { userId: me.id })).toBe(
      '我: [图片]',
    );
  });

  it('names a non-image attachment as a file', () => {
    expect(
      channelPreview(withLast({ attachments: { count: 2, fileType: 'application/pdf' } })),
    ).toBe('[文件]');
  });

  it('prefers the text over the attachment', () => {
    expect(
      channelPreview(withLast({ attachments: image, author: me, content: '看下 **这个**' }), {
        userId: me.id,
      }),
    ).toBe('我: 看下 这个');
  });

  it('names other senders only in a group', () => {
    const message = withLast({ author: alice, content: 'hi' });
    expect(channelPreview(message, { userId: me.id })).toBe('hi');
    expect(channelPreview(message, { group: true, userId: me.id })).toBe('Alice: hi');
  });

  it('has no line for a message with neither text nor files, or from an older server', () => {
    expect(channelPreview(withLast({ author: me }), { userId: me.id })).toBeUndefined();
    expect(channelPreview(withLast({ content: 'old' }), { userId: me.id })).toBe('old');
  });
});
