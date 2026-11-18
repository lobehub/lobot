/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PersonDetailPage from './PersonDetail';

const { navigate, openPeer, openToExternal, removeExternal, state } = vi.hoisted(() => ({
  navigate: vi.fn(),
  openPeer: vi.fn(),
  openToExternal: vi.fn(),
  removeExternal: vi.fn(),
  state: {
    contacts: [] as object[],
    members: [] as object[],
    profile: undefined as object | undefined,
    workspace: null as { id: string; name: string } | null,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en-US' },
    t: (key: string, options?: Record<string, string>) =>
      options ? `${key}(${Object.values(options).join(',')})` : key,
  }),
}));
vi.mock('@/features/NavHeader', () => ({ default: () => null }));
vi.mock('@/components/UserAvatar', () => ({ default: () => null }));
vi.mock('@/business/client/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => state.workspace,
}));
vi.mock('@/business/client/hooks/useWorkspaceMembers', () => ({
  useWorkspaceMembers: () => state.members,
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@/store/channel', () => ({ channelActions: { openPeer } }));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: object) => unknown) => selector({}),
}));
vi.mock('@/store/user/selectors', () => ({ userProfileSelectors: { userId: () => 'u_me' } }));
vi.mock('@/store/contact', async (original) => ({
  ...(await original<object>()),
  contactActions: {
    openToExternal,
    removeExternal,
    useFetchProfile: () => ({ error: undefined }),
    useFetchRequests: vi.fn(),
  },
  useContactStore: (selector: (s: object) => unknown) =>
    selector({
      listMap: { all: state.contacts },
      profileMap: { u_bo: state.profile },
      requestsMap: {},
    }),
}));

/** Bo as one of the active workspace's external contacts, as a member lists them. */
const externalBo = (openedToMe: boolean) => ({
  external: { openedToMe },
  type: 'user',
  user: { id: 'u_bo' },
});

const profile = (relation: string) => ({
  relation,
  sharedAgents: [],
  user: { avatar: null, fullName: 'Bo', id: 'u_bo', username: 'bo' },
});
const renderCard = () =>
  render(
    createElement(
      MemoryRouter,
      { initialEntries: ['/agents/people/u_bo'] },
      createElement(
        Routes,
        {},
        createElement(Route, {
          element: createElement(PersonDetailPage),
          path: '/agents/people/:userId',
        }),
      ),
    ),
  );

describe('PersonDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.contacts = [];
    state.members = [];
    state.workspace = null;
  });

  it("shows a listed contact's name before their profile loads, without any action yet", () => {
    state.profile = undefined;
    state.contacts = [
      { type: 'user', user: { avatar: null, fullName: 'Bo', id: 'u_bo', username: 'bo' } },
    ];
    renderCard();

    expect(screen.getByText('Bo')).toBeInTheDocument();
    expect(screen.getByText('@bo')).toBeInTheDocument();
    expect(screen.queryByText('contacts.sendMessage')).not.toBeInTheDocument();
    expect(screen.queryByText('contacts.person.remove')).not.toBeInTheDocument();
  });

  it('messages a contact in the personal space', async () => {
    state.profile = profile('contact');
    openPeer.mockResolvedValue('chn_peer');
    renderCard();

    fireEvent.click(screen.getByText('contacts.sendMessage'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/channels/chn_peer'));
    expect(openPeer).toHaveBeenCalledWith('u_bo');
  });

  it('messages a fellow workspace member who is not a contact, and shows their profile', () => {
    state.profile = profile('member');
    state.workspace = { id: 'ws_team', name: 'Team' };
    state.members = [
      {
        joinedAt: '2026-09-12T00:00:00Z',
        responsibilities: 'Bots and channels',
        role: 'admin',
        title: 'FDE',
        user: { email: 'bo@example.com' },
        userId: 'u_bo',
      },
    ];
    renderCard();

    expect(screen.getByText('FDE')).toBeInTheDocument();
    expect(screen.getByText('workspace.member.roles.admin')).toBeInTheDocument();
    expect(screen.getByText('bo@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bots and channels')).toBeInTheDocument();
    expect(screen.getByText('contacts.sendMessage')).toBeInTheDocument();
    expect(screen.queryByText('contacts.external.invite')).not.toBeInTheDocument();
  });

  it('invites someone outside the workspace as its external contact', () => {
    state.profile = profile('none');
    state.workspace = { id: 'ws_team', name: 'Team' };
    renderCard();

    expect(screen.getByText('contacts.external.invite')).toBeInTheDocument();
    expect(screen.queryByText('contacts.sendMessage')).not.toBeInTheDocument();
  });

  it('opens myself to an external contact who is not open to me yet', async () => {
    state.profile = profile('none');
    state.workspace = { id: 'ws_team', name: 'Team' };
    state.contacts = [externalBo(false)];
    openToExternal.mockResolvedValue(undefined);
    renderCard();

    expect(screen.getByText('contacts.external.of(Team)')).toBeInTheDocument();
    expect(screen.queryByText('contacts.sendMessage')).not.toBeInTheDocument();
    expect(screen.queryByText('contacts.external.invite')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('contacts.external.open'));
    await waitFor(() => expect(openToExternal).toHaveBeenCalledWith('u_bo'));
  });

  it('messages an external contact open to me, and offers to close', () => {
    state.profile = profile('contact');
    state.workspace = { id: 'ws_team', name: 'Team' };
    state.contacts = [externalBo(true)];
    renderCard();

    expect(screen.getByText('contacts.sendMessage')).toBeInTheDocument();
    expect(screen.getByText('contacts.external.close')).toBeInTheDocument();
    expect(screen.queryByText('contacts.person.remove')).not.toBeInTheDocument();
    // A plain member cannot remove them from the workspace.
    expect(screen.queryByText('contacts.external.remove')).not.toBeInTheDocument();
  });

  it('lets an owner or admin remove an external contact from the workspace', () => {
    state.profile = profile('none');
    state.workspace = { id: 'ws_team', name: 'Team' };
    state.contacts = [externalBo(false)];
    state.members = [{ role: 'owner', userId: 'u_me' }];
    renderCard();

    expect(screen.getByText('contacts.external.remove')).toBeInTheDocument();
  });
});
