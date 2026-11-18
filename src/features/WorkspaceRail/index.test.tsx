import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import WorkspaceRail from './index';
import { readWorkspaceRailHint, WORKSPACE_RAIL_HINT_KEY, writeWorkspaceRailHint } from './railHint';

const mocks = vi.hoisted(() => ({
  activeId: null as string | null,
  available: true,
  loading: false,
  openCreate: vi.fn(),
  navigate: vi.fn(),
  order: undefined as string[] | undefined,
  pathname: '/',
  personalRequests: 0,
  updatePreference: vi.fn(async (_patch: unknown) => {}),
  switchToPersonal: vi.fn(async () => {}),
  switchWorkspace: vi.fn(async (_id: string) => {}),
  unread: {} as Record<string, number>,
  workspaces: [] as { avatar: string | null; id: string; name: string; slug: string }[],
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./style', () => ({
  RAIL_AVATAR_SIZE: 32,
  RAIL_TILE_RADIUS: 10,
  styles: {
    add: {},
    divider: {},
    dot: {},
    item: {},
    pill: {},
    pillActive: {},
    rail: {},
    unread: {},
  },
}));
vi.mock('./useScopeUnread', () => ({
  useScopeUnread: (scopeId: string | null) => mocks.unread[scopeId ?? 'personal'] ?? 0,
}));
vi.mock('./usePersonalRequestCount', () => ({
  usePersonalRequestCount: () => mocks.personalRequests,
}));
vi.mock('./CreateWorkspace', () => ({ useOpenCreateWorkspace: () => mocks.openCreate }));
vi.mock('@/business/client/workspace/store', () => ({
  useWorkspaceStore: (
    selector: (s: { isWorkspaceAvailable: boolean; isWorkspaceLoading: boolean }) => unknown,
  ) => selector({ isWorkspaceAvailable: mocks.available, isWorkspaceLoading: mocks.loading }),
}));
vi.mock('@/business/client/hooks/useWorkspaces', () => ({ useWorkspaces: () => mocks.workspaces }));
vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  useActiveWorkspaceId: () => mocks.activeId,
}));
vi.mock('@/business/client/hooks/useActiveWorkspaceSlug', () => ({
  useActiveWorkspaceSlug: () => null,
}));
vi.mock('@/hooks/useActiveLocation', () => ({
  useActiveLocation: () => ({ pathname: mocks.pathname }),
}));
vi.mock('@/business/client/hooks/useSwitchWorkspace', () => ({
  useSwitchWorkspace: () => ({
    switchToPersonal: mocks.switchToPersonal,
    switchWorkspace: mocks.switchWorkspace,
  }),
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => mocks.navigate,
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('@/components/WorkspaceAvatar', () => ({ default: () => <span /> }));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: unknown) => unknown) =>
    selector({
      preference: { workspace: { order: mocks.order } },
      updatePreference: mocks.updatePreference,
      user: { avatar: '', fullName: '', id: 'user-1' },
    }),
}));

