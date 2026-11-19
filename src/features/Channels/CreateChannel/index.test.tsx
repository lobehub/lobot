import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openCreateChannel, openInviteMembers } from '.';

const mocks = vi.hoisted(() => ({
  create: vi.fn(async () => 'chn_new'),
  createModal: vi.fn(() => ({})),
  updateVisibility: vi.fn(async () => ({})),
  workspaceId: null as string | null,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('i18next', () => ({ t: (key: string) => key }));
vi.mock('@lobehub/ui', () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button disabled={disabled} type={'button'} onClick={onClick}>
      {children}
    </button>
  ),
  createModal: mocks.createModal,
  Flexbox: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  Input: ({ id }: { id?: string }) => <input data-testid={id} />,
  Switch: ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <input
      aria-label={'private'}
      checked={checked}
      type={'checkbox'}
      onChange={(event) => onChange(event.target.checked)}
    />
  ),
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Tooltip: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div title={title}>{children}</div>
  ),
  toast: { warning: vi.fn() },
  useModalContext: () => ({ close: vi.fn(), setCanDismissByClickOutside: vi.fn() }),
}));
vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  useActiveWorkspaceId: () => mocks.workspaceId,
}));
vi.mock('@/components/AsyncError', () => ({ default: () => null }));
vi.mock('@/services/channel', () => ({
  channelService: { updateVisibility: mocks.updateVisibility },
}));
vi.mock('@/store/channel', () => ({ channelActions: { create: mocks.create } }));
vi.mock('../privateAgentJoin', () => ({
  confirmPublishPrivateAgents: async () => {},
  ownPrivateAgentIds: () => [],
}));
vi.mock('./MemberSelection', () => ({
  MemberSelection: ({
    footer,
    notice,
    people,
  }: {
    footer?: ReactNode;
    notice?: ReactNode;
    people?: { onChange: (people: { userId: string }[]) => void };
  }) => (
    <div data-testid={'members'}>
      {notice}
      {people && (
        <button type={'button'} onClick={() => people.onChange([{ userId: 'usr_3' }])}>
          pick person
        </button>
      )}
      {footer}
    </div>
  ),
}));
vi.mock('./PeopleOptions', () => ({ usePersonName: () => () => '' }));
vi.mock('./useChannelAgentOptions', () => ({
  useChannelAgentOptions: () => ({ agents: [] }),
}));

const renderDialog = (open: () => void) => {
  open();
  render(mocks.createModal.mock.calls.at(-1)![0].content);
};

const submit = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'submit' }));
  await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
  return mocks.create.mock.calls[0][0] as Record<string, unknown>;
};

describe('CreateChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspaceId = null;
  });

  it('asks the name and members in one step, and creates a general Channel', async () => {
    renderDialog(() => openCreateChannel());
    expect(screen.getByTestId('channel-title')).toBeInTheDocument();
    expect(screen.getByTestId('members')).toBeInTheDocument();
    const payload = await submit();
    expect(payload).not.toHaveProperty('projectId');
    expect(payload).not.toHaveProperty('joinProject');
  });

  it('opens a new workspace Channel to the workspace unless it is made private', async () => {
    mocks.workspaceId = 'ws_1';
    renderDialog(() => openCreateChannel());
    expect(screen.getByRole('checkbox', { name: 'private' })).not.toBeChecked();
    expect(screen.getByTitle('create.privateHint')).toBeInTheDocument();
    await submit();
    await waitFor(() => expect(mocks.updateVisibility).toHaveBeenCalledWith('chn_new', 'public'));
  });

  it('leaves a private workspace Channel invite-only', async () => {
    mocks.workspaceId = 'ws_1';
    renderDialog(() => openCreateChannel());
    fireEvent.click(screen.getByRole('checkbox', { name: 'private' }));
    await submit();
    expect(mocks.updateVisibility).not.toHaveBeenCalled();
  });

  it('asks nothing about privacy outside a workspace', () => {
    renderDialog(() => openCreateChannel());
    expect(screen.queryByRole('checkbox', { name: 'private' })).toBeNull();
  });

  it('goes straight to members when inviting into an existing Channel', () => {
    renderDialog(() =>
      openInviteMembers({ agentIds: [], id: 'chn_1', peopleCount: 1, workspaceId: null }),
    );
    expect(screen.queryByTestId('channel-title')).toBeNull();
    expect(screen.getByTestId('members')).toBeInTheDocument();
  });

  it('starts a new group with both people when inviting from a conversation between two', async () => {
    const onCreated = vi.fn();
    renderDialog(() =>
      openInviteMembers(
        {
          agentIds: [],
          id: 'chn_peer',
          peer: { name: 'yaocai', userId: 'usr_2' },
          peopleCount: 2,
          workspaceId: 'ws_1',
        },
        onCreated,
      ),
    );
    expect(screen.getByTestId('channel-title')).toBeInTheDocument();
    expect(screen.queryByText('invite.directHint')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'pick person' }));
    expect(await submit()).toMatchObject({ agents: [], userIds: ['usr_2', 'usr_3'] });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('chn_new'));
    // The conversation between the two stays as it is.
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('channelId');
  });
});
