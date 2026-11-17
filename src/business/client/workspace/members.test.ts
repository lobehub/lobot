/**
 * @vitest-environment happy-dom
 *
 * The workspace roster is a local replica: a workspace's members paint from disk before the
 * network answers, so Contacts never groups agents under "unknown author" while the roster
 * request waits behind the slowest query in its batch.
 */
import 'fake-indexeddb/auto';

import { randomUUID } from 'node:crypto';

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope, createReplicaState } from '@/libs/replica';

import { useWorkspaceMembers, useWorkspaceMembersReady } from '../hooks/useWorkspaceMembers';
import { workspaceMembersResource } from './members';
import { workspaceService } from './service';
import { useWorkspaceStore } from './store';

vi.mock('./service', () => ({ workspaceService: { listMembers: vi.fn() } }));

const listMembers = workspaceService.listMembers as unknown as ReturnType<typeof vi.fn>;

const member = (userId: string, fullName: string) =>
  ({
    role: 'member',
    user: { avatar: null, email: null, fullName, username: null },
    userId,
  }) as never;

/** Never-resolving fetch: what the store holds can only have come from storage or memory. */
const pending = () => new Promise<never>(() => {});

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SWRConfig, { value: { dedupingInterval: 0, provider: () => new Map() } }, children);

const names = (members: { user?: { fullName?: string | null } | null }[]) =>
  members.map((m) => m.user?.fullName);

describe('workspace members replica', () => {
  const written: { scope: string; workspaceId: string }[] = [];
  let scope: string;

  beforeEach(() => {
    scope = `members-user:${randomUUID()}:ws`;
    vi.spyOn(cacheScope, 'get').mockReturnValue(scope);
    vi.spyOn(cacheScope, 'use').mockReturnValue(scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);
    useWorkspaceStore.setState({
      activeWorkspaceId: null,
      membersMap: {},
      membersReplica: createReplicaState(),
    });
  });

  afterEach(async () => {
    await Promise.all(
      written.map(({ scope, workspaceId }) =>
        workspaceMembersResource.storage!.remove({
          queryKey: workspaceMembersResource.storageKey({ workspaceId }),
          scope,
        }),
      ),
    );
    written.length = 0;
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const persist = async (workspaceId: string, members: unknown[]) => {
    written.push({ scope, workspaceId });
    await workspaceMembersResource.storage!.set(
      { queryKey: workspaceMembersResource.storageKey({ workspaceId }), scope },
      { data: members as never, updatedAt: 1 },
    );
  };

  it('loads the active workspace roster from that workspace', async () => {
    listMembers.mockResolvedValue([member('user-1', 'Ann'), member('user-2', 'Bo')]);
    useWorkspaceStore.setState({ activeWorkspaceId: 'ws-a' });

    const { result } = renderHook(() => useWorkspaceMembers(), { wrapper });

    await waitFor(() => expect(names(result.current)).toEqual(['Ann', 'Bo']));
    expect(listMembers).toHaveBeenCalledWith('ws-a');
  });

  // Every agent in Contacts read "unknown author" until the roster request answered.
  it('paints the persisted roster before the network answers', async () => {
    await persist('ws-a', [member('user-1', 'Ann')]);
    listMembers.mockImplementation(pending);
    useWorkspaceStore.setState({ activeWorkspaceId: 'ws-a' });

    const { result } = renderHook(
      () => ({ members: useWorkspaceMembers(), ready: useWorkspaceMembersReady() }),
      { wrapper },
    );

    await waitFor(() => expect(names(result.current.members)).toEqual(['Ann']));
    expect(result.current.ready).toBe(true);
  });

  it('keeps a visited roster on screen when switching back to its workspace', async () => {
    listMembers.mockImplementation(async (workspaceId: string) =>
      workspaceId === 'ws-a' ? [member('user-1', 'Ann')] : [member('user-2', 'Bo')],
    );
    useWorkspaceStore.setState({ activeWorkspaceId: 'ws-a' });
    const { result } = renderHook(() => useWorkspaceMembers(), { wrapper });
    await waitFor(() => expect(names(result.current)).toEqual(['Ann']));

    act(() => useWorkspaceStore.getState().switchWorkspace('ws-b'));
    await waitFor(() => expect(names(result.current)).toEqual(['Bo']));

    listMembers.mockImplementation(pending);
    act(() => useWorkspaceStore.getState().switchWorkspace('ws-a'));

    expect(names(result.current)).toEqual(['Ann']);
  });

  it('is not ready until a roster for the active workspace arrives', async () => {
    let answer!: (members: unknown[]) => void;
    listMembers.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    useWorkspaceStore.setState({ activeWorkspaceId: 'ws-a' });

    const { result } = renderHook(() => useWorkspaceMembersReady(), { wrapper });

    expect(result.current).toBe(false);
    await act(async () => answer([member('user-1', 'Ann')]));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('asks for no roster in the personal space, and has none to wait for', () => {
    const { result } = renderHook(
      () => ({ members: useWorkspaceMembers(), ready: useWorkspaceMembersReady() }),
      { wrapper },
    );

    expect(result.current).toEqual({ members: [], ready: true });
    expect(listMembers).not.toHaveBeenCalled();
  });
});
