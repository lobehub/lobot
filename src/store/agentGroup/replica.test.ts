/**
 * @vitest-environment happy-dom
 *
 * The agent group store is two `local-replica` resources: the group list
 * (`groups`) and the per-group detail (`groupMap`). The persisted projection
 * paints while the network confirms it, a gone group is dropped from every view
 * that holds it (and from storage), and one group row is patched everywhere it
 * appears in a single fan-out.
 */
import { randomUUID } from 'node:crypto';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope, createReplicaState } from '@/libs/replica';
import { chatGroupService } from '@/services/chatGroup';
import type { ChatGroupItem } from '@/types/serverData';

import { initialChatGroupState } from './initialState';
import { agentGroupDetailResource, agentGroupListResource } from './projection';
import { useAgentGroupStore } from './store';

vi.mock('@/services/chatGroup', () => ({
  chatGroupService: {
    getGroupDetail: vi.fn(),
    getGroups: vi.fn(),
    updateGroup: vi.fn(),
  },
}));

/** Shared agent-store probe, so the detail side effects can be asserted. */
const agentStoreMock = vi.hoisted(() => ({
  agentMap: {} as Record<string, any>,
  internal_dispatchAgentMap: vi.fn(),
  setActiveAgentId: vi.fn(),
}));

vi.mock('@/store/agent', () => ({
  getAgentStoreState: vi.fn(() => agentStoreMock),
}));

vi.mock('@/store/chat', () => ({
  useChatStore: { setState: vi.fn() },
}));

const getGroupDetail = chatGroupService.getGroupDetail as unknown as ReturnType<typeof vi.fn>;
const getGroups = chatGroupService.getGroups as unknown as ReturnType<typeof vi.fn>;

const groupRow = (id: string, title = `Group ${id}`): ChatGroupItem =>
  ({
    accessedAt: new Date(),
    avatar: null,
    backgroundColor: null,
    clientId: null,
    config: null,
    content: null,
    createdAt: new Date(),
    deletedAt: null,
    description: null,
    editorData: null,
    groupId: null,
    id,
    isDeleted: null,
    marketIdentifier: null,
    pinned: false,
    title,
    updatedAt: new Date(),
    userId: 'user-1',
    visibility: 'public',
    workspaceId: null,
  }) as ChatGroupItem;

const groupDetail = (id: string, title = `Group ${id}`) =>
  ({ ...groupRow(id, title), agents: [], supervisorAgentId: `${id}-supervisor` }) as any;

/** Never-resolving fetch: what the store holds can only have come from storage. */
const pending = () => new Promise<never>(() => {});

const LIST_STORAGE_KEY = agentGroupListResource.storageKey({});
const detailStorageKey = (groupId: string) => agentGroupDetailResource.storageKey({ groupId });

