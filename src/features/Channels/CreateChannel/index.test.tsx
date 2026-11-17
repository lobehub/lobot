import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openCreateChannel, openInviteMembers } from '.';

const mocks = vi.hoisted(() => ({
  create: vi.fn(async () => 'chn_new'),
  createModal: vi.fn(() => ({ update: mocks.updateModal })),
  createProject: vi.fn(async ({ name }: { name: string }) => ({ id: 'prj_new', name })),
  optionsProjectIds: [] as (string | undefined)[],
  updateModal: vi.fn(),
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
  cssVar: { colorBorderSecondary: 'border' },
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
vi.mock('@/store/project', () => ({
  useProjectStore: { getState: () => ({ createProject: mocks.createProject }) },
}));
vi.mock('./NewProjectPanel', () => ({
  NewProjectPanel: ({
    name,
    onClose,
    onNameChange,
  }: {
    name: string;
    onClose: () => void;
    onNameChange: (name: string) => void;
  }) => (
    <div data-name={name} data-testid={'new-project'}>
      <button type={'button'} onClick={() => onNameChange('')}>
        clear project name
      </button>
      <button type={'button'} onClick={onClose}>
        discard project
      </button>
    </div>
  ),
}));
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
    newProjectName,
    onCreateProject,
    onKindChange,
    onProjectChange,
    projectId,
  }: {
    kind: string;
    newProjectName?: string;
    onCreateProject: (name: string) => void;
    onKindChange: (kind: string) => void;
    onProjectChange: (id: string | null) => void;
    projectId: string | null;
  }) => (
    <div
      data-kind={kind}
      data-new-project={newProjectName}
      data-project={projectId ?? 'none'}
      data-testid={'scope'}
    >
      <button type={'button'} onClick={() => onKindChange('project')}>
        kind project
      </button>
      <button type={'button'} onClick={() => onKindChange('general')}>
        kind general
      </button>
      <button type={'button'} onClick={() => onProjectChange('prj_2')}>
        pick project
      </button>
      <button type={'button'} onClick={() => onCreateProject('Atlas')}>
        new project
      </button>
    </div>
  ),
}));

const renderDialog = (open: () => void) => {
  open();
  render(mocks.createModal.mock.calls.at(-1)![0].content);
};

const next = () => fireEvent.click(screen.getByRole('button', { name: 'create.next' }));
const submit = async (label = 'submit') => {
  fireEvent.click(screen.getByRole('button', { name: label }));
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

  it('creates a new project beside the Channel, and names the Channel after it', async () => {
    const onCreated = vi.fn();
    renderDialog(() => openCreateChannel(onCreated));
    fireEvent.click(screen.getByRole('button', { name: 'kind project' }));
    fireEvent.click(screen.getByRole('button', { name: 'new project' }));

    // The dialog widens and the project opens on the right, named by the picker's search.
    expect(screen.getByTestId('new-project')).toHaveAttribute('data-name', 'Atlas');
    expect(screen.getByTestId('scope')).toHaveAttribute('data-new-project', 'Atlas');
    expect(mocks.updateModal).toHaveBeenLastCalledWith({ width: 'min(90vw, 800px)' });
    expect(mocks.optionsProjectIds.at(-1)).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'clear project name' }));
    expect(screen.getByRole('button', { name: 'create.next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'new project' }));

    next();
    expect(await submit('newProject.submit')).toMatchObject({
      projectId: 'prj_new',
      title: 'Atlas',
    });
    expect(mocks.createProject).toHaveBeenCalledExactlyOnceWith({ name: 'Atlas' });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('chn_new'));
  });

  it('does not create the project twice when the Channel fails and is retried', async () => {
    mocks.create.mockRejectedValueOnce(new Error('boom'));
    renderDialog(() => openCreateChannel());
    fireEvent.click(screen.getByRole('button', { name: 'kind project' }));
    fireEvent.click(screen.getByRole('button', { name: 'new project' }));
    next();

    fireEvent.click(screen.getByRole('button', { name: 'newProject.submit' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'newProject.submit' })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'newProject.submit' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
    expect(mocks.createProject).toHaveBeenCalledOnce();
  });

  it('goes back to picking a project when the new one is discarded', () => {
    renderDialog(() => openCreateChannel());
    fireEvent.click(screen.getByRole('button', { name: 'kind project' }));
    fireEvent.click(screen.getByRole('button', { name: 'new project' }));
    fireEvent.click(screen.getByRole('button', { name: 'discard project' }));

    expect(screen.queryByTestId('new-project')).toBeNull();
    expect(mocks.updateModal).toHaveBeenLastCalledWith({ width: 'min(90vw, 480px)' });
    expect(screen.getByRole('button', { name: 'create.next' })).toBeDisabled();
  });
});