describe('WorkspaceRail', () => {
  beforeEach(() => {
    mocks.activeId = null;
    mocks.available = true;
    mocks.loading = false;
    mocks.personalRequests = 0;
    mocks.order = undefined;
    mocks.pathname = '/';
    mocks.unread = {};
    mocks.workspaces = [
      { avatar: null, id: 'ws-1', name: 'LobeHub', slug: 'lobehub' },
      { avatar: null, id: 'ws-2', name: 'Acme', slug: 'acme' },
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(WORKSPACE_RAIL_HINT_KEY);
    vi.clearAllMocks();
  });

  it('renders nothing where the server has no workspaces (self-hosted)', () => {
    mocks.available = false;
    const { container } = render(<WorkspaceRail />);
    expect(container).toBeEmptyDOMElement();
  });

  it('holds the column it had last time while the list is still loading', () => {
    writeWorkspaceRailHint(true);
    mocks.available = false;
    mocks.loading = true;
    const { container } = render(<WorkspaceRail />);

    expect(container.firstElementChild).toBeEmptyDOMElement();
    expect(container.firstElementChild).not.toBeNull();
  });

  it('reserves nothing while loading when it did not show last time', () => {
    mocks.available = false;
    mocks.loading = true;
    const { container } = render(<WorkspaceRail />);

    expect(container).toBeEmptyDOMElement();
  });

  it('remembers whether it showed once the list settles', () => {
    render(<WorkspaceRail />);
    expect(readWorkspaceRailHint()).toBe(true);

    cleanup();
    mocks.available = false;
    render(<WorkspaceRail />);
    expect(readWorkspaceRailHint()).toBe(false);
  });

  // With no workspace yet the rail still shows, so one can be created from it.
  it('offers creating a workspace even before the user has one', () => {
    mocks.workspaces = [];
    render(<WorkspaceRail />);

    fireEvent.click(screen.getByRole('button', { name: 'workspaceRail.create' }));
    expect(mocks.openCreate).toHaveBeenCalled();
  });

  it('lists the personal space first, then each workspace, marking the active one', () => {
    mocks.activeId = 'ws-2';
    render(<WorkspaceRail />);

    const items = screen.getAllByRole('button');
    expect(items.map((el) => el.getAttribute('aria-label'))).toEqual([
      'workspaceRail.personal',
      'LobeHub',
      'Acme',
      'workspaceRail.create',
    ]);
    expect(screen.getByRole('button', { name: 'Acme' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'LobeHub' })).not.toHaveAttribute('aria-current');
  });

  it("lays the workspaces out in the user's own order", () => {
    mocks.order = ['ws-2', 'ws-1'];
    render(<WorkspaceRail />);

    expect(screen.getAllByRole('button').map((el) => el.getAttribute('aria-label'))).toEqual([
      'workspaceRail.personal',
      'Acme',
      'LobeHub',
      'workspaceRail.create',
    ]);
  });

  it('switches to a workspace and lands on its home', async () => {
    render(<WorkspaceRail />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Acme' }));
    });

    expect(mocks.switchWorkspace).toHaveBeenCalledWith('ws-2');
    expect(mocks.navigate).toHaveBeenCalledWith('/', { escape: true });
  });

  it('stays on Contacts when switching from the Contacts tab', async () => {
    mocks.pathname = '/agents/agt-1';
    render(<WorkspaceRail />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Acme' }));
    });

    expect(mocks.switchWorkspace).toHaveBeenCalledWith('ws-2');
    expect(mocks.navigate).toHaveBeenCalledWith('/agents', { escape: true });
  });

  it('switches back to the personal space', async () => {
    mocks.activeId = 'ws-1';
    render(<WorkspaceRail />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'workspaceRail.personal' }));
    });

    expect(mocks.switchToPersonal).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith('/', { escape: true });
  });

  it('does nothing when the active scope is clicked again', async () => {
    mocks.activeId = 'ws-1';
    render(<WorkspaceRail />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'LobeHub' }));
    });

    expect(mocks.switchWorkspace).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("badges each scope's tile with its unread count, shown in full like Discord up to 999+", () => {
    mocks.unread = { 'personal': 260, 'ws-1': 1000 };
    render(<WorkspaceRail />);

    expect(screen.getByRole('button', { name: 'workspaceRail.personal' })).toHaveTextContent('260');
    expect(screen.getByRole('button', { name: 'LobeHub' })).toHaveTextContent('999+');
    expect(screen.getByRole('button', { name: 'Acme' }).textContent).toBe('');
  });

  it("adds the personal space's waiting friend requests to its tile only", () => {
    mocks.unread = { 'personal': 2, 'ws-1': 3 };
    mocks.personalRequests = 1;
    render(<WorkspaceRail />);

    expect(screen.getByRole('button', { name: 'workspaceRail.personal' })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'LobeHub' })).toHaveTextContent('3');
  });
});
