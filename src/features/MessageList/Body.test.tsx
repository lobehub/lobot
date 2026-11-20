/**
 * @vitest-environment happy-dom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Body from './Body';
import { resetWorkspaceListMemory } from './holdWorkspaceList';

const listeners = vi.hoisted(() => new Set<() => void>());
const home = vi.hoisted(() => ({
  pinnedLayout: 'tiles' as 'tiles' | 'rows',
  channels: [] as Record<string, unknown>[] | undefined,
  channelsError: undefined as unknown,
  pathname: '/',
  query: '',
  error: undefined as unknown,
  isInit: false,
  items: [] as unknown[],
  listHydrated: undefined as boolean | undefined,
  mutate: () => {},
  notify() {
    this.revision += 1;
    listeners.forEach((listener) => listener());
  },
  revision: 0,
  sections: undefined as Record<string, unknown>[] | undefined,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  workspaceId: null as string | null,
}));

const openAddContactModal = vi.hoisted(() => vi.fn());
vi.mock('@/features/AddContactModal', () => ({ openAddContactModal }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

vi.mock('@/business/client/hooks/useActiveWorkspaceSlug', () => ({
  useActiveWorkspaceSlug: () => null,
}));
vi.mock('@/business/client/hooks/useActiveWorkspaceId', async (importOriginal) => {
  const { useSyncExternalStore } = await import('react');
  const actual = (await importOriginal()) as {
    getActiveWorkspaceId: () => string | null;
    useActiveWorkspaceId: () => string | null;
  };
  return {
    ...actual,
    useActiveWorkspaceId: () => {
      useSyncExternalStore(home.subscribe, () => home.revision);
      return home.workspaceId;
    },
  };
});
vi.mock('@/hooks/useActiveLocation', () => ({
  useActiveLocation: () => ({ pathname: home.pathname }),
}));
const setSectionCollapsed = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/store/channel', () => ({
  channelActions: {
    refreshList: () => {},
    setSectionCollapsed,
    useFetchList: () => ({ error: home.channelsError, isHydrated: home.listHydrated }),
    useFetchSections: () => ({ isHydrated: home.listHydrated }),
  },
  channelSelectors: { list: () => home.channels, sections: () => home.sections },
  useChannelStore: (selector: (state: object) => unknown) => selector({}),
}));
vi.mock('@/store/project', () => ({
  useCurrentProjectList: () => [{ avatar: null, id: 'pro_1', name: 'Apollo' }],
  useProjectStore: (selector: (state: object) => unknown) =>
    selector({ useFetchProjectList: () => ({}) }),
}));
vi.mock('@/features/Channels/useChannelEvents', () => ({ useChannelEvents: () => {} }));
vi.mock('./SearchContext', () => ({
  useMessageSearch: () => ({ query: home.query, setQuery: () => {} }),
}));
vi.mock('@/features/NavPanel/components/NavItem', () => ({
  default: ({ onClick, title }: { onClick: () => void; title: string }) =>
    createElement('button', { onClick }, title),
}));
vi.mock('@/hooks/useFetchAgentList', () => ({
  useFetchAgentList: () => ({
    error: home.error,
    isHydrated: home.listHydrated,
    mutate: home.mutate,
  }),
}));
vi.mock('@/components/AsyncError', () => ({
  default: ({ error, onRetry }: { error: unknown; onRetry: () => void }) =>
    createElement('button', { onClick: onRetry }, `Failed: ${String(error)}`),
}));
vi.mock('@/features/AgentRoute/useResolvedAgentRouteId', () => ({
  resolveInboxAgentRouteId: (id: string) => id,
}));

vi.mock('@/store/user/selectors', async (importOriginal) => {
  const actual = await importOriginal<{ userGeneralSettingsSelectors: object }>();
  return {
    ...actual,
    userGeneralSettingsSelectors: {
      ...actual.userGeneralSettingsSelectors,
      pinnedConversationLayout: () => home.pinnedLayout,
    },
  };
});

vi.mock('@/store/home', () => ({
  useHomeStore: (selector: (state: object) => unknown) => selector({}),
}));
vi.mock('@/store/home/selectors', () => ({
  homeAgentListSelectors: { allAgents: () => home.items, isAgentListInit: () => home.isInit },
}));
vi.mock('@/store/agent', () => ({
  useAgentStore: (selector: (state: object) => unknown) => selector({ agentMap: {} }),
}));
vi.mock('@/store/agent/selectors', () => ({
  agentSelectors: { getAgentMetaById: () => () => ({ title: 'Lobe AI' }) },
  builtinAgentSelectors: { inboxAgentId: () => 'inbox' },
}));

vi.mock('./ChannelConversation', () => ({
  default: ({ active, channel }: { active: boolean; channel: { title: string } }) =>
    createElement('div', { 'aria-current': active ? 'page' : undefined }, `# ${channel.title}`),
}));
vi.mock('@/features/NavPanel/components/SkeletonList', () => ({
  default: () => createElement('div', {}, 'Loading agents'),
}));
vi.mock('./InboxConversation', () => ({
  default: () => createElement('div', {}, 'Lobe AI row'),
}));
vi.mock('./AgentConversation', () => ({
  default: ({
    active,
    conversation,
    variant = 'row',
  }: {
    active: boolean;
    conversation: { item: { title: string } };
    variant?: 'row' | 'tile';
  }) =>
    createElement(
      'div',
      { 'aria-current': active ? 'page' : undefined, 'data-variant': variant },
      conversation.item.title,
    ),
}));
vi.mock('./GroupConversation', () => ({ default: () => null }));

beforeEach(() => {
  resetWorkspaceListMemory();
  home.channels = [
    {
      agentId: null,
      createdAt: new Date('2026-10-01'),
      id: 'chn_team',
      projectId: null,
      status: 'active',
      title: 'Team',
    },
  ];
  home.channelsError = undefined;
  home.pathname = '/';
  home.pinnedLayout = 'tiles';
  home.query = '';
  home.error = undefined;
  home.isInit = false;
  home.items = [];
  home.listHydrated = undefined;
  home.sections = undefined;
  home.workspaceId = null;
});

/** Lobe AI's direct Channel the person unpinned, so only the pins under test lead the list. */
const unpinnedInbox = () => ({
  agentId: 'inbox',
  createdAt: new Date(),
  id: 'chn_inbox',
  pinnedAt: null,
  title: 'Lobe AI',
});

