import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePersonalRequestCount } from './usePersonalRequestCount';

const mocks = vi.hoisted(() => ({
  enabled: true,
  incoming: [] as unknown[],
  listRequestsInScope: vi.fn(async (_id: string | null) => [] as { direction: string }[]),
}));

vi.mock('@/features/Channels/useChannelsEnabled', () => ({
  useChannelsEnabled: () => mocks.enabled,
}));
vi.mock('@/services/contact', () => ({
  contactService: { listRequestsInScope: mocks.listRequestsInScope },
}));
vi.mock('@/store/contact', () => ({
  contactSelectors: { incomingRequests: () => mocks.incoming },
  useContactStore: (selector: (s: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'user-1' } }),
}));
vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: { userId: (s: { user: { id: string } }) => s.user.id },
}));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe('usePersonalRequestCount', () => {
  beforeEach(() => {
    mocks.enabled = true;
    mocks.incoming = [];
    mocks.listRequestsInScope.mockReset();
    mocks.listRequestsInScope.mockResolvedValue([]);
  });

  it('counts the loaded requests in the personal space, without a request', () => {
    mocks.incoming = [{ id: 'r1' }, { id: 'r2' }];

    const { result } = renderHook(() => usePersonalRequestCount(true), { wrapper });

    expect(result.current).toBe(2);
    expect(mocks.listRequestsInScope).not.toHaveBeenCalled();
  });

  it("fetches the personal space's requests from a workspace, counting only incoming ones", async () => {
    mocks.listRequestsInScope.mockResolvedValue([
      { direction: 'incoming' },
      { direction: 'outgoing' },
    ]);

    const { result } = renderHook(() => usePersonalRequestCount(false), { wrapper });

    await waitFor(() => expect(result.current).toBe(1));
    expect(mocks.listRequestsInScope).toHaveBeenCalledWith(null);
  });

  it('shows nothing and polls nothing with Channels off', () => {
    mocks.enabled = false;
    mocks.incoming = [{ id: 'r1' }];

    const { result } = renderHook(() => usePersonalRequestCount(false), { wrapper });

    expect(result.current).toBe(0);
    expect(mocks.listRequestsInScope).not.toHaveBeenCalled();
  });
});
