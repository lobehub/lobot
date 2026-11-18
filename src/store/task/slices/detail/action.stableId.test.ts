import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope, createReplicaState } from '@/libs/replica';
import { broadcastCacheScope, resetCacheScopeBroadcast } from '@/libs/replica/cacheScopeEvents';
import { mutate } from '@/libs/swr';
import { taskService } from '@/services/task';

import { useTaskStore } from '../../store';
import { taskGroupListEntity, taskListEntity } from '../list/projection';

vi.mock('@/services/task', () => ({
  taskService: { find: vi.fn(), getDetail: vi.fn(), updateStatus: vi.fn(), update: vi.fn() },
}));
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn().mockResolvedValue(undefined),
  useClientDataSWR: vi.fn(),
}));
const detail = {
  id: 'task_1',
  identifier: 'T-1',
  instruction: 'test',
  status: 'backlog',
  name: 'Before',
};
beforeEach(() => {
  vi.clearAllMocks();
  // `restoreAllMocks` below also drops the factory's resolved value, and the
  // replica driver chains `.catch` on what `mutate` returns.
  vi.mocked(mutate).mockResolvedValue(undefined);
  resetCacheScopeBroadcast();
  useTaskStore.setState({
    activeTaskId: undefined,
    activeTaskRef: undefined,
    taskRefIndex: {},
    taskDetailMap: {},
    taskDetailReplica: createReplicaState(),
    taskListMap: {},
    taskListReplica: createReplicaState(),
    taskGroupListMap: {},
    taskGroupListReplica: createReplicaState(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('canonical task cache', () => {
  it('matches collection rows by id even when identifiers collide', () => {
    const list = { items: [detail, { ...detail, id: 'task_2' }], total: 2 } as never;
    const next = taskListEntity.map(list, 'task_1', (row) => ({ ...row, status: 'completed' }));
    expect(next.items.map((row) => row.status)).toEqual(['completed', 'backlog']);
    expect(
      taskGroupListEntity.has(
        { groups: [{ key: 'backlog', tasks: [detail], total: 1 }], groupBy: 'status' } as never,
        'task_1',
      ),
    ).toBe(true);
  });

  it('clears aliases on a scope switch and drops a late alias lookup', async () => {
    let scope = 'user:personal';
    const spy = vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
    let resolve!: (value: never) => void;
    vi.mocked(taskService.find).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = useTaskStore.getState().internal_resolveTaskId('T-1');
    scope = 'user:workspace';
    broadcastCacheScope(scope);
    resolve({ data: detail, success: true } as never);
    await expect(pending).rejects.toThrow('Task scope changed');
    expect(useTaskStore.getState().taskRefIndex).toEqual({});
    spy.mockRestore();
  });
});
