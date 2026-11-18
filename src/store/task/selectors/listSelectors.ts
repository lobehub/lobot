import type { TaskGroupItem, TaskListItem } from '../slices/list/initialState';
import { type TaskListQuery, taskListQueryKey } from '../slices/list/projection';
import type { TaskStore } from '../store';

const EMPTY_TASKS: TaskListItem[] = [];
const EMPTY_GROUPS: TaskGroupItem[] = [];

const statusDisplayMap: Record<string, string> = {
  backlog: 'Backlog',
  canceled: 'Canceled',
  completed: 'Done',
  failed: 'Needs input',
  paused: 'Needs input',
  running: 'In progress',
  scheduled: 'Scheduled',
};

const getDisplayStatus = (status: string): string => statusDisplayMap[status] ?? status;

/** One synced list query's rows; `undefined` until its first response (or hydration). */
const taskList =
  (query: TaskListQuery) =>
  (s: TaskStore): TaskListItem[] | undefined =>
    s.taskListMap[taskListQueryKey(query)]?.items;

export const taskListSelectors = {
  getDisplayStatus,
  taskList,
};
