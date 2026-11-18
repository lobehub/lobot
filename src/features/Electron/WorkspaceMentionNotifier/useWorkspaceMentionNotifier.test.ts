import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect, useSyncExternalStore } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MentionNotificationRow } from './mentionNotification';

const mocks = vi.hoisted(() => ({
  level: 'all' as 'all' | 'mentions' | 'off',
  listeners: new Set<() => void>(),
  onPoll: undefined as ((rows: MentionNotificationRow[]) => void) | undefined,
  rows: [] as MentionNotificationRow[],
  showNotification: vi.fn(),
  syncKey: undefined as unknown,
  workspaceId: 'ws_1' as string | null,
}));

vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  useActiveWorkspaceId: () => mocks.workspaceId,
}));
vi.mock('@/business/client/hooks/useActiveWorkspaceSlug', () => ({
  getActiveWorkspaceSlug: () => 'acme',
}));
vi.mock('@/store/electron', () => ({
  useElectronStore: (selector: (s: unknown) => unknown) =>
    selector({
      // Reactive like the polling replica: every poll answer reaches `onPoll`.
      useFetchWorkspaceMentions: (
        workspaceId: string | null,
        options: { enabled?: boolean; onPoll?: (rows: MentionNotificationRow[]) => void },
      ) => {
        const active = options.enabled !== false && !!workspaceId;
        mocks.syncKey = active ? workspaceId : null;
        const rows = useSyncExternalStore(
          (listener) => {
            mocks.listeners.add(listener);
            return () => mocks.listeners.delete(listener);
          },
          () => mocks.rows,
        );
        mocks.onPoll = options.onPoll;
        useEffect(() => {
          if (active) mocks.onPoll?.(rows);
        }, [active, rows]);
        return { error: undefined, isHydrated: true, isValidating: false, revalidate: vi.fn() };
      },
    }),
}));
vi.mock('@/services/electron/desktopNotification', () => ({
  desktopNotificationService: { showNotification: mocks.showNotification },
}));
vi.mock('@/store/global', () => ({
  useGlobalStore: (selector: (s: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/global/selectors', () => ({
  systemStatusSelectors: { channelNotificationLevel: () => mocks.level },
}));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/user/selectors', () => ({ authSelectors: { isLogin: () => true } }));

const { useWorkspaceMentionNotifier } = await import('./useWorkspaceMentionNotifier');

const poll = (rows: MentionNotificationRow[]) =>
  act(() => {
    mocks.rows = rows;
    for (const listener of mocks.listeners) listener();
  });

const row = (id: string): MentionNotificationRow => ({
  actionUrl: `/page/${id}`,
  content: `Bob: ping ${id}`,
  // `n1` < `n2` < …: later ids were created later.
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, Number(id.slice(1)))),
  id,
  title: 'Bob mentioned you',
});

describe('useWorkspaceMentionNotifier', () => {
  beforeEach(() => {
    mocks.level = 'all';
    mocks.listeners.clear();
    mocks.rows = [];
    mocks.showNotification.mockReset().mockResolvedValue({ success: true });
    mocks.syncKey = undefined;
    mocks.workspaceId = 'ws_1';
  });

  it('does not replay mentions already waiting when the watcher starts', () => {
    mocks.rows = [row('n1')];
    renderHook(() => useWorkspaceMentionNotifier());

    expect(mocks.showNotification).not.toHaveBeenCalled();
  });

  it('shows an OS notification for a mention that arrives after the baseline', async () => {
    mocks.rows = [row('n1')];
    renderHook(() => useWorkspaceMentionNotifier());

    poll([row('n2'), row('n1')]);

    await waitFor(() => expect(mocks.showNotification).toHaveBeenCalledTimes(1));
    expect(mocks.showNotification).toHaveBeenCalledWith({
      body: 'Bob: ping n2',
      navigate: { escape: true, path: '/acme/page/n2' },
      title: 'Bob mentioned you',
    });
  });

  it('stays idle outside a workspace', () => {
    mocks.workspaceId = null;
    renderHook(() => useWorkspaceMentionNotifier());

    expect(mocks.syncKey).toBeNull();
  });

  it('watches mentions without any business-features flag (Lobot is Cloud-only)', () => {
    renderHook(() => useWorkspaceMentionNotifier());

    expect(mocks.syncKey).not.toBeNull();
  });

  it('stays idle when notifications are turned off', () => {
    mocks.level = 'off';
    renderHook(() => useWorkspaceMentionNotifier());

    expect(mocks.syncKey).toBeNull();
  });
});
