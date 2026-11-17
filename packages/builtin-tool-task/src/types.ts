export const TaskApiName = {
  /** Add a comment to a task */
  addTaskComment: 'addTaskComment',

  /** Create a new task, optionally as a subtask of another task */
  createTask: 'createTask',

  /** Confirm and start a goal-driven task with automatic delivery acceptance */
  createGoal: 'createGoal',

  /** Create multiple tasks in a single call (batched) */
  createTasks: 'createTasks',

  /** Delete a task */
  deleteTask: 'deleteTask',

  /** Delete a task comment */
  deleteTaskComment: 'deleteTaskComment',

  /** Edit a task's name, description, instruction, priority, parent, or dependencies */
  editTask: 'editTask',

  /** List tasks with optional filters */
  listTasks: 'listTasks',

  /** List workspace members that can be assigned tasks (resolves names → user ids) */
  listWorkspaceMembers: 'listWorkspaceMembers',

  /** Trigger an async run of a single task (real execution, not just status) */
  runTask: 'runTask',

  /** Trigger async runs for multiple tasks in one call */
  runTasks: 'runTasks',

  /** Configure (or clear) the recurring schedule of a task */
  setTaskSchedule: 'setTaskSchedule',

  /** Configure (or clear) the delivery-acceptance (verify) gate of a task */
  setTaskVerify: 'setTaskVerify',

  /** Update a task comment */
  updateTaskComment: 'updateTaskComment',

  /** Update a task's status (e.g. complete, cancel) */
  updateTaskStatus: 'updateTaskStatus',

  /** View details of a specific task */
  viewTask: 'viewTask',
} as const;

// ==================== listWorkspaceMembers ====================

export interface ListWorkspaceMembersParams {
  /** Cap on the members returned (default 50, max 100). */
  limit?: number;
  /** Case-insensitive match on name, @handle, email, linked IM identity, or an exact user id. */
  query?: string;
}
