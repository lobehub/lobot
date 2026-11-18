import type { StoreSetter } from '@/store/types';

import type { TaskStore } from '../../store';

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