describe('MessageList Body', () => {
  // Regression: Channels waited for the server's runtime config, which a cold start fetches over
  // the network. Until it answered the list painted Lobe AI alone as a plain row, then filled in
  // its Channels and pinned it. Channels are always on now: no server config is mounted here.
  it('lists Channels and pins Lobe AI on the first paint, without the server config', () => {
    home.isInit = true;

    render(createElement(Body));

    expect(screen.getByRole('group', { name: 'navPanel.pinned' })).toHaveTextContent('Lobe AI row');
    expect(screen.getByText('# Team')).toBeInTheDocument();
  });

  it('pins Lobe AI for a new person, before its direct Channel exists', () => {
    home.isInit = true;

    render(createElement(Body));

    expect(screen.getByRole('group', { name: 'navPanel.pinned' })).toHaveTextContent('Lobe AI row');
  });

  it('leaves Lobe AI unpinned once the person unpinned its direct Channel', () => {
    home.isInit = true;
    home.channels.push(unpinnedInbox());

    render(createElement(Body));

    expect(screen.queryByRole('group', { name: 'navPanel.pinned' })).not.toBeInTheDocument();
    expect(screen.getByText('Lobe AI row')).toBeInTheDocument();
  });

  it('keeps Lobe AI and Channels visible while the agent list is unresolved', () => {
    render(createElement(Body));

    expect(screen.getByText('Lobe AI row')).toBeInTheDocument();
    expect(screen.getByText('# Team')).toBeInTheDocument();
    expect(screen.getByText('Loading agents')).toBeInTheDocument();
  });

  it('replaces the agent skeleton with an error, keeping Lobe AI and Channels', () => {
    home.error = new Error('network');

    render(createElement(Body));

    expect(screen.getByText('Failed: Error: network')).toBeInTheDocument();
    expect(screen.queryByText('Loading agents')).not.toBeInTheDocument();
    expect(screen.getByText('Lobe AI row')).toBeInTheDocument();
    expect(screen.getByText('# Team')).toBeInTheDocument();
  });

  it('drops the agent skeleton once the list arrives', () => {
    home.isInit = true;
    home.items = [
      { id: 'a', pinned: false, title: 'Agent A', type: 'agent', updatedAt: new Date() },
    ];
    home.channels.push({ agentId: 'a', createdAt: new Date(), id: 'chn_a', projectId: null });

    render(createElement(Body));

    expect(screen.getByText('Agent A')).toBeInTheDocument();
    expect(screen.queryByText('Loading agents')).not.toBeInTheDocument();
    expect(screen.getByText('# Team')).toBeInTheDocument();
  });

  // Each pinned row used to paint its own tinted card, so the pinned rows read as separate items.
  it('renders the pinned rows together in one block', () => {
    home.isInit = true;
    home.items = [
      { id: 'p1', pinned: false, title: 'Pinned 1', type: 'agent', updatedAt: new Date() },
      { id: 'p2', pinned: false, title: 'Pinned 2', type: 'agent', updatedAt: new Date() },
      { id: 'a', pinned: false, title: 'Agent A', type: 'agent', updatedAt: new Date() },
    ];
    // Pinned by this person through their direct Channels with the two Agents; Lobe AI unpinned.
    home.channels = [
      ...['p1', 'p2'].map((agentId) => ({
        agentId,
        createdAt: new Date(),
        id: `chn_${agentId}`,
        pinnedAt: new Date(),
        title: agentId,
      })),
      unpinnedInbox(),
    ];

    render(createElement(Body));

    const group = screen.getByRole('group', { name: 'navPanel.pinned' });
    expect(group).toHaveTextContent('Pinned 1');
    expect(group).toHaveTextContent('Pinned 2');
    expect(group).not.toHaveTextContent('Agent A');
    expect(group).not.toHaveTextContent('Lobe AI row');
  });

  it('keeps the painted list until the next workspace has loaded', () => {
    home.isInit = true;
    home.listHydrated = true;
    home.workspaceId = 'ws-a';
    home.items = [
      { id: 'p1', pinned: false, title: 'Pinned 1', type: 'agent', updatedAt: new Date() },
    ];
    home.channels = [
      {
        agentId: 'p1',
        createdAt: new Date(),
        id: 'chn_p1',
        pinnedAt: new Date(),
        title: 'p1',
      },
      unpinnedInbox(),
    ];

    render(createElement(Body));
    expect(screen.getByRole('group', { name: 'navPanel.pinned' })).toHaveTextContent('Pinned 1');

    home.workspaceId = 'ws-b';
    home.listHydrated = false;
    home.isInit = false;
    home.items = [];
    home.channels = [];
    act(() => home.notify());

    expect(screen.getByRole('group', { name: 'navPanel.pinned' })).toHaveTextContent('Pinned 1');
    expect(screen.queryByText('Loading agents')).not.toBeInTheDocument();

    home.listHydrated = true;
    home.isInit = true;
    home.items = [{ id: 'n', pinned: false, title: 'Next', type: 'agent', updatedAt: new Date() }];
    home.channels = [
      { agentId: 'n', createdAt: new Date(), id: 'chn_n', pinnedAt: null, title: 'n' },
      unpinnedInbox(),
    ];
    act(() => home.notify());

    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.queryByText('Pinned 1')).not.toBeInTheDocument();

    home.workspaceId = 'ws-a';
    home.isInit = false;
    home.items = [];
    home.channels = undefined;
    act(() => home.notify());

    expect(screen.getByRole('group', { name: 'navPanel.pinned' })).toHaveTextContent('Pinned 1');
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading agents')).not.toBeInTheDocument();
  });

  it('keeps the pin block while the channel list has not caught up', () => {
    home.isInit = true;
    home.workspaceId = 'ws-a';
    home.items = [
      { id: 'p1', pinned: false, title: 'Pinned 1', type: 'agent', updatedAt: new Date() },
    ];
    home.channels = [
      {
        agentId: 'p1',
        createdAt: new Date(),
        id: 'chn_p1',
        pinnedAt: new Date(),
        title: 'p1',
      },
      unpinnedInbox(),
    ];

    render(createElement(Body));
    expect(screen.getByRole('group', { name: 'navPanel.pinned' })).toHaveTextContent('Pinned 1');

    home.isInit = true;
    home.channels = undefined;
    act(() => home.notify());

    expect(screen.getByRole('group', { name: 'navPanel.pinned' })).toHaveTextContent('Pinned 1');
    expect(screen.queryByText('Loading agents')).not.toBeInTheDocument();
  });

  describe('pinned layout setting', () => {
    const pinAgents = (count: number) => {
      home.isInit = true;
      const ids = Array.from({ length: count }, (_, i) => `p${i + 1}`);
      home.items = ids.map((id) => ({
        id,
        pinned: false,
        title: `Pinned ${id}`,
        type: 'agent',
        updatedAt: new Date(),
      }));
      home.channels = [
        ...ids.map((agentId) => ({
          agentId,
          createdAt: new Date(),
          id: `chn_${agentId}`,
          pinnedAt: new Date(),
          title: agentId,
        })),
        unpinnedInbox(),
      ];
    };
    const pinnedVariants = () =>
      [...screen.getByRole('group', { name: 'navPanel.pinned' }).children].map((node) =>
        node.getAttribute('data-variant'),
      );

    it('keeps many pins as tiles by default', () => {
      pinAgents(7);
      render(createElement(Body));

      expect(pinnedVariants()).toEqual(Array.from({ length: 7 }, () => 'tile'));
    });

    it('lists more than six pins as rows when the person picks rows', () => {
      home.pinnedLayout = 'rows';
      pinAgents(7);
      render(createElement(Body));

      expect(pinnedVariants()).toEqual(Array.from({ length: 7 }, () => 'row'));
    });

    it('keeps six pins as tiles even with rows picked', () => {
      home.pinnedLayout = 'rows';
      pinAgents(6);
      render(createElement(Body));

      expect(pinnedVariants()).toEqual(Array.from({ length: 6 }, () => 'tile'));
    });
  });

  it("groups the person's own sections between the pinned rows and the rest", () => {
    home.isInit = true;
    home.sections = [
      { collapsed: false, id: 'sec_work', name: 'Work', sort: 0 },
      { collapsed: true, id: 'sec_later', name: 'Later', sort: 1 },
    ];
    home.channels = [
      { agentId: null, createdAt: new Date(), id: 'chn_a', sectionId: 'sec_work', title: 'Alpha' },
      { agentId: null, createdAt: new Date(), id: 'chn_b', sectionId: 'sec_later', title: 'Beta' },
      { agentId: null, createdAt: new Date(), id: 'chn_c', title: 'Gamma' },
    ];

    render(createElement(Body));

    expect(screen.getByRole('group', { name: 'Work' })).toHaveTextContent('# Alpha');
    // A folded section keeps its header but not its rows.
    expect(screen.getByRole('group', { name: 'Later' })).not.toHaveTextContent('# Beta');
    expect(screen.queryByText('# Beta')).not.toBeInTheDocument();
    // Chats outside every section gather under Ungrouped, with no divider beneath the sections.
    const ungrouped = screen.getByRole('group', { name: 'section.ungrouped' });
    expect(ungrouped).toHaveTextContent('# Gamma');

    const workHeader = screen.getByRole('button', { name: 'Work' });
    expect(workHeader.firstElementChild).toHaveTextContent('Work');
    expect(workHeader.firstElementChild?.querySelector('svg')).toBeNull();
    expect(workHeader.querySelector('svg')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'section.ungrouped' }));
    expect(screen.queryByText('# Gamma')).not.toBeInTheDocument();
    expect(setSectionCollapsed).not.toHaveBeenCalled();
  });

  // Every agent and group got a row, so the list read like Contacts instead of open conversations.
  // A conversation is a direct Channel: an Agent's old topics no longer give it a row.
  it('lists only agents with a direct Channel, and every agent while searching', () => {
    home.isInit = true;
    home.items = [
      { id: 'b', pinned: false, title: 'Idle', type: 'agent', updatedAt: new Date() },
      { id: 'c', pinned: false, title: 'Direct', type: 'agent', updatedAt: new Date() },
    ];
    home.channels = [{ agentId: 'c', createdAt: new Date(), id: 'chn_c', projectId: null }];

    const { unmount } = render(createElement(Body));

    expect(screen.getByText('Direct')).toBeInTheDocument();
    expect(screen.queryByText('Idle')).not.toBeInTheDocument();

    unmount();
    home.query = 'idle';
    render(createElement(Body));

    expect(screen.getByText('Idle')).toBeInTheDocument();
  });
});

