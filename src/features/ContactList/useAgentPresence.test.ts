import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listBindings: vi.fn(),
  resolveAccountLoads: vi.fn(),
  resolveAgentAvailability: vi.fn(),
}));

vi.mock('@/services/agentQuota', () => ({ agentQuotaService: mocks }));
vi.mock('@/services/device', () => ({
  deviceService: { getAgentDeviceBindings: vi.fn(async () => ({ 'agt-cook': 'gw-sg' })) },
}));
vi.mock('@/services/topic', () => ({ topicService: { queryTopics: vi.fn(async () => []) } }));
vi.mock('@/store/device/useDeviceList', () => ({
  isDevicePresenceUnknown: () => false,
  useDeviceList: () => ({ data: [{ deviceId: 'gw-sg', online: true }], isConfirmed: true }),
}));
vi.mock('@/features/DeviceManager/managedDeviceStatus', () => ({
  getManagedDeviceStatus: () => null,
}));
vi.mock('@/store/chat', () => ({ useChatStore: () => false }));
vi.mock('@/store/chat/selectors', () => ({
  operationSelectors: { isAgentRunning: () => () => false },
}));

const { useAgentPresence } = await import('./useAgentPresence');

beforeEach(() => {
  vi.clearAllMocks();
  // The pool still has headroom elsewhere; only the device's own account is spent.
  mocks.listBindings.mockResolvedValue([
    { accountId: 'acc-spent', enabled: true, role: 'pool' },
    { accountId: 'acc-free', enabled: true, role: 'pool' },
  ]);
  mocks.resolveAccountLoads.mockResolvedValue([
    {
      accountId: 'acc-spent',
      enabled: true,
      rateLimitedUntil: Date.now() + 60_000,
      sessionUtil: 100,
    },
    { accountId: 'acc-free', enabled: true, sessionUtil: 0, weeklyUtil: 56 },
  ]);
  mocks.resolveAgentAvailability.mockResolvedValue({
    accountIds: ['acc-spent'],
    mode: 'pinned',
    resetsAt: 1_794_985_200_000,
    status: 'exhausted',
  });
});

describe('useAgentPresence', () => {
  // Regression: the card judged the whole pool and read "idle" while the
  // device's pinned account was spent and every run there hit the limit.
  it('is off duty when the accounts its device routes to are spent', async () => {
    const { result } = renderHook(() => useAgentPresence('agt-cook'));

    await waitFor(() =>
      expect(result.current).toEqual({ resetsAt: 1_794_985_200_000, status: 'offDuty' }),
    );
    expect(mocks.resolveAgentAvailability).toHaveBeenCalledWith('agt-cook', 'gw-sg');
    expect(mocks.resolveAccountLoads).not.toHaveBeenCalled();
  });
});