describe('agentGroup store replica', () => {
  const scopes = new Set<string>();

  const createScope = (prefix = 'agent-group-user') => {
    const scope = `${prefix}:${randomUUID()}:personal`;
    scopes.add(scope);
    vi.spyOn(cacheScope, 'get').mockReturnValue(scope);
    vi.spyOn(cacheScope, 'use').mockReturnValue(scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);
    return scope;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    agentStoreMock.agentMap = {};
    useAgentGroupStore.setState({ ...initialChatGroupState });
  });

  afterEach(async () => {
    await Promise.all(
      [...scopes].flatMap((scope) => [
        agentGroupListResource.storage!.remove({ queryKey: LIST_STORAGE_KEY, scope }),
        agentGroupDetailResource.storage!.remove({ queryKey: detailStorageKey('g1'), scope }),
        agentGroupDetailResource.storage!.remove({ queryKey: detailStorageKey('g2'), scope }),
      ]),
    );
    cleanup();
    scopes.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('paints the persisted group list before the network answers', async () => {
    const scope = createScope();
    await agentGroupListResource.storage!.set(
      { queryKey: LIST_STORAGE_KEY, scope },
      { data: [groupRow('cached', 'Cached group')], updatedAt: 1 },
    );
    getGroups.mockImplementation(pending);

    void useAgentGroupStore.getState().loadGroups();

    await vi.waitFor(() =>
      expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['cached']),
    );
    expect(useAgentGroupStore.getState().groupsInit).toBe(true);
  });

  // The network request must not wait behind the hydration read: `sendAsGroup`
  // awaits `loadGroups()` before it navigates, so serializing the two delays both.
  it('starts the list request before the hydration read resolves', async () => {
    const scope = createScope();
    await agentGroupListResource.storage!.set(
      { queryKey: LIST_STORAGE_KEY, scope },
      { data: [groupRow('cached')], updatedAt: 1 },
    );
    getGroups.mockResolvedValue([groupRow('g1')]);

    // Hold the hydration read open so the request's start can be observed.
    const storage = agentGroupListResource.storage!;
    const original = storage.get.bind(storage);
    let releaseHydration!: () => void;
    const gate = new Promise<void>((resolve) => (releaseHydration = resolve));
    const getSpy = vi.spyOn(storage, 'get').mockImplementation(async (key: any) => {
      await gate;
      return original(key);
    });

    const inflight = useAgentGroupStore.getState().loadGroups();

    // The request is already in flight while hydration is still pending.
    await vi.waitFor(() => expect(getGroups).toHaveBeenCalled());
    expect(useAgentGroupStore.getState().groupsInit).toBe(false);

    releaseHydration();
    await inflight;
    expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['g1']);
    getSpy.mockRestore();
  });

  // A stalled IndexedDB read must not hold back an authoritative response that
  // already arrived: creation flows await `loadGroups()` before navigating.
  it('applies the list response even when the hydration read stalls', async () => {
    createScope();
    getGroups.mockResolvedValue([groupRow('g1')]);
    const storage = agentGroupListResource.storage!;
    const getSpy = vi.spyOn(storage, 'get').mockImplementation(pending);

    await useAgentGroupStore.getState().loadGroups();

    expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['g1']);
    expect(useAgentGroupStore.getState().groupMap.g1?.title).toBe('Group g1');
    getSpy.mockRestore();
  });

  // The list hydrate misses the bound, so the `replace` cannot see which ids the
  // response dropped. A persisted detail of a dropped group must still be pruned,
  // or a later slow / offline visit paints the deleted group.
  it('prunes a dropped group detail even when the list hydrate misses the bound', async () => {
    const scope = createScope();
    getGroups.mockResolvedValue([groupRow('g1'), groupRow('g2')]);
    getGroupDetail.mockImplementation(async (groupId: string) => groupDetail(groupId));

    // An earlier visit persisted both the list and g2's detail.
    await useAgentGroupStore.getState().loadGroups();
    await useAgentGroupStore.getState().internal_fetchGroupDetail('g2');
    await vi.waitFor(async () =>
      expect(
        (
          await agentGroupListResource.storage!.get({ queryKey: LIST_STORAGE_KEY, scope })
        )?.data?.map((group) => group.id),
      ).toEqual(['g1', 'g2']),
    );
    await vi.waitFor(async () =>
      expect(
        (await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g2'), scope }))
          ?.data,
      ).toBeDefined(),
    );

    // Reload: memory is gone, storage stays.
    useAgentGroupStore.setState({ ...initialChatGroupState });
    getGroups.mockResolvedValue([groupRow('g1')]);
    const storage = agentGroupListResource.storage!;
    const realGet = storage.get.bind(storage);
    const getSpy = vi.spyOn(storage, 'get').mockImplementation(async (key: any) => {
      const row = await realGet(key);
      // A slow list read: well past the pre-paint bound.
      if (key.queryKey === LIST_STORAGE_KEY) await new Promise((r) => setTimeout(r, 150));
      return row;
    });

    await useAgentGroupStore.getState().loadGroups();
    expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['g1']);

    getSpy.mockRestore();
    await vi.waitFor(
      async () =>
        expect(
          await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g2'), scope }),
        ).toBeUndefined(),
      { timeout: 2000 },
    );
  });

  // The imperative refresh writes through `replace` directly, so it needs the
  // same removal guard: a group the list pruned mid-flight stays gone.
  it('does not let an in-flight imperative detail fetch recreate a pruned group', async () => {
    const scope = createScope();
    getGroups.mockResolvedValue([groupRow('g1')]);
    getGroupDetail.mockResolvedValue(groupDetail('g1', 'One'));
    await useAgentGroupStore.getState().loadGroups();
    await useAgentGroupStore.getState().internal_fetchGroupDetail('g1');
    expect(useAgentGroupStore.getState().groupMap.g1).toBeDefined();

    let answer!: (detail: unknown) => void;
    getGroupDetail.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    const refresh = useAgentGroupStore.getState().internal_fetchGroupDetail('g1');
    await vi.waitFor(() => expect(answer).toBeDefined());

    getGroups.mockResolvedValue([]);
    await useAgentGroupStore.getState().loadGroups();
    expect(useAgentGroupStore.getState().groupMap.g1).toBeUndefined();

    agentStoreMock.setActiveAgentId.mockClear();
    answer(groupDetail('g1', 'Stale'));
    await refresh;
    expect(useAgentGroupStore.getState().groupMap.g1).toBeUndefined();
    expect(agentStoreMock.setActiveAgentId).not.toHaveBeenCalled();
    await vi.waitFor(async () =>
      expect(
        await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g1'), scope }),
      ).toBeUndefined(),
    );
  });

  // An imperative refresh answers "gone" only after an account switch: the
  // persisted detail must still be purged in the scope the request started in.
  it('purges a late terminal absence in the scope the refresh started in', async () => {
    const scope = createScope();
    getGroupDetail.mockResolvedValue(groupDetail('g1', 'One'));
    await useAgentGroupStore.getState().internal_fetchGroupDetail('g1');
    await vi.waitFor(async () =>
      expect(
        (await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g1'), scope }))
          ?.data,
      ).toBeDefined(),
    );

    let answer!: (detail: null) => void;
    getGroupDetail.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    const refresh = useAgentGroupStore.getState().internal_fetchGroupDetail('g1');
    await vi.waitFor(() => expect(answer).toBeDefined());

    createScope('agent-group-other-user');
    answer(null);
    await refresh;

    await vi.waitFor(async () =>
      expect(
        await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g1'), scope }),
      ).toBeUndefined(),
    );
  });

  // The same late "gone" must also leave that scope's persisted list, or
  // switching back hydrates the deleted group into the sidebar.
  it('drops a late terminal absence from the original scope’s persisted list', async () => {
    const scope = createScope();
    getGroups.mockResolvedValue([groupRow('g1', 'One'), groupRow('g2', 'Two')]);
    await useAgentGroupStore.getState().loadGroups();
    await vi.waitFor(async () =>
      expect(
        (
          await agentGroupListResource.storage!.get({ queryKey: LIST_STORAGE_KEY, scope })
        )?.data?.map((group) => group.id),
      ).toEqual(['g1', 'g2']),
    );

    let answer!: (detail: null) => void;
    getGroupDetail.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    const refresh = useAgentGroupStore.getState().internal_fetchGroupDetail('g1');
    await vi.waitFor(() => expect(answer).toBeDefined());

    createScope('agent-group-other-user');
    answer(null);
    await refresh;

    await vi.waitFor(async () =>
      expect(
        (
          await agentGroupListResource.storage!.get({ queryKey: LIST_STORAGE_KEY, scope })
        )?.data?.map((group) => group.id),
      ).toEqual(['g2']),
    );
  });

  it('replaces the list with the server response, persists it and seeds groupMap', async () => {
    const scope = createScope();
    getGroups.mockResolvedValue([groupRow('g1', 'Server group')]);

    await useAgentGroupStore.getState().loadGroups();

    expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['g1']);
    expect(useAgentGroupStore.getState().groupsInit).toBe(true);
    // The list row also makes the group resolvable before its detail page mounts.
    expect(useAgentGroupStore.getState().groupMap.g1?.title).toBe('Server group');

    await vi.waitFor(async () =>
      expect(
        (
          await agentGroupListResource.storage!.get({ queryKey: LIST_STORAGE_KEY, scope })
        )?.data?.map((group) => group.id),
      ).toEqual(['g1']),
    );
  });

  it('never hydrates another identity’s persisted list', async () => {
    const scope = createScope();
    await agentGroupListResource.storage!.set(
      { queryKey: LIST_STORAGE_KEY, scope },
      { data: [groupRow('mine')], updatedAt: 1 },
    );
    createScope('agent-group-other-user');
    getGroups.mockImplementation(pending);

    void useAgentGroupStore.getState().loadGroups();

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(useAgentGroupStore.getState().groups).toEqual([]);
    expect(useAgentGroupStore.getState().groupsInit).toBe(false);
  });

  it('keeps a loaded roster and its authoritative config when the list is merged in', async () => {
    createScope();
    const detail = {
      ...groupDetail('g1', 'Loaded title'),
      agents: [{ id: 'a1', title: 'Member' }],
      config: { systemPrompt: 'authoritative' },
    };
    useAgentGroupStore.setState({
      agentGroupDetailReplica: createReplicaState(),
      groupMap: { g1: detail as any },
    });

    useAgentGroupStore
      .getState()
      .internal_updateGroupMaps([{ ...groupRow('g1', 'List title'), config: null } as any]);

    const merged = useAgentGroupStore.getState().groupMap.g1;
    expect(merged.title).toBe('List title');
    // The roster is detail-only data the list row cannot carry.
    expect(merged.agents).toEqual([{ id: 'a1', title: 'Member' }]);
    expect(merged.config).toEqual({ systemPrompt: 'authoritative' });
  });

  it('drops a gone group from both views and storage, and marks it not found', async () => {
    const scope = createScope();
    getGroups.mockResolvedValue([groupRow('g1')]);
    getGroupDetail.mockResolvedValue(groupDetail('g1'));

    await useAgentGroupStore.getState().loadGroups();
    await useAgentGroupStore.getState().internal_fetchGroupDetail('g1');
    expect(useAgentGroupStore.getState().groupMap.g1).toBeDefined();
    await vi.waitFor(async () =>
      expect(
        (
          await agentGroupDetailResource.storage!.get({
            queryKey: detailStorageKey('g1'),
            scope,
          })
        )?.data,
      ).toBeDefined(),
    );

    getGroupDetail.mockResolvedValue(null);
    await useAgentGroupStore.getState().internal_fetchGroupDetail('g1');

    expect(useAgentGroupStore.getState().groupMap.g1).toBeUndefined();
    expect(useAgentGroupStore.getState().groups.some((group) => group.id === 'g1')).toBe(false);
    expect(useAgentGroupStore.getState().groupNotFoundMap.g1).toBe(true);

    await vi.waitFor(async () =>
      expect(
        await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g1'), scope }),
      ).toBeUndefined(),
    );
  });

  // P1 #2: two users in personal mode both have a `null` workspace, so the guard
  // must compare the full cache scope (`${userId}:${workspaceId}`) — otherwise a
  // response started for user A lands in user B's partition.
  it('drops a group detail response that lands after an account switch', async () => {
    createScope('agent-group-user-a');
    let resolveDetail!: (value: unknown) => void;
    getGroupDetail.mockImplementation(() => new Promise((resolve) => (resolveDetail = resolve)));

    const inflight = useAgentGroupStore.getState().internal_fetchGroupDetail('g1');
    // Switch to another user, also personal (both have a null workspace).
    const scopeB = createScope('agent-group-user-b');

    resolveDetail(groupDetail('g1', 'User A group'));
    await inflight;

    expect(useAgentGroupStore.getState().groupMap.g1).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(
      await agentGroupDetailResource.storage!.get({
        queryKey: detailStorageKey('g1'),
        scope: scopeB,
      }),
    ).toBeUndefined();
  });

  it('drops a group list response that lands after an account switch', async () => {
    createScope('agent-group-user-a');
    let resolveGroups!: (value: unknown) => void;
    getGroups.mockImplementation(() => new Promise((resolve) => (resolveGroups = resolve)));

    const inflight = useAgentGroupStore.getState().loadGroups();
    // `loadGroups` hydrates before it fetches, so wait for the request to be in flight.
    await vi.waitFor(() => expect(getGroups).toHaveBeenCalled());
    const scopeB = createScope('agent-group-user-b');

    resolveGroups([groupRow('g1', 'User A group')]);
    await inflight;

    expect(useAgentGroupStore.getState().groups).toEqual([]);
    expect(useAgentGroupStore.getState().groupMap.g1).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(
      await agentGroupListResource.storage!.get({ queryKey: LIST_STORAGE_KEY, scope: scopeB }),
    ).toBeUndefined();
  });

  // P1: the group list is the authoritative, complete set. A group it no longer
  // returns was deleted or is no longer visible, so its detail must be dropped
  // from `groupMap` (and the persisted replica) — otherwise selectors such as
  // the supervisor fallback keep resolving a group the server does not list.
  it('prunes a detail the authoritative list no longer carries, from memory and storage', async () => {
    const scope = createScope();
    getGroups.mockResolvedValue([groupRow('g1'), groupRow('g2')]);
    getGroupDetail.mockImplementation(async (groupId: string) => groupDetail(groupId));

    await useAgentGroupStore.getState().loadGroups();
    await useAgentGroupStore.getState().internal_fetchGroupDetail('g1');
    await useAgentGroupStore.getState().internal_fetchGroupDetail('g2');
    expect(useAgentGroupStore.getState().groupMap.g2).toBeDefined();
    await vi.waitFor(async () =>
      expect(
        (await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g2'), scope }))
          ?.data,
      ).toBeDefined(),
    );

    // `g2` is gone from the next authoritative list.
    getGroups.mockResolvedValue([groupRow('g1')]);
    await useAgentGroupStore.getState().loadGroups();

    expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['g1']);
    expect(useAgentGroupStore.getState().groupMap.g2).toBeUndefined();
    // The group that is still listed keeps its detail.
    expect(useAgentGroupStore.getState().groupMap.g1).toBeDefined();
    await vi.waitFor(async () =>
      expect(
        await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g2'), scope }),
      ).toBeUndefined(),
    );
  });

  // P1: a group can live in the persisted list without ever being seeded into
  // `groupMap`. After a reload the list hydrates it, the authoritative response
  // drops it — and its persisted detail must go too, or a later direct visit
  // paints a deleted / unauthorized group from storage while the network is slow.
  it('prunes a persisted detail the authoritative list drops, with no groupMap entry', async () => {
    const scope = createScope();
    getGroups.mockResolvedValue([groupRow('g1'), groupRow('g2')]);
    getGroupDetail.mockImplementation(async (groupId: string) => groupDetail(groupId));

    // An earlier visit persisted both the list and g2's detail.
    await useAgentGroupStore.getState().loadGroups();
    await useAgentGroupStore.getState().internal_fetchGroupDetail('g2');
    await vi.waitFor(async () =>
      expect(
        (
          await agentGroupListResource.storage!.get({ queryKey: LIST_STORAGE_KEY, scope })
        )?.data?.map((group) => group.id),
      ).toEqual(['g1', 'g2']),
    );
    await vi.waitFor(async () =>
      expect(
        (await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g2'), scope }))
          ?.data,
      ).toBeDefined(),
    );

    // Reload: memory is gone, storage stays — `groupMap` is empty again, so the
    // list is the only thing that still knows about g2 before the network answers.
    useAgentGroupStore.setState({ ...initialChatGroupState });
    expect(useAgentGroupStore.getState().groupMap.g2).toBeUndefined();

    getGroups.mockResolvedValue([groupRow('g1')]);
    await useAgentGroupStore.getState().loadGroups();

    // g2 never entered `groupMap` this session, yet its persisted detail is gone.
    expect(useAgentGroupStore.getState().groupMap.g2).toBeUndefined();
    expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['g1']);
    await vi.waitFor(async () =>
      expect(
        await agentGroupDetailResource.storage!.get({ queryKey: detailStorageKey('g2'), scope }),
      ).toBeUndefined(),
    );
  });

  // P2: a list / session refresh seeds every group at once. One batched replica
  // write means one store commit (one subscriber notification), not one per row.
  it('seeds many groups in a single store commit', () => {
    createScope();
    let notifications = 0;
    const unsubscribe = useAgentGroupStore.subscribe(() => {
      notifications += 1;
    });

    useAgentGroupStore
      .getState()
      .internal_updateGroupMaps([
        { ...groupRow('g1', 'One'), config: null } as any,
        { ...groupRow('g2', 'Two'), config: null } as any,
        { ...groupRow('g3', 'Three'), config: null } as any,
      ]);
    unsubscribe();

    expect(notifications).toBe(1);
    expect(Object.keys(useAgentGroupStore.getState().groupMap).sort()).toEqual(['g1', 'g2', 'g3']);
    expect(useAgentGroupStore.getState().groupMap.g2?.title).toBe('Two');
  });

  // P1: after a workspace switch the store stays mounted with `groupsInit` still
  // true. `loadGroups` must reset the view to the new scope and read its persisted
  // list rather than leaving the previous workspace's groups on screen until the
  // (possibly slow) response lands.
  it('resets to the new scope and hydrates its list when the workspace switches', async () => {
    createScope('agent-group-user-a');
    getGroups.mockResolvedValue([groupRow('g1', 'A group')]);
    await useAgentGroupStore.getState().loadGroups();
    expect(useAgentGroupStore.getState().groupsInit).toBe(true);
    expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['g1']);

    // The new scope persists a list of its own.
    const scopeB = createScope('agent-group-user-b');
    await agentGroupListResource.storage!.set(
      { queryKey: LIST_STORAGE_KEY, scope: scopeB },
      { data: [groupRow('b1', 'B group')], updatedAt: 1 },
    );

    // The network is slow, so the new scope's persisted list must paint meanwhile.
    let resolveGroups!: (value: unknown) => void;
    getGroups.mockImplementation(() => new Promise((resolve) => (resolveGroups = resolve)));

    const inflight = useAgentGroupStore.getState().loadGroups();

    await vi.waitFor(() =>
      expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['b1']),
    );

    resolveGroups([groupRow('b1', 'B group')]);
    await inflight;
    expect(useAgentGroupStore.getState().groups.map((group) => group.id)).toEqual(['b1']);
  });
});
