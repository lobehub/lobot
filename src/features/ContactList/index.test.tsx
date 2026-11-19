/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGlobalStore } from '@/store/global';

import { ContactListBody } from './index';

const fetch = vi.hoisted(() => ({ error: undefined as unknown, mutate: vi.fn() }));
const agentList = vi.hoisted(() => ({ init: false, items: [] as object[] }));
const channels = vi.hoisted(() => ({ enabled: false }));
const workspace = vi.hoisted(() => ({ activeId: null as string | null, members: [] as object[] }));
const contacts = vi.hoisted(() => ({
  listMap: {} as Record<string, object[]>,
  requestsMap: {} as Record<string, object[]>,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/business/client/hooks/useActiveWorkspaceSlug', () => ({
  useActiveWorkspaceSlug: () => null,
}));
vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  getActiveWorkspaceId: () => workspace.activeId,
  useActiveWorkspaceId: () => workspace.activeId,
}));
vi.mock('@/business/client/hooks/useWorkspaceMembers', () => ({
  useWorkspaceMembers: () => workspace.members,
}));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (state: object) => unknown) => selector({}),
}));
vi.mock('@/store/user/selectors', () => ({ userProfileSelectors: { userId: () => 'u_me' } }));
vi.mock('@/hooks/useActiveLocation', () => ({ useActiveLocation: () => ({ pathname: '/' }) }));
vi.mock('@/hooks/useFetchAgentList', () => ({ useFetchAgentList: () => fetch }));
vi.mock('@/features/Channels/useChannelsEnabled', () => ({
  useChannelsEnabled: () => channels.enabled,
}));
vi.mock('@/store/contact', async (original) => ({
  ...(await original<object>()),
  contactActions: {
    acceptRequest: vi.fn(),
    declineRequest: vi.fn(),
    useFetchList: vi.fn(),
    useFetchRequests: vi.fn(),
  },
  useContactStore: (selector: (state: object) => unknown) => selector(contacts),
}));
vi.mock('@/store/home', () => ({
  useHomeStore: (selector: (state: object) => unknown) => selector({}),
}));
vi.mock('@/store/home/selectors', () => ({
  homeAgentListSelectors: {
    allAgents: () => agentList.items,
    isAgentListInit: () => agentList.init,
  },
}));
vi.mock('@/features/Workspace/WorkspaceLink', () => ({
  default: ({ children, to, ...rest }: { children: ReactNode; to: string }) =>
    createElement('a', { href: to, ...rest }, children),
}));
vi.mock('@/components/Avatar', () => ({ default: () => createElement('span') }));
vi.mock('@/features/NavPanel/components/SkeletonList', () => ({
  default: () => createElement('div', {}, 'Loading contacts'),
}));
vi.mock('@/components/AsyncError', () => ({
  default: ({ onRetry }: { onRetry?: () => void }) =>
    createElement('button', { onClick: onRetry, type: 'button' }, 'Retry contacts'),
}));

beforeEach(() => {
  workspace.activeId = null;
  workspace.members = [];
  channels.enabled = false;
  contacts.listMap = {};
  contacts.requestsMap = {};
  agentList.init = false;
  agentList.items = [];
  fetch.error = undefined;
  fetch.mutate.mockReset();
});

