/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactListBody } from './index';

const fetch = vi.hoisted(() => ({ error: undefined as unknown, mutate: vi.fn() }));
const agentList = vi.hoisted(() => ({ init: false, items: [] as object[] }));
const channels = vi.hoisted(() => ({ enabled: false }));
const contacts = vi.hoisted(() => ({
  listMap: {} as Record<string, object[]>,
  requestsMap: {} as Record<string, object[]>,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/business/client/hooks/useActiveWorkspaceSlug', () => ({
  useActiveWorkspaceSlug: () => null,
}));
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
});