describe('MessageList Body Channel rows', () => {
  const channel = (patch: Record<string, unknown>) => ({
    agentId: null,
    createdAt: new Date('2026-10-01'),
    projectId: null,
    status: 'active',
    ...patch,
  });

  it('lists group and project Channels as rows, leaving out direct and archived ones', () => {
    home.channels = [
      channel({ id: 'chn_team', title: 'Team' }),
      channel({ agentId: 'agt_nasa', id: 'chn_direct', title: 'Nasa' }),
      channel({ id: 'chn_project', projectId: 'pro_1', title: 'Project' }),
      channel({ id: 'chn_archived', status: 'archived', title: 'Old' }),
    ];

    render(createElement(Body));

    expect(screen.getByText('# Team')).toBeInTheDocument();
    expect(screen.queryByText('# Nasa')).not.toBeInTheDocument();
    expect(screen.getByText('# Project')).toBeInTheDocument();
    expect(screen.queryByText('# Old')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'section.ungrouped' })).not.toBeInTheDocument();
  });

  it('keeps an archived Channel listed while it is open, and highlights it', () => {
    home.pathname = '/channels/chn_archived';
    home.channels = [channel({ id: 'chn_archived', status: 'archived', title: 'Old' })];

    render(createElement(Body));

    expect(screen.getByText('# Old')).toHaveAttribute('aria-current', 'page');
  });

  // Archived Channels are reached by search only; the list ends without an archived group.
  it('ends the list without an archived group', () => {
    home.channels = [
      channel({ id: 'chn_team', title: 'Team' }),
      channel({ id: 'chn_archived', status: 'archived', title: 'Old' }),
    ];

    render(createElement(Body));

    expect(screen.getByText('# Team')).toBeInTheDocument();
    expect(screen.queryByText('# Old')).not.toBeInTheDocument();
    expect(screen.queryByText('archivedGroup')).not.toBeInTheDocument();
  });

  it('finds archived Channels by search', () => {
    home.query = 'old';
    home.channels = [channel({ id: 'chn_archived', status: 'archived', title: 'Old' })];

    render(createElement(Body));

    expect(screen.getByText('# Old')).toBeInTheDocument();
    expect(screen.queryByText('archivedGroup')).not.toBeInTheDocument();
  });
});

