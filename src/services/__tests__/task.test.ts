import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lambdaClient } from '@/libs/trpc/client';
import { taskService } from '@/services/task';

// Mock lambdaClient
vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    brief: {
      markRead: { mutate: vi.fn() },
      resolve: { mutate: vi.fn() },
    },
    task: {
      addComment: { mutate: vi.fn() },
      addDependency: { mutate: vi.fn() },
      cancelTopic: { mutate: vi.fn() },
      clearAll: { mutate: vi.fn() },
      create: { mutate: vi.fn() },
      delete: { mutate: vi.fn() },
      deleteGoal: { mutate: vi.fn() },
      deleteComment: { mutate: vi.fn() },
      deleteTopic: { mutate: vi.fn() },
      detail: { query: vi.fn() },
      find: { query: vi.fn() },
      getDependencies: { query: vi.fn() },
      getCheckpoint: { query: vi.fn() },
      getPinnedDocuments: { query: vi.fn() },
      getReview: { query: vi.fn() },
      getSubtasks: { query: vi.fn() },
      getTaskTree: { query: vi.fn() },
      getTopics: { query: vi.fn() },
      groupList: { query: vi.fn() },
      list: { query: vi.fn() },
      pinDocument: { mutate: vi.fn() },
      previewSubtaskLayers: { query: vi.fn() },
      removeDependency: { mutate: vi.fn() },
      reorderSubtasks: { mutate: vi.fn() },
      run: { mutate: vi.fn() },
      runReadySubtasks: { mutate: vi.fn() },
      runReview: { mutate: vi.fn() },
      unpinDocument: { mutate: vi.fn() },
      update: { mutate: vi.fn() },
      updateComment: { mutate: vi.fn() },
      updateCheckpoint: { mutate: vi.fn() },
      updateConfig: { mutate: vi.fn() },
      updateReview: { mutate: vi.fn() },
      updateStatus: { mutate: vi.fn() },
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TaskService', () => {
  describe('queries', () => {
    it('find should call task.find.query', async () => {
      await taskService.find('T-1');
      expect(lambdaClient.task.find.query).toHaveBeenCalledWith({ id: 'T-1' });
    });

    it('getDetail should call task.detail.query', async () => {
      await taskService.getDetail('T-1');
      expect(lambdaClient.task.detail.query).toHaveBeenCalledWith({ id: 'T-1' });
    });

    it('list should call task.list.query with params', async () => {
      const params = { assigneeAgentId: 'agt_1', limit: 50, offset: 0 };
      await taskService.list(params);
      expect(lambdaClient.task.list.query).toHaveBeenCalledWith(params);
    });

    it('uses the agent-only API contract for the Agent board', async () => {
      await taskService.groupList({ groupBy: 'assignee' });

      expect(lambdaClient.task.groupList.query).toHaveBeenCalledWith({ groupBy: 'agent' });
    });
  });

  describe('mutations', () => {
    it('create should call task.create.mutate', async () => {
      const params = { instruction: 'Do something', name: 'Test' };
      await taskService.create(params);
      expect(lambdaClient.task.create.mutate).toHaveBeenCalledWith(params);
    });

    it('update should merge id with data', async () => {
      await taskService.update('T-1', { name: 'Updated', priority: 1 });
      expect(lambdaClient.task.update.mutate).toHaveBeenCalledWith({
        id: 'T-1',
        name: 'Updated',
        priority: 1,
      });
    });

    it('delete should call task.delete.mutate', async () => {
      await taskService.delete('T-1');
      expect(lambdaClient.task.delete.mutate).toHaveBeenCalledWith({ id: 'T-1' });
    });
  });
});
