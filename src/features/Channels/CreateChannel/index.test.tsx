import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openCreateChannel, openInviteMembers } from '.';

const mocks = vi.hoisted(() => ({
  create: vi.fn(async () => 'chn_new'),
  createModal: vi.fn(),
  optionsProjectIds: [] as (string | undefined)[],
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
  Input: () => null,
  Switch: ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <input
      aria-label={'private'}
      checked={checked}
      type={'checkbox'}
      onChange={(event) => onChange(event.target.checked)}
    />
  ),
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
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
    people,
  }: {
    people?: { onChange: (people: { userId: string }[]) => void };
  }) => (
    <div data-testid={'members'}>
      {people && (
        <button type={'button'} onClick={() => people.onChange([{ userId: 'usr_3' }])}>
          pick person
        </button>
      )}
    </div>
  ),
}));
vi.mock('./PeopleOptions', () => ({ usePersonName: () => () => '' }));
vi.mock('./useChannelAgentOptions', () => ({
  useChannelAgentOptions: (projectId?: string) => {
    mocks.optionsProjectIds.push(projectId);
    return { agents: [] };
  },
}));
vi.mock('./ScopeField', () => ({
  useChannelKindsEnabled: () => true,
  ScopeField: ({
    kind,
    onKindChange,
    onProjectChange,
    projectId,
  }: {
    kind: string;
    onKindChange: (kind: string) => void;
    onProjectChange: (id: string | null) => void;
    projectId: string | null;
  }) => (
    <div data-kind={kind} data-project={projectId ?? 'none'} data-testid={'scope'}>
      <button type={'button'} onClick={() => onKindChange('project')}>
        kind project
      </button>
      <button type={'button'} onClick={() => onKindChange('general')}>
        kind general
      </button>
      <button type={'button'} onClick={() => onProjectChange('prj_2')}>
        pick project
      </button>
    </div>
  ),
}));

const renderDialog = (open: () => void) => {
  open();
  render(mocks.createModal.mock.calls.at(-1)![0].content);
};

const next = () => fireEvent.click(screen.getByRole('button', { name: 'create.next' }));
const submit = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'submit' }));
  await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
  return mocks.create.mock.calls[0][0] as Record<string, unknown>;
};

describe('CreateChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.optionsProjectIds = [];
    mocks.workspaceId = null;
  });

  it('asks the kind and name first, then members, and creates a general Channel by default', async () => {
    renderDialog(() => openCreateChannel());
    expect(screen.getByTestId('scope')).toHaveAttribute('data-kind', 'general');
    expect(screen.queryByTestId('members')).toBeNull();

    next();
    expect(screen.getByTestId('members')).toBeInTheDocument();
    expect(await submit()).toMatchObject({ projectId: undefined });
  });

  it('needs a project before a project Channel can go on, then offers its Agents', async () => {
    renderDialog(() => openCreateChannel());
    fireEvent.click(screen.getByRole('button', { name: 'kind project' }));
    expect(screen.getByRole('button', { name: 'create.next' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'pick project' }));
    expect(mocks.optionsProjectIds.at(-1)).toBe('prj_2');
    next();
    expect(await submit()).toMatchObject({ projectId: 'prj_2' });
  });

  it("starts as the project's own from a project sidebar, and can turn general", async () => {
    renderDialog(() => openCreateChannel(undefined, 'prj_1'));
    expect(screen.getByTestId('scope')).toHaveAttribute('data-kind', 'project');
    expect(screen.getByTestId('scope')).toHaveAttribute('data-project', 'prj_1');

    fireEvent.click(screen.getByRole('button', { name: 'kind general' }));
    next();
    expect(await submit()).toMatchObject({ projectId: undefined });
  });

  it('keeps what was entered when going back from the member step', () => {
    renderDialog(() => openCreateChannel());
    fireEvent.click(screen.getByRole('button', { name: 'pick project' }));
    fireEvent.click(screen.getByRole('button', { name: 'kind project' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'create.back' }));
    expect(screen.getByTestId('scope')).toHaveAttribute('data-kind', 'project');
    expect(screen.getByTestId('scope')).toHaveAttribute('data-project', 'prj_2');
  });

  it('opens a new workspace Channel to the workspace unless it is made private', async () => {
    mocks.workspaceId = 'ws_1';
    renderDialog(() => openCreateChannel());
    expect(screen.getByRole('checkbox', { name: 'private' })).not.toBeChecked();
    next();
    await submit();
    await waitFor(() => expect(mocks.updateVisibility).toHaveBeenCalledWith('chn_new', 'public'));
  });

  it('leaves a private workspace Channel invite-only', async () => {
    mocks.workspaceId = 'ws_1';
    renderDialog(() => openCreateChannel());
    fireEvent.click(screen.getByRole('checkbox', { name: 'private' }));
    next();
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
    expect(screen.queryByTestId('scope')).not.toBeInTheDocument();
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
    expect(screen.getByText('invite.directHint')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'pick person' }));
    expect(await submit()).toMatchObject({ agents: [], userIds: ['usr_2', 'usr_3'] });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('chn_new'));
    // The conversation between the two stays as it is.
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('channelId');
  });
});