describe('MessageList Body active row', () => {
  const agent = {
    id: 'agt_nasa',
    pinned: false,
    title: 'Nasa',
    type: 'agent',
    updatedAt: new Date(),
  };

  it.each([
    ['its Agent page', '/agent/agt_nasa'],
    ['its direct Channel', '/channels/chn_000000000001'],
  ])('highlights an Agent row while %s is open', (_, pathname) => {
    home.isInit = true;
    home.items = [agent];
    home.pathname = pathname;
    home.channels = [{ agentId: 'agt_nasa', id: 'chn_000000000001' }];

    render(createElement(Body));

    expect(screen.getByText('Nasa')).toHaveAttribute('aria-current', 'page');
  });

  it('leaves Agent rows unhighlighted inside a group Channel', () => {
    home.isInit = true;
    home.items = [agent];
    home.pathname = '/channels/chn_000000000002';
    home.channels = [
      { agentId: 'agt_nasa', id: 'chn_000000000001' },
      { agentId: null, id: 'chn_000000000002' },
    ];

    render(createElement(Body));

    expect(screen.getByText('Nasa')).not.toHaveAttribute('aria-current');
  });
});

describe('MessageList Body ordering', () => {
  const row = (id: string, updatedAt: string) => ({
    id,
    pinned: false,
    title: id,
    type: 'agent',
    updatedAt: new Date(updatedAt),
  });
  it('moves Lobe AI up by its latest conversation, not its configuration time', () => {
    home.items = [row('a', '2026-10-01')];
    home.channels = [
      { agentId: 'inbox', createdAt: new Date('2026-10-06'), id: 'chn_inbox', projectId: null },
      { agentId: 'a', createdAt: new Date('2026-10-03'), id: 'chn_a', projectId: null },
    ];

    const { container } = render(createElement(Body));
    const text = container.textContent ?? '';

    expect(text).toContain('Lobe AI row');
    expect(text.indexOf('Lobe AI row')).toBeLessThan(text.indexOf('a'));
  });
});

describe('MessageList Body network search', () => {
  beforeEach(() => {
    home.isInit = true;
    openAddContactModal.mockClear();
  });

  // Searching only looked through my own conversations, with no way to find someone new.
  it('ends a search with a row that looks the query up as a person or an Agent', () => {
    home.query = ' canisminor ';

    render(createElement(Body));

    fireEvent.click(screen.getByRole('button', { name: /messageList\.networkSearch/ }));
    expect(screen.getByText('canisminor')).toBeInTheDocument();
    expect(openAddContactModal).toHaveBeenCalledWith('canisminor');
  });

  it('offers no lookup without a query', () => {
    render(createElement(Body));
    expect(screen.queryByText('messageList.networkSearch')).not.toBeInTheDocument();
  });
});
