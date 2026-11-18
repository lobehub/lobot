import { toast } from '@lobehub/ui';
import {
  applyTaskReposSelection,
  readTaskExecutionConfig,
  toTaskExecutionConfigPatch,
} from '@lobot/types';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope, createReplicaState } from '@/libs/replica';
import { mutate } from '@/libs/swr';
import { taskService } from '@/services/task';
import { goalGraphResource } from '@/store/goal/projection';
import { useUserStore } from '@/store/user';

import { useTaskStore } from '../../store';
import { taskDetailResource } from './projection';

/** A goal graph's replica sync key, as the refresh matcher has to recognise it. */
const goalGraphSyncKey = (goalId: string) => [
  'replica:sync',
  goalGraphResource.name,
  goalGraphResource.version,
  goalGraphResource.scope.get(),
  goalId,
  {},
];

vi.mock('@/services/task', () => ({
  taskService: {
    addComment: vi.fn(),
    addDependency: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    find: vi.fn(),
    getDetail: vi.fn(),
    pinDocument: vi.fn(),
    removeDependency: vi.fn(),
    reorderSubtasks: vi.fn(),
    unpinDocument: vi.fn(),
    update: vi.fn(),
    updateVisibility: vi.fn(),
  },
}));

vi.mock('@/services/work', () => ({
  workService: {
    refreshAllConversations: vi.fn(),
  },
}));

vi.mock('@/libs/swr', () => ({
  mutate: vi.fn().mockResolvedValue(undefined),
  useClientDataSWR: vi.fn(),
}));

vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...(await import('~base-ui-stubs')).baseUiStubs,
}));

afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(mutate).mockResolvedValue(undefined);
  vi.spyOn(cacheScope, 'use').mockReturnValue(cacheScope.get());
  vi.mocked(taskService.find).mockImplementation(
    async (id) => ({ data: { id, identifier: id }, success: true }) as any,
  );
  useTaskStore.setState({
    activeTaskId: undefined,
    activeTopicDrawerAgentId: undefined,
    activeTopicDrawerFocusRequest: undefined,
    activeTopicDrawerTitle: undefined,
    activeTopicDrawerTopicId: undefined,
    isCreatingTask: false,
    isDeletingTask: false,
    taskDetailMap: {},
    activeTaskRef: undefined,
    taskRefIndex: Object.fromEntries(
      ['T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-parent', 'T-child', 'task_1'].map((id) => [id, id]),
    ),
    taskDetailReplica: createReplicaState(),
    taskInstructionRevisionMap: {},
    taskSaveStatusMap: {},
  });
});

