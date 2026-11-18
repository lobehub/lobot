import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReplicaState } from '@/libs/replica';

import { useTaskStore } from '../../store';

// Mock task service
vi.mock('@/services/task', () => ({
  taskService: {
    groupList: vi.fn(),
    list: vi.fn(),
  },
}));

// Mock SWR
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useTaskStore.setState({
    listVisibility: 'all',
    taskGroupListMap: {},
    taskGroupListReplica: createReplicaState(),
    taskListMap: {},
    taskListReplica: createReplicaState(),
  });
});

describe('TaskListSliceAction', () => {
  describe('refreshTaskList', () => {
    // An edit can move a task across every list boundary at once — reorder it
    // by `updatedAt`, change its visibility, attach a schedule that flips
    // Home's automation filter — so refresh revalidates every list and board.
    it('revalidates every task list and board, the scheduled and mine pages included', async () => {
      const { mutate } = await import('@/libs/swr');

      await useTaskStore.getState().refreshTaskList();

      const matchers = vi
        .mocked(mutate)
        .mock.calls.map(([arg]) => arg)
        .filter((arg): arg is (key: unknown) => boolean => typeof arg === 'function');
      const matches = (key: unknown[]) => matchers.some((matcher) => matcher(key));
      const scope = (await import('@/libs/replica')).cacheScope.get();
      expect(matches(['replica:sync', 'taskList', 1, scope, 'any-list', {}])).toBe(true);
      expect(matches(['replica:sync', 'taskGroupList', 1, scope, 'any-board', {}])).toBe(true);
      // The scheduled roll-up, "My tasks" and the sidebar panel are replica
      // entries now, so no SWR-persisted `task:` key is left to revalidate.
      expect(matches(['task:scheduledList', '__all__', 'all'])).toBe(false);
      expect(matches(['task:myList', 'assigned', 'all'])).toBe(false);
    });
  });
});
