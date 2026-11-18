import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import type { ResourceGeneralAccess } from '@/services/resourcePermission';

import { resourcePermissionActions } from './action';
import { initialState } from './initialState';
import { resourceAccessResource } from './projection';
import { useResourcePermissionStore } from './store';

vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(async () => undefined),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

vi.mock('@/services/resourcePermission', () => ({
  resourcePermissionService: {
    getGeneralAccess: vi.fn(),
    setAccessLevel: vi.fn(),
  },
}));

const { resourcePermissionService } = await import('@/services/resourcePermission');

const REF = { resourceId: 'agent-1', resourceType: 'agent' } as const;
const KEY = 'agent:agent-1';

const record = (overrides: Partial<ResourceGeneralAccess> = {}): ResourceGeneralAccess => ({
  accessLevel: 'use',
  canManage: false,
  creatorId: 'creator',
  generalAccess: 'viewer',
  visibility: 'public',
  ...overrides,
});

const state = () => useResourcePermissionStore.getState();

/**
 * Mount the access sync and play the request SWR would run: the fetcher, then
 * the success / error callback the slice installed.
 */
const mountAccessSync = async () => {
  renderHook(() => resourcePermissionActions.useFetchAccess(REF));
  const { useClientDataSWR } = await import('@/libs/swr');
  const call = vi
    .mocked(useClientDataSWR)
    .mock.calls.findLast(
      ([key]) => Array.isArray(key) && key[0] === 'replica:sync' && key[1] === 'resourceAccess',
    );
  const [, fetcher, config] = call as unknown as [
    unknown,
    () => Promise<unknown>,
    { onError: (error: unknown) => void; onSuccess: (data: unknown) => void },
  ];
  return { config, fetcher };
};
const syncAccess = async () => {
  const { config, fetcher } = await mountAccessSync();
  try {
    config.onSuccess(await fetcher());
  } catch (error) {
    config.onError(error);
  }
};
const sessionCheck = () => state().accessSessionMap[`${cacheScope.get()}|${KEY}`];

describe('resourcePermissionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // State only: `reset()` also clears the replicas, which (scope not yet
    // persistable here) would block later hydrates in this scope.
    useResourcePermissionStore.setState(initialState);
  });

  it('keys the access replica per resource type and id, with a bounded persisted set', () => {
    expect(resourceAccessResource.key(REF)).toBe(KEY);
    expect(resourceAccessResource.persisted).toBe(true);
  });

  it('discards an access read still in flight when the user-data stores reset', async () => {
    // A Desktop server switch that resolves to the same scope string: the old
    // server's answer must not repopulate the store or confirm a manage grant.
    let answer!: (value: ResourceGeneralAccess) => void;
    vi.mocked(resourcePermissionService.getGeneralAccess).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { config, fetcher } = await mountAccessSync();
    const pending = fetcher();

    // Let the reset's row purge land, so later hydrates in this scope still run.
    const canPersist = vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);
    resourcePermissionActions.reset();
    canPersist.mockRestore();
    answer(record({ canManage: true }));
    config.onSuccess(await pending);

    expect(state().accessMap[KEY]).toBeUndefined();
    expect(sessionCheck()).toBeUndefined();
  });

  it('applies a server answer and confirms it for this session', async () => {
    vi.mocked(resourcePermissionService.getGeneralAccess).mockResolvedValue(
      record({ canManage: true }),
    );

    await syncAccess();

    expect(resourcePermissionService.getGeneralAccess).toHaveBeenCalledWith('agent', 'agent-1');
    expect(state().accessMap[KEY]?.canManage).toBe(true);
    expect(sessionCheck()).toBe('confirmed');
  });

  it('drops the record on screen and marks it denied when the server refuses access', async () => {
    useResourcePermissionStore.setState({ accessMap: { [KEY]: record({ canManage: true }) } });
    vi.mocked(resourcePermissionService.getGeneralAccess).mockRejectedValue({
      data: { code: 'FORBIDDEN' },
    });

    await syncAccess();

    expect(sessionCheck()).toBe('denied');
    expect(state().accessMap[KEY]).toBeUndefined();
  });

  it('keeps the record through a transport failure', async () => {
    useResourcePermissionStore.setState({ accessMap: { [KEY]: record() } });
    vi.mocked(resourcePermissionService.getGeneralAccess).mockRejectedValue(new Error('offline'));

    await syncAccess();

    expect(sessionCheck()).toBeUndefined();
    expect(state().accessMap[KEY]).toEqual(record());
  });
});
