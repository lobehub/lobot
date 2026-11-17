import type { TaskStoreState } from '../initialState';
import type { TaskGroupItem, TaskListItem } from '../slices/list/initialState';

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

export const taskListSelectors = {
  getDisplayStatus,
};
