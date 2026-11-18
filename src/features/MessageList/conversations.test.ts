import type { ChannelListItem, RecentItem, SidebarAgentItem } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import {
  buildConversationEntries,
  buildConversationSections,
  directCounterpart,
  formatConversationTime,
  inboxActivity,
  latestActivity,
  latestTopicOf,
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

const topic = (extra: Partial<RecentItem> & { updatedAt: string }) =>
  ({
    icon: '',
    id: Math.random().toString(),
    routePath: '/',
    status: null,
    title: 'topic',
    type: 'topic',
    ...extra,
    updatedAt: new Date(extra.updatedAt),
  }) as RecentItem;

describe('buildConversationSections', () => {
  it('orders by latest activity, pinned first, with the latest topic as preview', () => {
    const { pinned, recent } = buildConversationSections(
      [
        agent('a', '2026-10-01'),
        agent('b', '2026-10-02'),
        agent('p', '2026-09-01'),
        agent('g', '2026-09-01', { type: 'group' }),
      ],
      [
        topic({ agentId: 'a', lastAssistantMessage: 'old', updatedAt: '2026-10-03' }),
        topic({ agentId: 'a', lastAssistantMessage: 'newest\n reply', updatedAt: '2026-10-05' }),
        topic({ routePath: '/group/g/tpc_1', title: 'group topic', updatedAt: '2026-10-04' }),
        topic({ agentId: 'b', type: 'document', updatedAt: '2026-10-09' }),
      ],
      new Map([['p', pinnedDirect('p')]]),
    );

    expect(pinned.map((c) => c.item.id)).toEqual(['p']);
    // Documents are not conversation activity, so `b` has no conversation and no row.
    expect(recent.map((c) => c.item.id)).toEqual(['a', 'g']);
    expect(recent[0].preview).toBe('newest reply');
    expect(recent[1].preview).toBe('group topic');
  });

  it('lists only agents and groups that have a conversation', () => {
    const items = [
      agent('talked', '2026-10-01'),
      agent('idle', '2026-10-09'),
      agent('idle-group', '2026-10-09', { type: 'group' }),
      agent('open', '2026-10-01'),
      // Pinned by a workspace member, but this person never talked to it.
      agent('pinned', '2026-10-01', { pinned: true }),
    ];
    const recents = [topic({ agentId: 'talked', updatedAt: '2026-10-02' })];

    const { pinned, recent } = buildConversationSections(items, recents, undefined, {
      activeId: 'open',
    });

    expect(pinned).toEqual([]);
    expect(recent.map((c) => c.item.id)).toEqual(['talked', 'open']);
  });

  // An Agent's sidebar pin is shared by the whole workspace, so it pinned the row for everyone.
  it("pins only the person's own conversations, not an Agent's workspace pin", () => {
    const { pinned, recent } = buildConversationSections(
      [agent('team-pin', '2026-10-01', { pinned: true }), agent('mine', '2026-10-01')],
      [topic({ agentId: 'team-pin', updatedAt: '2026-10-03' })],
      new Map([['mine', pinnedDirect('mine')]]),
    );

    expect(pinned.map((c) => c.item.id)).toEqual(['mine']);
    expect(recent.map((c) => c.item.id)).toEqual(['team-pin']);
  });

  it('keeps every agent while searching so a new conversation can start', () => {
    const { recent } = buildConversationSections(
      [agent('idle', '2026-10-09'), agent('idle-group', '2026-10-08', { type: 'group' })],
      [],
      undefined,
      { includeIdle: true },
    );

    expect(recent.map((c) => c.item.id)).toEqual(['idle', 'idle-group']);
  });

  it('attributes a group topic that also carries the supervisor agentId to the group', () => {
    const { recent } = buildConversationSections(
      [agent('sup', '2026-09-01'), agent('g', '2026-09-01', { type: 'group' })],
      [
        topic({
          agentId: 'sup',
          lastAssistantMessage: 'group reply',
          routePath: '/group/g/tpc_2',
          updatedAt: '2026-10-05',
        }),
      ],
    );

    // The supervisor has no conversation of its own, so it never shows the group's reply.
    expect(recent.map((c) => c.item.id)).toEqual(['g']);
    expect(recent[0].preview).toBe('group reply');
  });

  it('drops duplicate ids and falls back to the description', () => {
    const { recent } = buildConversationSections(
      [agent('a', '2026-10-01', { description: 'helps' }), agent('a', '2026-10-01')],
      undefined,
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
      [topic({ agentId: 'a', lastAssistantMessage: 'legacy reply', updatedAt: '2026-10-02' })],
      new Map([['a', direct]]),
    );

    // `b` has neither a direct Channel nor a topic.
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
      [agent('a', '2026-10-09'), agent('b', '2026-10-05')],
      [topic({ agentId: 'b', updatedAt: '2026-10-05' })],
      new Map([['a', direct]]),
    );

    expect(recent.map((c) => c.item.id)).toEqual(['b', 'a']);
    expect(recent[1].activeAt).toEqual(new Date('2026-10-03'));
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
      [topic({ agentId: 'a', lastAssistantMessage: 'legacy reply', updatedAt: '2026-10-02' })],
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
      [],
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
    undefined,
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
      messagesUnreadCount(
        [],
        [
          channel({ id: 'chn_quiet', mentionCount: 0, mutedAt, unreadCount: 7 }),
          channel({ id: 'chn_called', mentionCount: 1, mutedAt, unreadCount: 4 }),
          channel({ id: 'chn_loud', unreadCount: 2 }),
        ],
      ),
    ).toBe(3);
  });

  it('sums the list rows: topics without a direct Channel, direct, group and project Channels', () => {
    const items = [
      agent('agt_topics', '2026-10-01', { unreadCount: 2 }),
      agent('agt_direct', '2026-10-01', { unreadCount: 5 }),
    ];
    const channels = [
      channel({ agentId: 'agt_direct', id: 'chn_direct', unreadCount: 1 }),
      channel({ agentId: 'agt_inbox', id: 'chn_inbox', unreadCount: 3 }),
      channel({ id: 'chn_team', unreadCount: 4 }),
      channel({ id: 'chn_project', projectId: 'pro_1', unreadCount: 6 }),
    ];

    // 2 (topics) + 1 (direct, not the agent's 5 topics) + 3 (inbox) + 4 (group) + 6 (project)
    expect(messagesUnreadCount(items, channels)).toBe(16);
  });

  it('leaves out archived group Channels, which have no row', () => {
    const channels = [channel({ id: 'chn_old', status: 'archived', unreadCount: 7 })];

    expect(messagesUnreadCount([], channels)).toBe(0);
  });

  it('counts only Agent topics while Channels are off', () => {
    expect(messagesUnreadCount([agent('a', '2026-10-01', { unreadCount: 2 })], undefined)).toBe(2);
  });
});

