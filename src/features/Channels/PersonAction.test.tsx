/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PersonAction } from './PersonAction';

const { contacts, navigate, openPeer, openShareUserCardModal, scope, sendRequest } = vi.hoisted(
  () => ({
    contacts: {
      profileMap: {} as Record<string, unknown>,
      requestsMap: {} as Record<string, unknown[]>,
    },
    navigate: vi.fn(),
    openPeer: vi.fn(),
    openShareUserCardModal: vi.fn(),
    scope: {
      members: [] as Array<{ userId: string }>,
      membersReady: true,
      myId: 'u_me',
      workspace: null as { id: string } | null,
    },
    sendRequest: vi.fn(),
  }),
);

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/business/client/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => scope.workspace,
}));
vi.mock('@/business/client/hooks/useWorkspaceMembers', () => ({
  useWorkspaceMembers: () => scope.members,
  useWorkspaceMembersReady: () => scope.membersReady,
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@/features/ContactCardShare/ShareContactCardModal', () => ({ openShareUserCardModal }));
vi.mock('@/store/channel', () => ({ channelActions: { openPeer } }));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: unknown) => unknown) => selector(undefined),
}));
vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: { userId: () => scope.myId },
}));
vi.mock('@/store/contact', async (original) => ({
  ...(await original<object>()),
  contactActions: {
    acceptRequest: vi.fn(),
    sendRequest,
    useFetchProfile: vi.fn(),
    useFetchRequests: vi.fn(),
  },
  useContactStore: (selector: (s: typeof contacts) => unknown) => selector(contacts),
}));

beforeEach(() => {
  vi.clearAllMocks();
  contacts.profileMap = {};
  contacts.requestsMap = { all: [] };
  scope.members = [{ userId: 'u_me' }, { userId: 'u_ann' }];
  scope.membersReady = true;
  scope.myId = 'u_me';
  scope.workspace = { id: 'ws_1' };
});

describe('PersonAction in a workspace', () => {
  it('messages a fellow member: opens the conversation, then goes there', async () => {
    openPeer.mockResolvedValue('chn_peer');
    render(<PersonAction userId={'u_ann'} />);

    fireEvent.click(screen.getByText('contacts.sendMessage'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.stringContaining('chn_peer')));
    expect(openPeer).toHaveBeenCalledWith('u_ann');
  });

  it('shares a fellow member’s card beside messaging them', () => {
    render(<PersonAction userId={'u_ann'} />);

    fireEvent.click(screen.getByRole('button', { name: 'shareCard' }));

    expect(openShareUserCardModal).toHaveBeenCalledWith('u_ann');
  });

  // The server lets two people talk one-on-one in a workspace only while both are its members.
  it('offers nothing for someone outside the workspace', () => {
    const { container } = render(<PersonAction userId={'u_external'} />);

    expect(container.innerHTML).toBe('');
  });

  it('waits for the roster before deciding', () => {
    scope.membersReady = false;
    render(<PersonAction userId={'u_ann'} />);

    expect(screen.queryByText('contacts.sendMessage')).toBeNull();
    expect(screen.queryByRole('button', { name: 'shareCard' })).toBeNull();
  });
});

describe('PersonAction', () => {
  it('offers only sharing on one’s own card', () => {
    render(<PersonAction userId={'u_me'} />);

    fireEvent.click(screen.getByText('shareCard'));

    expect(openShareUserCardModal).toHaveBeenCalledWith('u_me');
    expect(screen.queryByText('contacts.sendMessage')).toBeNull();
  });

  it('messages a contact in the personal space', () => {
    scope.workspace = null;
    contacts.profileMap = { u_ann: { relation: 'contact' } };
    render(<PersonAction userId={'u_ann'} />);

    expect(screen.getByText('contacts.sendMessage')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'shareCard' })).toBeTruthy();
  });

  it('asks a stranger in the personal space to become a contact instead', () => {
    scope.workspace = null;
    contacts.profileMap = { u_ann: { relation: 'none' } };
    render(<PersonAction userId={'u_ann'} />);

    fireEvent.click(screen.getByText('contacts.person.request'));

    expect(sendRequest).toHaveBeenCalledWith('u_ann');
    expect(screen.queryByText('contacts.sendMessage')).toBeNull();
    expect(screen.queryByRole('button', { name: 'shareCard' })).toBeNull();
  });
});
