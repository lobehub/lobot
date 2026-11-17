import type {
  CheckpointConfig,
  TaskAutomationMode,
  TaskAutomationSnapshot,
  TaskDetailData,
  TaskExecutionConfig,
} from '@lobot/types';
import { toTaskExecutionConfigPatch } from '@lobot/types';
import type { Draft } from 'immer';

import { taskService } from '@/services/task';
import type { StoreSetter } from '@/store/types';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { OptimisticEngine } from '@/store/utils/optimisticEngine';
import { saveToast } from '@/store/utils/saveToast';

import type { TaskStore } from '../../store';
import {
  appendOptimisticPropertyActivity,
  buildOptimisticPropertyActivity,
} from '../detail/optimisticActivity';

// Slice of TaskStore that the OptimisticEngine for detail writes reads/writes.
// Keeping it narrow ensures `extractAffectedPaths` produces `taskDetailMap.<id>`
// keys so concurrent writes for the same task serialize, while writes for
// different tasks stay parallel.
interface TaskDetailWriteState {
  taskDetailMap: Record<string, TaskDetailData>;
}

// Default values applied when a task is switched into a mode for the first time
// — keeps the popover summary, the cron runtime and the persisted record in
// sync rather than leaving the task in a "mode enabled but unconfigured" state.
const DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 600;
const DEFAULT_SCHEDULE_PATTERN = '0 9 * * *';

type Setter = StoreSetter<TaskStore>;

export const createTaskConfigSlice = (set: Setter, get: () => TaskStore, _api?: unknown) =>
  new TaskConfigSliceActionImpl(set, get, _api);

class TaskConfigSliceActionImpl {
  constructor(set: Setter, get: () => TaskStore, _api?: unknown) {
    void _api;
  }
}

export type TaskConfigSliceAction = Pick<
  TaskConfigSliceActionImpl,
  keyof TaskConfigSliceActionImpl
>;
