/**
 * @vitest-environment happy-dom
 */
import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createReplicaState } from '@/libs/replica';

import { getBusinessTrpcHeaders } from '../trpc-headers';
import { useFetchWorkspaces } from './list';
import { readLastWorkspaceId, useWorkspaceStore, writeLastWorkspaceId } from './store';

const mocks = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    workspace: { list: { query: mocks.list } },
  },
}));

const ws = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  slug: id,
  ...extra,
});

// A fresh SWR cache per test, so one test's list never answers another's.
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SWRConfig, { value: { dedupingInterval: 0, provider: () => new Map() } }, children);

describe('workspace store', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.setState({
      activeWorkspaceId: null,
      isWorkspaceAvailable: false,
      isWorkspaceListInit: false,
      isWorkspaceLoading: true,
      workspaces: [],
      workspacesReplica: createReplicaState(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists the workspaces and reopens the one picked last time', async () => {
    mocks.list.mockResolvedValue([ws('ws-a'), ws('ws-b')]);
    writeLastWorkspaceId('user-1', 'ws-b');

    renderHook(() => useFetchWorkspaces(true, 'user-1'), { wrapper });

    await waitFor(() => expect(useWorkspaceStore.getState().workspaces).toHaveLength(2));
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-b');
    expect(useWorkspaceStore.getState().isWorkspaceLoading).toBe(false);
    expect(useWorkspaceStore.getState().isWorkspaceAvailable).toBe(true);
  });

  // A force quit can lose the localStorage copy, so the server-side preference decides.
  it('restores from the lastWorkspaceId preference over the local copy', async () => {
    mocks.list.mockResolvedValue([ws('ws-a'), ws('ws-b')]);
    writeLastWorkspaceId('user-1', 'ws-a');

    renderHook(() => useFetchWorkspaces(true, 'user-1', 'ws-b'), { wrapper });

    await waitFor(() => expect(useWorkspaceStore.getState().workspaces).toHaveLength(2));
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-b');
  });

  it('treats a null preference as an explicit pick of the personal space', async () => {
    mocks.list.mockResolvedValue([ws('ws-a')]);
    writeLastWorkspaceId('user-1', 'ws-a');

    renderHook(() => useFetchWorkspaces(true, 'user-1', null), { wrapper });

    await waitFor(() => expect(useWorkspaceStore.getState().workspaces).toHaveLength(1));
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
  });

  // Regression: switching to the personal space refetches the user state and the
  // list together. A user state read before the preference write landed handed
  // back the old workspace, and the list refetch restored it over the pick.
  it('keeps a personal pick when the list revalidates under a stale preference', async () => {
    mocks.list.mockResolvedValue([ws('ws-a')]);

    const { result, rerender } = renderHook(
      ({ last }: { last: string | null }) => useFetchWorkspaces(true, 'user-1', last),
      { initialProps: { last: 'ws-a' }, wrapper },
    );
    await waitFor(() => expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-a'));

    act(() => useWorkspaceStore.getState().switchToPersonal());
    rerender({ last: 'ws-a' });
    await act(async () => {
      await result.current.revalidate();
    });

    // The switch itself refetches too: replica syncs key by the active workspace.
    expect(mocks.list.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
  });

  it('still drops a workspace the user lost access to on revalidation', async () => {
    mocks.list.mockResolvedValue([ws('ws-a')]);

    const { result } = renderHook(() => useFetchWorkspaces(true, 'user-1', 'ws-a'), { wrapper });
    await waitFor(() => expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-a'));

    mocks.list.mockResolvedValue([]);
    await act(async () => {
      await result.current.revalidate();
    });

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
  });

  it('falls back to the personal space when the last workspace is gone or locked out', async () => {
    mocks.list.mockResolvedValue([ws('ws-a'), ws('ws-locked', { lockedOut: true })]);
    writeLastWorkspaceId('user-1', 'ws-locked');

    renderHook(() => useFetchWorkspaces(true, 'user-1'), { wrapper });

    await waitFor(() => expect(useWorkspaceStore.getState().workspaces).toEqual([ws('ws-a')]));
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
  });

  it('stays personal and stops loading when the server has no workspaces', async () => {
    mocks.list.mockRejectedValue(new Error('NOT_FOUND'));

    renderHook(() => useFetchWorkspaces(true, 'user-1'), { wrapper });

    await waitFor(() => expect(useWorkspaceStore.getState().isWorkspaceLoading).toBe(false));
    expect(useWorkspaceStore.getState().workspaces).toEqual([]);
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
    expect(useWorkspaceStore.getState().isWorkspaceAvailable).toBe(false);
  });

  it('clears the context when signed out', () => {
    useWorkspaceStore.setState({
      activeWorkspaceId: 'ws-a',
      isWorkspaceListInit: true,
      workspaces: [ws('ws-a')] as never,
    });

    renderHook(() => useFetchWorkspaces(false, null), { wrapper });

    expect(useWorkspaceStore.getState()).toMatchObject({
      activeWorkspaceId: null,
      isWorkspaceLoading: false,
      workspaces: [],
    });
    expect(mocks.list).not.toHaveBeenCalled();
  });

  // Sign-in can flicker on boot. The sync key comes back unchanged after the clear, so
  // SWR would neither refetch nor settle the request it still holds: the rail stayed hidden.
  it.each([
    ['while the list is loading', false],
    ['after the list loaded', true],
  ])('loads the list again when signed out and back in %s', async (_, settleFirst) => {
    let answer: (value: unknown) => void = () => {};
    mocks.list.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    mocks.list.mockResolvedValue([ws('ws-a')]);

    const { rerender } = renderHook(({ enabled }) => useFetchWorkspaces(enabled, 'user-1'), {
      initialProps: { enabled: true },
      wrapper,
    });
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    if (settleFirst) {
      await act(async () => answer([ws('ws-a')]));
      await waitFor(() => expect(useWorkspaceStore.getState().isWorkspaceAvailable).toBe(true));
    }

    rerender({ enabled: false });
    rerender({ enabled: true });
    await act(async () => answer([ws('ws-a')]));

    await waitFor(() => expect(useWorkspaceStore.getState().isWorkspaceAvailable).toBe(true));
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
    expect(useWorkspaceStore.getState().isWorkspaceLoading).toBe(false);
  });

  it('scopes requests to the active workspace through the X-Workspace-Id header', async () => {
    expect(await getBusinessTrpcHeaders()).toEqual({});

    act(() => useWorkspaceStore.getState().switchWorkspace('ws-a'));
    expect(await getBusinessTrpcHeaders()).toEqual({ 'X-Workspace-Id': 'ws-a' });

    act(() => useWorkspaceStore.getState().switchToPersonal());
    expect(await getBusinessTrpcHeaders()).toEqual({});
  });

  it('remembers the last scope per user', () => {
    writeLastWorkspaceId('user-1', 'ws-a');
    writeLastWorkspaceId('user-2', 'ws-b');
    expect(readLastWorkspaceId('user-1')).toBe('ws-a');

    writeLastWorkspaceId('user-1', null);
    expect(readLastWorkspaceId('user-1')).toBeNull();
    expect(readLastWorkspaceId('user-2')).toBe('ws-b');
  });
});