describe('TaskDetailSliceAction', () => {
  describe('task detail replica', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('persists a detail edit once the server saved it', async () => {
      const scope = `task-update-${crypto.randomUUID()}:personal`;
      vi.spyOn(cacheScope, 'get').mockReturnValue(scope);
      vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);
      useTaskStore.getState().internal_dispatchTaskDetail({
        id: 'T-3',
        type: 'setTaskDetail',
        value: { id: 'T-3', identifier: 'T-3', name: 'Before' } as any,
      });
      vi.mocked(taskService.update).mockResolvedValue({} as any);

      await useTaskStore.getState().updateTask('T-3', { name: 'After' });

      await vi.waitFor(async () =>
        expect(
          (await taskDetailResource.storage!.get({ queryKey: 'T-3', scope }))?.data,
        ).toMatchObject({ name: 'After' }),
      );
    });

    it('keeps optimistic detail edits out of the persisted row', async () => {
      const scope = `task-detail-${crypto.randomUUID()}:personal`;
      vi.spyOn(cacheScope, 'get').mockReturnValue(scope);
      vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);

      useTaskStore.getState().internal_dispatchTaskDetail({
        id: 'T-1',
        type: 'setTaskDetail',
        value: { id: 'T-1', identifier: 'T-1', name: 'Draft' } as any,
      });

      expect(useTaskStore.getState().taskDetailMap['T-1']).toMatchObject({ name: 'Draft' });
      expect(await taskDetailResource.storage!.get({ queryKey: 'T-1', scope })).toBeUndefined();
    });
  });

  describe('createTask', () => {
    it('should call service and return identifier', async () => {
      vi.mocked(taskService.create).mockResolvedValue({
        data: { id: 'T-1', identifier: 'T-1' },
        message: 'ok',
        success: true,
      } as any);

      const result = await useTaskStore.getState().createTask({
        instruction: 'Do something',
        name: 'Test',
      });

      expect(taskService.create).toHaveBeenCalledWith({
        instruction: 'Do something',
        name: 'Test',
      });
      expect(result?.identifier).toBe('T-1');
    });

    it('should set isCreatingTask during creation', async () => {
      vi.mocked(taskService.create).mockImplementation(async () => {
        expect(useTaskStore.getState().isCreatingTask).toBe(true);
        return { data: { id: 'T-1', identifier: 'T-1' }, success: true } as any;
      });

      await useTaskStore.getState().createTask({ instruction: 'Test' });
      expect(useTaskStore.getState().isCreatingTask).toBe(false);
    });

    it('should reject and reset isCreatingTask on error (callers own the error path)', async () => {
      vi.mocked(taskService.create).mockRejectedValue(new Error('fail'));

      // createTask keeps its rejecting contract so callers that rely on `catch`
      // (e.g. the recommend-template flow) don't fall through to a false success;
      // the composer callers add their own catch + toast (V4).
      await expect(useTaskStore.getState().createTask({ instruction: 'Test' })).rejects.toThrow(
        'fail',
      );
      expect(useTaskStore.getState().isCreatingTask).toBe(false);
    });
  });

  describe('updateTask', () => {
    it('should optimistically update taskDetailMap', async () => {
      useTaskStore.setState({
        activeTaskId: 'T-1',
        taskDetailMap: {
          'T-1': {
            id: 'T-1',
            identifier: 'T-1',
            instruction: 'Old',
            name: 'Old Name',
            status: 'backlog',
          },
        },
      });

      vi.mocked(taskService.update).mockResolvedValue({ success: true } as any);

      await useTaskStore.getState().updateTask('T-1', { name: 'New Name' });

      expect(useTaskStore.getState().taskDetailMap['T-1'].name).toBe('New Name');
      expect(taskService.update).toHaveBeenCalledWith('T-1', { name: 'New Name' });
      expect(useTaskStore.getState().taskSaveStatusMap['T-1']).toBe('saved');
    });

    it('surfaces the assignment activity in the same dispatch as the assignee chip', async () => {
      useUserStore.setState({
        isSignedIn: true,
        user: { avatar: 'me.png', fullName: 'Me', id: 'user_me' } as any,
      });
      useTaskStore.setState({
        activeTaskId: 'T-1',
        taskDetailMap: {
          'T-1': {
            activities: [],
            agentId: null,
            id: 'T-1',
            identifier: 'T-1',
            instruction: 'x',
            status: 'backlog',
          },
        },
      });
      // Hold the mutation open so we can observe the optimistic state alone.
      let release!: () => void;
      vi.mocked(taskService.update).mockReturnValue(
        new Promise((resolve) => {
          release = () => resolve({ success: true } as any);
        }),
      );

      const pending = useTaskStore
        .getState()
        .updateTask(
          'T-1',
          { assigneeAgentId: 'agt_1' },
          { optimisticAssignee: { avatar: null, id: 'agt_1', name: 'Rika', type: 'agent' } },
        );

      const activities = useTaskStore.getState().taskDetailMap['T-1'].activities ?? [];
      expect(activities).toHaveLength(1);
      expect(activities[0]).toMatchObject({
        assignment: { kind: 'agent', to: { id: 'agt_1', name: 'Rika' } },
        author: { id: 'user_me', name: 'Me', type: 'user' },
        type: 'assignment',
      });

      release();
      await pending;
    });

    it('drops the previous agent’s repo selection when the task is reassigned', async () => {
      useTaskStore.setState({
        taskDetailMap: {
          'T-1': {
            agentId: 'agt_a',
            config: {
              execution: toTaskExecutionConfigPatch(
                applyTaskReposSelection(undefined, ['lobehub/lobehub']),
              ),
              model: 'claude-code',
            },
            id: 'T-1',
            identifier: 'T-1',
            instruction: 'x',
            status: 'backlog',
          },
        },
      });
      // Hold the PUT open so only the optimistic render is observed — the chip
      // must not keep showing the old agent's repo while the write is in flight.
      let release!: () => void;
      vi.mocked(taskService.update).mockReturnValue(
        new Promise((resolve) => {
          release = () => resolve({ success: true } as any);
        }),
      );

      const pending = useTaskStore.getState().updateTask('T-1', { assigneeAgentId: 'agt_b' });

      const config = useTaskStore.getState().taskDetailMap['T-1'].config as Record<string, unknown>;
      expect(readTaskExecutionConfig(config)).toBeUndefined();
      // Only the repo axis follows the assignee; the other config pockets stay.
      expect(config.model).toBe('claude-code');

      release();
      await pending;
    });

    it('keeps a device pin and a machine directory when the task is reassigned', async () => {
      useTaskStore.setState({
        taskDetailMap: {
          'T-1': {
            agentId: 'agt_a',
            config: {
              execution: toTaskExecutionConfigPatch({
                boundDeviceId: 'device-a',
                workingDirectory: '/srv/app',
              }),
            },
            id: 'T-1',
            identifier: 'T-1',
            instruction: 'x',
            status: 'backlog',
          },
        },
      });
      vi.mocked(taskService.update).mockResolvedValue({ success: true } as any);

      await useTaskStore.getState().updateTask('T-1', { assigneeAgentId: 'agt_b' });

      expect(
        readTaskExecutionConfig(
          useTaskStore.getState().taskDetailMap['T-1'].config as Record<string, unknown>,
        ),
      ).toEqual({ boundDeviceId: 'device-a', workingDirectory: '/srv/app' });
    });

    it('keeps the repo selection when the assignee does not change', async () => {
      useTaskStore.setState({
        taskDetailMap: {
          'T-1': {
            agentId: 'agt_a',
            config: {
              execution: toTaskExecutionConfigPatch(
                applyTaskReposSelection(undefined, ['lobehub/lobehub']),
              ),
            },
            id: 'T-1',
            identifier: 'T-1',
            instruction: 'x',
            status: 'backlog',
          },
        },
      });
      vi.mocked(taskService.update).mockResolvedValue({ success: true } as any);

      await useTaskStore.getState().updateTask('T-1', { name: 'Renamed' });

      expect(
        readTaskExecutionConfig(
          useTaskStore.getState().taskDetailMap['T-1'].config as Record<string, unknown>,
        )?.repos,
      ).toEqual(['lobehub/lobehub']);
    });

    it('revalidates goal graphs when the assignee changes, so a goal page shows the new executor', async () => {
      useTaskStore.setState({
        taskDetailMap: {
          'T-1': { id: 'T-1', identifier: 'T-1', instruction: 'x', status: 'backlog' },
        },
      });
      vi.mocked(taskService.update).mockResolvedValue({ success: true } as any);
      const { mutate } = await import('@/libs/swr');

      await useTaskStore.getState().updateTask('T-1', { assigneeAgentId: 'agt_2' });

      // A paused goal does not poll, so without this its page kept the old avatar.
      const matchers = vi
        .mocked(mutate)
        .mock.calls.map(([key]) => key)
        .filter((key): key is (key: unknown) => boolean => typeof key === 'function');
      const matchesGoalGraph = (key: unknown) => matchers.some((match) => match(key));
      // The goal graph is a replica: its sync keys live outside the SWR `goal:`
      // cache, so the refresh matches through the resource.
      expect(matchesGoalGraph(goalGraphSyncKey('goal-1'))).toBe(true);
      expect(matchesGoalGraph(['goal:graph', 'goal-1'])).toBe(false);
      expect(matchesGoalGraph(['task:detail', 'T-1'])).toBe(false);
    });

    it('leaves goal graphs alone when the assignee does not change', async () => {
      useTaskStore.setState({
        taskDetailMap: {
          'T-1': { id: 'T-1', identifier: 'T-1', instruction: 'x', status: 'backlog' },
        },
      });
      vi.mocked(taskService.update).mockResolvedValue({ success: true } as any);
      const { mutate } = await import('@/libs/swr');

      await useTaskStore.getState().updateTask('T-1', { priority: 2 });

      const matchers = vi
        .mocked(mutate)
        .mock.calls.map(([key]) => key)
        .filter((key): key is (key: unknown) => boolean => typeof key === 'function');
      expect(matchers.some((match) => match(goalGraphSyncKey('goal-1')))).toBe(false);
    });

    it('should clear stale editorData for instruction-only optimistic updates', async () => {
      useTaskStore.setState({
        activeTaskId: 'T-1',
        taskDetailMap: {
          'T-1': {
            editorData: { root: { children: [{ text: 'Old instruction' }] } },
            id: 'T-1',
            identifier: 'T-1',
            instruction: 'Old instruction',
            status: 'backlog',
          },
        },
      });
      vi.mocked(taskService.update).mockResolvedValue({ success: true } as any);

      await useTaskStore.getState().updateTask('T-1', { instruction: 'New instruction' });

      expect(useTaskStore.getState().taskDetailMap['T-1']).toMatchObject({
        editorData: null,
        instruction: 'New instruction',
      });
      expect(useTaskStore.getState().taskInstructionRevisionMap['T-1']).toBe(1);

      const nextEditorData = { root: { children: [{ text: 'Rich instruction' }] } };
      await useTaskStore.getState().updateTask('T-1', {
        editorData: nextEditorData,
        instruction: 'Rich instruction',
      });

      expect(useTaskStore.getState().taskDetailMap['T-1']).toMatchObject({
        editorData: nextEditorData,
        instruction: 'Rich instruction',
      });
      expect(useTaskStore.getState().taskInstructionRevisionMap['T-1']).toBe(2);
    });

    it('lets the caller replace the failure toast Retry with its whole action', async () => {
      useTaskStore.setState({
        activeTaskId: 'T-1',
        taskDetailMap: {
          'T-1': { id: 'T-1', identifier: 'T-1', instruction: 'x', status: 'backlog' },
        },
      });
      vi.mocked(taskService.update).mockRejectedValueOnce(new Error('fail'));
      const retry = vi.fn();

      await expect(
        useTaskStore.getState().updateTask('T-1', { assigneeAgentId: 'agt_inbox' }, { retry }),
      ).rejects.toThrow('fail');

      const toastOptions = vi.mocked(toast.error).mock.calls.at(-1)?.[0];
      if (!toastOptions || typeof toastOptions === 'string') {
        throw new Error('Expected the failed save toast to expose a Retry action.');
      }
      toastOptions.actions?.[0]?.onClick?.();

      expect(retry).toHaveBeenCalledTimes(1);
      expect(taskService.update).toHaveBeenCalledTimes(1);
    });

    it('should not show error when update succeeds but cache refresh fails', async () => {
      const { mutate } = await import('@/libs/swr');
      useTaskStore.setState({
        activeTaskId: 'T-1',
        taskDetailMap: {
          'T-1': { id: 'T-1', identifier: 'T-1', instruction: 'Test', status: 'backlog' },
        },
      });

      vi.mocked(taskService.update).mockResolvedValue({ success: true } as any);
      vi.mocked(mutate).mockRejectedValue(new Error('network blip'));

      await useTaskStore.getState().updateTask('T-1', { assigneeAgentId: 'agent-x' });

      expect(useTaskStore.getState().taskSaveStatusMap['T-1']).toBe('saved');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should refresh the list after changing priority', async () => {
      const refreshTaskList = vi.fn().mockResolvedValue(undefined);
      useTaskStore.setState({ refreshTaskList } as any);
      vi.mocked(taskService.update).mockResolvedValue({ success: true } as any);

      await useTaskStore.getState().updateTask('T-1', { priority: 2 });

      expect(refreshTaskList).toHaveBeenCalled();
    });
  });

  describe('updateTaskVisibility', () => {
    it('resolves once the change is saved even when the refresh fails', async () => {
      vi.mocked(taskService.updateVisibility).mockResolvedValue({} as any);
      const refreshTaskList = vi.fn().mockRejectedValue(new Error('network down'));
      useTaskStore.setState({ refreshTaskList } as any);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        useTaskStore.getState().updateTaskVisibility('T-1', 'private'),
      ).resolves.toBeUndefined();
      expect(taskService.updateVisibility).toHaveBeenCalledWith('T-1', 'private');
      expect(toast.error).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('rejects with a targeted toast when the change itself is refused', async () => {
      vi.mocked(taskService.updateVisibility).mockRejectedValue(
        new Error('Cannot make this task private while it has subtasks created by other members.'),
      );

      await expect(useTaskStore.getState().updateTaskVisibility('T-1', 'private')).rejects.toThrow(
        'subtasks created by other members',
      );
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('subtasks created by other members'),
      );
    });
  });

  describe('internal_dispatchTaskDetail', () => {
    it('should set task detail via reducer', () => {
      const detail = {
        id: 'T-1',
        identifier: 'T-1',
        instruction: 'Test',
        status: 'backlog',
      } as any;

      useTaskStore.getState().internal_dispatchTaskDetail({
        id: 'T-1',
        type: 'setTaskDetail',
        value: detail,
      });

      expect(useTaskStore.getState().taskDetailMap['T-1']).toEqual(detail);
    });

    it('should not update state if reducer returns same reference', () => {
      const detail = {
        id: 'T-1',
        identifier: 'T-1',
        instruction: 'Test',
        status: 'backlog',
      } as any;
      useTaskStore.setState({ taskDetailMap: { 'T-1': detail } });

      const spy = vi.fn();
      useTaskStore.subscribe(spy);

      // Update with non-existent id — reducer returns same state
      useTaskStore.getState().internal_dispatchTaskDetail({
        id: 'T-999',
        type: 'updateTaskDetail',
        value: { name: 'Ghost' },
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
