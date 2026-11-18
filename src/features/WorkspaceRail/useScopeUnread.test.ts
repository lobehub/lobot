import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useScopeUnread } from './useScopeUnread';

const mocks = vi.hoisted(() => ({
  enabled: true,
  list: [] as Record<string, unknown>[],
  listInScope: vi.fn(async (_id: string | null) => [] as Record<string, unknown>[]),
}));

vi.mock('@/features/Channels/useChannelsEnabled', () => ({
  useChannelsEnabled: () => mocks.enabled,
}));
vi.mock('@/services/channel', () => ({
  channelService: { listInScope: mocks.listInScope },
}));
vi.mock('@/store/channel', () => ({
  channelSelectors: { list: (s: { list: unknown }) => s.list },
  useChannelStore: (selector: (s: unknown) => unknown) => selector({ list: mocks.list }),
}));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'user-1' } }),
}));
vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: { userId: (s: { user: { id: string } }) => s.user.id },
}));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe('useScopeUnread', () => {
  beforeEach(() => {
    mocks.enabled = true;
    mocks.list = [];
    mocks.listInScope.mockReset();
    mocks.listInScope.mockResolvedValue([]);
  });

  it('counts the active scope from the loaded list, without a request', () => {
    mocks.list = [{ id: 'c1', status: 'active', unreadCount: 2 }];

    const { result } = renderHook(() => useScopeUnread('ws-1', true), { wrapper });

    expect(result.current).toBe(2);
    expect(mocks.listInScope).not.toHaveBeenCalled();
  });

  it("fetches another scope's Channel list to count its unread", async () => {
    mocks.listInScope.mockResolvedValue([
      { id: 'c1', status: 'active', unreadCount: 4 },
      { id: 'c2', status: 'archived', unreadCount: 9 },
    ]);

    const { result } = renderHook(() => useScopeUnread('ws-2', false), { wrapper });

    await waitFor(() => expect(result.current).toBe(4));
    expect(mocks.listInScope).toHaveBeenCalledWith('ws-2');
  });

  it('asks for the personal space with a null scope', async () => {
    mocks.listInScope.mockResolvedValue([{ id: 'c1', status: 'active', unreadCount: 1 }]);

    const { result } = renderHook(() => useScopeUnread(null, false), { wrapper });

    await waitFor(() => expect(result.current).toBe(1));
    expect(mocks.listInScope).toHaveBeenCalledWith(null);
  });

  it('shows nothing and polls nothing with Channels off', () => {
    mocks.enabled = false;
    mocks.list = [{ id: 'c1', status: 'active', unreadCount: 2 }];

    const { result } = renderHook(() => useScopeUnread('ws-2', false), { wrapper });

    expect(result.current).toBe(0);
    expect(mocks.listInScope).not.toHaveBeenCalled();
  });
});
