/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PersonDetailPage from './PersonDetail';

const { navigate, openPeer, state } = vi.hoisted(() => ({
  navigate: vi.fn(),
  openPeer: vi.fn(),
  state: {
    members: [] as object[],
    profile: undefined as object | undefined,
    workspace: null as { id: string; name: string } | null,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
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
vi.mock('@/store/contact', async (original) => ({
  ...(await original<object>()),
  contactActions: { useFetchProfile: () => ({ error: undefined }), useFetchRequests: vi.fn() },
  useContactStore: (selector: (s: object) => unknown) =>
    selector({ profileMap: { u_bo: state.profile }, requestsMap: {} }),
}));

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
    state.members = [];
    state.workspace = null;
  });

  it('messages a contact in the personal space', async () => {
    state.profile = profile('contact');
    openPeer.mockResolvedValue('chn_peer');
    renderCard();

    fireEvent.click(screen.getByText('contacts.sendMessage'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/channels/chn_peer'));
    expect(openPeer).toHaveBeenCalledWith('u_bo');
  });

  it('messages a fellow workspace member who is not a contact, and names their role', () => {
    state.profile = profile('none');
    state.workspace = { id: 'ws_team', name: 'Team' };
    state.members = [{ role: 'admin', userId: 'u_bo' }];
    renderCard();

    expect(
      screen.getByText('contacts.person.memberOf(workspace.member.roles.admin,Team)'),
    ).toBeInTheDocument();
    expect(screen.getByText('contacts.sendMessage')).toBeInTheDocument();
    expect(screen.getByText('contacts.person.request')).toBeInTheDocument();
  });

  it('offers no message in a workspace the person is not in, even to a contact', () => {
    state.profile = profile('contact');
    state.workspace = { id: 'ws_team', name: 'Team' };
    renderCard();

    expect(screen.queryByText('contacts.sendMessage')).not.toBeInTheDocument();
    expect(screen.getByText('contacts.person.remove')).toBeInTheDocument();
  });
});