describe('ContactListBody', () => {
  it('shows the skeleton while the first load is in flight', () => {
    render(createElement(ContactListBody));

    expect(screen.getByText('Loading contacts')).toBeInTheDocument();
  });

  it('shows a retryable error when the first load fails', () => {
    fetch.error = new Error('network');

    render(createElement(ContactListBody));

    expect(screen.queryByText('Loading contacts')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry contacts'));
    expect(fetch.mutate).toHaveBeenCalled();
  });

  it('shows each contact as avatar and name only, without the description', () => {
    agentList.init = true;
    agentList.items = [
      { description: 'Turns ideas into product specs', id: 'agt_1', title: 'Product Helper' },
    ];

    render(createElement(ContactListBody));

    expect(screen.getByRole('link', { name: 'Product Helper' })).toHaveTextContent(
      /^Product Helper$/,
    );
    expect(screen.queryByText('Turns ideas into product specs')).not.toBeInTheDocument();
  });

  it('opens the contact card instead of the profile editor', () => {
    agentList.init = true;
    agentList.items = [
      { id: 'agt_1', title: 'Product Helper' },
      { id: 'grp_1', title: 'Launch Crew', type: 'group' },
    ];

    render(createElement(ContactListBody));

    expect(screen.getByRole('link', { name: 'Product Helper' })).toHaveAttribute(
      'href',
      '/agents/agt_1',
    );
    expect(screen.getByRole('link', { name: 'Launch Crew' })).toHaveAttribute(
      'href',
      '/agents/grp_1',
    );
  });

  it('lists people, shared Agents and incoming requests once Channels are on', () => {
    channels.enabled = true;
    agentList.init = true;
    const owner = { avatar: null, fullName: 'Bob', id: 'u_bob', username: 'bob' };
    contacts.listMap = {
      all: [
        { createdAt: new Date(), type: 'user', user: owner },
        {
          agent: {
            agentId: 'agt_shared',
            avatar: null,
            backgroundColor: null,
            description: null,
            owner,
            shareId: 's1',
            slug: 'helper',
            title: 'Bob Helper',
          },
          available: true,
          createdAt: new Date(),
          type: 'agent',
        },
      ],
    };
    contacts.requestsMap = {
      all: [
        {
          createdAt: new Date(),
          direction: 'incoming',
          id: 'r1',
          message: 'hi',
          user: { avatar: null, fullName: 'Carol', id: 'u_carol', username: 'carol' },
        },
        {
          createdAt: new Date(),
          direction: 'outgoing',
          id: 'r2',
          message: null,
          user: { avatar: null, fullName: 'Dan', id: 'u_dan', username: 'dan' },
        },
      ],
    };

    render(createElement(ContactListBody));

    expect(screen.getByRole('link', { name: /Bob$/ })).toHaveAttribute(
      'href',
      '/agents/people/u_bob',
    );
    expect(screen.getByRole('link', { name: /Bob Helper/ })).toHaveAttribute(
      'href',
      '/agents/agt_shared',
    );
    expect(screen.getByRole('link', { name: /Carol/ })).toHaveAttribute(
      'href',
      '/agents/people/u_carol',
    );
    // Shared Agents sit inside the people section, right below the people.
    expect(screen.queryByText('contacts.sharedAgents')).not.toBeInTheDocument();
    const people = screen.getByRole('link', { name: /Bob$/ });
    const sharedAgent = screen.getByRole('link', { name: /Bob Helper/ });
    expect(people.compareDocumentPosition(sharedAgent)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText('contacts.people').nextElementSibling).toHaveTextContent('2');
    // Only requests waiting for my answer are listed.
    expect(screen.queryByText('Dan')).not.toBeInTheDocument();
  });

  it('keeps people and requests out without Channels', () => {
    agentList.init = true;
    contacts.listMap = {
      all: [{ createdAt: new Date(), type: 'user', user: { fullName: 'Bob', id: 'u_bob' } }],
    };

    render(createElement(ContactListBody));

    expect(screen.queryByText('contacts.people')).not.toBeInTheDocument();
  });

  it('leaves people and groups out of a workspace’s member list, pinned or not', () => {
    channels.enabled = true;
    agentList.init = true;
    workspace.activeId = 'ws_team';
    agentList.items = [
      { id: 'agt_1', title: 'Product Helper' },
      { id: 'grp_1', title: 'Launch Crew', type: 'group' },
      { id: 'grp_2', pinned: true, title: 'Pinned Crew', type: 'group' },
    ];
    contacts.listMap = {
      all: [{ createdAt: new Date(), type: 'user', user: { fullName: 'Bob', id: 'u_bob' } }],
    };

    render(createElement(ContactListBody));

    expect(screen.queryByText('contacts.people')).not.toBeInTheDocument();
    expect(screen.queryByText('contacts.groups')).not.toBeInTheDocument();
    expect(screen.queryByText('contacts.pinned')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Bob' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Launch Crew' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pinned Crew' })).not.toBeInTheDocument();
  });

  it('lists shared Agents among a workspace’s assistants, tagged as external', () => {
    channels.enabled = true;
    agentList.init = true;
    workspace.activeId = 'ws_team';
    agentList.items = [{ id: 'agt_1', title: 'Product Helper' }];
    contacts.listMap = {
      all: [
        {
          agent: {
            agentId: 'agt_shared',
            owner: { fullName: 'Bob', id: 'u_bob' },
            title: 'Bob Helper',
          },
          available: true,
          createdAt: new Date(),
          type: 'agent',
        },
      ],
    };

    render(createElement(ContactListBody));

    const own = screen.getByRole('link', { name: 'Product Helper' });
    const sharedAgent = screen.getByRole('link', { name: /Bob Helper/ });
    expect(own.compareDocumentPosition(sharedAgent)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(sharedAgent).toHaveTextContent('contacts.agent.external');
    expect(screen.getByText('navPanel.agent').nextElementSibling).toHaveTextContent('2');
  });

  it('lists the workspace’s other members, with their role unless a plain member', () => {
    channels.enabled = true;
    agentList.init = true;
    workspace.activeId = 'ws_team';
    workspace.members = [
      { role: 'owner', user: { fullName: 'Me' }, userId: 'u_me' },
      { role: 'admin', user: { fullName: 'Ada' }, userId: 'u_ada' },
      { role: 'member', user: { username: 'bo' }, userId: 'u_bo' },
    ];

    render(createElement(ContactListBody));

    expect(screen.getByText('contacts.members')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ada' })).toHaveAttribute(
      'href',
      '/agents/people/u_ada',
    );
    expect(screen.getByText('workspace.member.roles.admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'bo' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Me' })).not.toBeInTheDocument();
    expect(screen.queryByText('workspace.member.roles.member')).not.toBeInTheDocument();
  });

  it('lists the workspace’s external contacts apart, marking who is not open to me', () => {
    channels.enabled = true;
    agentList.init = true;
    workspace.activeId = 'ws_team';
    contacts.listMap = {
      all: [
        {
          createdAt: new Date(),
          external: { openedToMe: true },
          type: 'user',
          user: { fullName: 'Eve', id: 'u_eve' },
        },
        {
          createdAt: new Date(),
          external: { openedToMe: false },
          type: 'user',
          user: { fullName: 'Fay', id: 'u_fay' },
        },
      ],
    };

    render(createElement(ContactListBody));

    expect(screen.getByText('contacts.externals').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: 'Eve' })).toHaveAttribute(
      'href',
      '/agents/people/u_eve',
    );
    expect(screen.getAllByText('contacts.external.notOpened')).toHaveLength(1);
  });

  it('names the workspace an invitation to be its external contact comes from', () => {
    channels.enabled = true;
    agentList.init = true;
    contacts.requestsMap = {
      all: [
        {
          createdAt: new Date(),
          direction: 'incoming',
          id: 'r1',
          message: null,
          user: { fullName: 'Gus', id: 'u_gus' },
          workspace: { avatar: null, id: 'ws_team', name: 'Team' },
        },
      ],
    };

    render(createElement(ContactListBody));

    expect(screen.getByRole('link', { name: /Gus/ })).toHaveTextContent('Team');
  });

  it('has no members section in the personal space', () => {
    channels.enabled = true;
    agentList.init = true;

    render(createElement(ContactListBody));

    expect(screen.queryByText('contacts.members')).not.toBeInTheDocument();
    expect(screen.queryByText('contacts.externals')).not.toBeInTheDocument();
  });
});

