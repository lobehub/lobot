import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePersonalRequestCount } from './usePersonalRequestCount';

const mocks = vi.hoisted(() => ({
  enabled: true,
  incoming: [] as unknown[],
  personalIncomingCount: 0,
  useFetchPersonalRequests: vi.fn(),
}));

vi.mock('@/features/Channels/useChannelsEnabled', () => ({
  useChannelsEnabled: () => mocks.enabled,
}));
vi.mock('@/store/contact', () => ({
  contactActions: { useFetchPersonalRequests: mocks.useFetchPersonalRequests },
  contactSelectors: {
    incomingRequests: () => mocks.incoming,
    personalIncomingCount: () => mocks.personalIncomingCount,
  },
  useContactStore: (selector: (s: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'user-1' } }),
}));
vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: { userId: (s: { user: { id: string } }) => s.user.id },
}));

const synced = () => mocks.useFetchPersonalRequests.mock.calls.some(([enabled]) => enabled);

describe('usePersonalRequestCount', () => {
  beforeEach(() => {
    mocks.enabled = true;
    mocks.incoming = [];
    mocks.personalIncomingCount = 0;
    mocks.useFetchPersonalRequests.mockReset();
  });

  it('counts the loaded requests in the personal space, without a request', () => {
    mocks.incoming = [{ id: 'r1' }, { id: 'r2' }];

    const { result } = renderHook(() => usePersonalRequestCount(true));

    expect(result.current).toBe(2);
    expect(synced()).toBe(false);
  });

  it("syncs the personal space's requests from a workspace, counting incoming ones", () => {
    mocks.personalIncomingCount = 1;

    const { result } = renderHook(() => usePersonalRequestCount(false));

    expect(result.current).toBe(1);
    expect(synced()).toBe(true);
  });

  it('shows nothing and polls nothing with Channels off', () => {
    mocks.enabled = false;
    mocks.incoming = [{ id: 'r1' }];

    const { result } = renderHook(() => usePersonalRequestCount(false));

    expect(result.current).toBe(0);
    expect(synced()).toBe(false);
  });
});
