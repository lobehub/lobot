import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useScopeUnread } from './useScopeUnread';

const mocks = vi.hoisted(() => ({
  list: [] as Record<string, unknown>[],
  scopeLists: {} as Record<string, Record<string, unknown>[]>,
  useFetchScopeList: vi.fn(),
}));

vi.mock('@/store/channel', () => ({
  channelActions: { useFetchScopeList: mocks.useFetchScopeList },
  channelSelectors: {
    list: (s: { list: unknown }) => s.list,
    scopeList: (scopeId: string | null) => () => mocks.scopeLists[scopeId ?? 'personal'],
  },
  useChannelStore: (selector: (s: unknown) => unknown) => selector({ list: mocks.list }),
}));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'user-1' } }),
}));
vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: { userId: (s: { user: { id: string } }) => s.user.id },
}));

const syncedScopes = () =>
  mocks.useFetchScopeList.mock.calls
    .filter(([, enabled]) => enabled)
    .map(([scopeId]) => scopeId as string | null);

describe('useScopeUnread', () => {
  beforeEach(() => {
    mocks.list = [];
    mocks.scopeLists = {};
    mocks.useFetchScopeList.mockReset();
  });

  it('counts the active scope from the loaded list, without a request', () => {
    mocks.list = [{ id: 'c1', status: 'active', unreadCount: 2 }];

    const { result } = renderHook(() => useScopeUnread('ws-1', true));

    expect(result.current).toBe(2);
    expect(syncedScopes()).toEqual([]);
  });

  it("syncs another scope's Channel list to count its unread", () => {
    mocks.scopeLists['ws-2'] = [
      { id: 'c1', status: 'active', unreadCount: 4 },
      { id: 'c2', status: 'archived', unreadCount: 9 },
    ];

    const { result } = renderHook(() => useScopeUnread('ws-2', false));

    expect(result.current).toBe(4);
    expect(syncedScopes()).toEqual(['ws-2']);
    expect(mocks.useFetchScopeList.mock.calls[0][2]).toMatchObject({ refreshInterval: 60_000 });
  });

  it('asks for the personal space with a null scope', () => {
    mocks.scopeLists.personal = [{ id: 'c1', status: 'active', unreadCount: 1 }];

    const { result } = renderHook(() => useScopeUnread(null, false));

    expect(result.current).toBe(1);
    expect(syncedScopes()).toEqual([null]);
  });
});