describe('ContactListBody section collapse', () => {
  beforeEach(() => {
    // Status writes are dropped until the persisted status has loaded.
    useGlobalStore.setState((s) => ({
      isStatusInit: true,
      status: { ...s.status, contactListCollapsedSections: undefined },
    }));
  });

  it('remembers a collapsed section across remounts', () => {
    agentList.init = true;
    agentList.items = [{ id: 'agt_1', title: 'Product Helper' }];

    const { unmount } = render(createElement(ContactListBody));
    expect(screen.getByRole('button', { name: /navPanel.agent/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: /navPanel.agent/ }));
    expect(useGlobalStore.getState().status.contactListCollapsedSections).toEqual(['agents']);
    unmount();

    render(createElement(ContactListBody));
    expect(screen.getByRole('button', { name: /navPanel.agent/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('keeps a hidden section collapsed while another one toggles', () => {
    agentList.init = true;
    agentList.items = [{ id: 'agt_1', title: 'Product Helper' }];
    useGlobalStore.setState((s) => ({
      status: { ...s.status, contactListCollapsedSections: ['requests'] },
    }));

    render(createElement(ContactListBody));
    fireEvent.click(screen.getByRole('button', { name: /navPanel.agent/ }));

    expect(useGlobalStore.getState().status.contactListCollapsedSections).toEqual([
      'requests',
      'agents',
    ]);
  });
});
