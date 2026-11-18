import type { StoreSetter } from '@/store/types';

import type { TaskStore } from '../../store';

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