describe('latestTopicOf', () => {
  it("takes one owner's newest topic and leaves other owners alone", () => {
    const recents = [
      topic({ agentId: 'inbox', updatedAt: '2026-10-03' }),
      topic({ agentId: 'inbox', lastAssistantMessage: 'newest', updatedAt: '2026-10-06' }),
      topic({ agentId: 'a', updatedAt: '2026-10-09' }),
    ];

    expect(latestTopicOf(recents, 'inbox')?.lastAssistantMessage).toBe('newest');
    expect(latestTopicOf(recents, 'missing')).toBeUndefined();
    // No owner id (inbox unresolved) must not match every topic.
    expect(latestTopicOf(recents, undefined)).toBeUndefined();
  });
});

describe('inboxActivity', () => {
  const direct = (createdAt: string) =>
    ({ lastMessage: { content: 'hi', createdAt } }) as unknown as ChannelListItem;

  it('follows the direct Channel instead of the legacy topics', () => {
    expect(
      inboxActivity('2026-10-02', topic({ updatedAt: '2026-10-09' }), direct('2026-10-05')),
    ).toEqual(new Date('2026-10-05'));
  });

  it('ignores an agent edit newer than the direct Channel latest message', () => {
    expect(inboxActivity('2026-10-09', undefined, direct('2026-10-05'))).toEqual(
      new Date('2026-10-05'),
    );
  });

  it('falls back to the latest topic without a direct Channel', () => {
    expect(inboxActivity('2026-10-02', topic({ updatedAt: '2026-10-09' }))).toEqual(
      new Date('2026-10-09'),
    );
  });
});

describe('latestActivity', () => {
  it('uses the later of the own timestamp and the latest topic', () => {
    expect(latestActivity('2026-10-02', topic({ updatedAt: '2026-10-05' }))).toEqual(
      new Date('2026-10-05'),
    );
    expect(latestActivity('2026-10-07', topic({ updatedAt: '2026-10-05' }))).toEqual(
      new Date('2026-10-07'),
    );
    expect(latestActivity(undefined, undefined)).toBeUndefined();
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
