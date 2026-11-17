import type { TaskDetailData, TaskStatus } from '@lobot/types';
import debug from 'debug';

import { taskService } from '@/services/task';
import type { StoreSetter } from '@/store/types';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { runMutation } from '@/store/utils/runMutation';
import { saveToast } from '@/store/utils/saveToast';

import type { TaskStore } from '../../store';
import {
  appendOptimisticPropertyActivity,
  buildOptimisticPropertyActivity,
} from '../detail/optimisticActivity';
import { taskGroupKeyByStatus } from '../list/projection';

const log = debug('lobe-store:task-lifecycle');

type Setter = StoreSetter<TaskStore>;

export const createTaskLifecycleSlice = (set: Setter, get: () => TaskStore, _api?: unknown) =>
  new TaskLifecycleSliceActionImpl(set, get, _api);

class TaskLifecycleSliceActionImpl {
  constructor(set: Setter, get: () => TaskStore, _api?: unknown) {
    void _api;
  }
}

export type TaskLifecycleSliceAction = Pick<
  TaskLifecycleSliceActionImpl,
  keyof TaskLifecycleSliceActionImpl
>;
