import { type TaskListFilter } from '@lobot/types';

import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { taskService } from '@/services/task';
import type { StoreSetter } from '@/store/types';

import type { TaskStore } from '../../store';
import {
  type CollectionTask,
  taskGroupListEntity,
  type TaskGroupListQuery,
  taskGroupListResource,
  type TaskGroupListValue,
  taskListEntity,
  type TaskListQuery,
  taskListResource,
  type TaskListValue,
} from './projection';

// Default kanban groups: 5 columns
// 'scheduled' shares the 'running' column — both represent "automation in
// progress" from the user's perspective (one is mid-tick, the other is
// waiting for the next tick).
// `needsInput` is intentionally first: in the list view it surfaces the
// actionable items at the top of the page.
const DEFAULT_KANBAN_GROUPS = [
  { key: 'needsInput', statuses: ['paused', 'failed'] },
  { key: 'backlog', statuses: ['backlog'] },
  { key: 'running', statuses: ['running', 'scheduled'] },
  { key: 'done', statuses: ['completed'] },
  { key: 'canceled', statuses: ['canceled'] },
];

/**
 * Map the UI-side filter chip value to the server-side `visibility` enum.
 * 'all' has no server filter (undefined), 'workspace' translates to the DB
 * 'public' value, and 'private' passes through unchanged.
 */
const filterToServerVisibility = (
  filter: 'all' | 'private' | 'workspace',
): 'private' | 'public' | undefined => {
  if (filter === 'all') return undefined;
  if (filter === 'workspace') return 'public';
  return 'private';
};

/**
 * `complete` mode paging. The server caps one `task.list` page at 500 rows, so
 * the full list is assembled from consecutive pages — sequential round trips,
 * so the page is as large as the server allows; the ceiling bounds the fan-out
 * for very large workspaces (2 requests) — past it the store keeps the real
 * `total` so the list can say it is showing a subset.
 */
export const COMPLETE_TASK_LIST_PAGE_SIZE = 500;

/** Page size of the Tasks page's paginated collections (scheduled, "My tasks"). */
export const TASK_COLLECTION_PAGE_SIZE = 50;

export interface ScheduledTaskListOptions {
  agentId?: string;
  /** The Tasks page filter; Home's roll-up sends none. */
  filter?: TaskListFilter;
  limit?: number;
  offset?: number;
  projectId?: string;
}
export const COMPLETE_TASK_LIST_MAX_ITEMS = 1000;

/**
 * A paginated collection (scheduled roll-up, "My tasks"): the task-list sync
 * plus the page in the `{ data, total }` shape of the list endpoint, undefined
 * until the entry is in the store (persisted or fetched) and while disabled.
 */
export interface TaskCollectionPageResult extends TaskCollectionSyncResult {
  data?: { data: TaskListValue['items']; total: number };
}

/** Sync result of a task list / board fetch: replica flags plus the SWR-era aliases. */
export interface TaskCollectionSyncResult extends ReplicaSyncResult {
  /** A request is in flight and there is nothing to show for this query yet. */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
  /** Read the collection with `taskListSelectors.*(queryKey)`; undefined while disabled. */
  queryKey?: string;
}

/** What a batch overlay needs to know about the collection it patches. */
export interface CollectionQueryShape {
  /** The collection is one agent's tasks (assignee filter). */
  agentId?: string;
  /** The collection lists archived rows ("Show archived"); undefined when unknown. */
  includeArchived?: boolean;
  /** "My tasks" narrowing. */
  scope?: 'assigned' | 'created';
}

/** A batch overlay's patch of one task; `undefined` takes the row out of the collection. */
export type CollectionTasksPatch = (
  task: CollectionTask,
  query: CollectionQueryShape,
) => CollectionTask | undefined;

export interface CollectionTasksOptimistic {
  /** Keep the rows in `keep` (id → final patch; default: every id, original patch). */
  commit: (keep?: ReadonlyMap<string, CollectionTasksPatch>) => void;
  rollback: () => void;
}

type Setter = StoreSetter<TaskStore>;

export const createTaskListSlice = (set: Setter, get: () => TaskStore, _api?: unknown) =>
  new TaskListSliceActionImpl(set, get, _api);

export class TaskListSliceActionImpl {
  readonly #taskList;
  readonly #taskGroupList;

  constructor(set: Setter, get: () => TaskStore, _api?: unknown) {
    void _api;
    this.#taskList = createReplicaSlice(taskListResource, {
      actionPrefix: 'taskList',
      entity: taskListEntity,
      fetcher: (query) => this.#fetchList(query),
      get,
      merge: (incoming, _confirmed, query) => ({
        items: incoming.data,
        ...(query.projectId && { projectId: query.projectId }),
        ...(query.statuses && { statuses: query.statuses }),
        total: incoming.total,
      }),
      set,
      stateKey: 'taskListReplica',
      view: recordLens<TaskStore, TaskListValue>('taskListMap'),
    });
    this.#taskGroupList = createReplicaSlice(taskGroupListResource, {
      actionPrefix: 'taskGroupList',
      entity: taskGroupListEntity,
      fetcher: (query) => this.#fetchGroups(query),
      get,
      merge: (incoming, _confirmed, query) => ({
        ...(query.excludeStatuses && { excludeStatuses: query.excludeStatuses }),
        groupBy: query.groupBy,
        groups: incoming.data,
        ...(query.projectId && { projectId: query.projectId }),
      }),
      set,
      stateKey: 'taskGroupListReplica',
      view: recordLens<TaskStore, TaskGroupListValue>('taskGroupListMap'),
    });
  }

  #fetchList = (query: TaskListQuery) => {
    const params = {
      ...(query.agentId ? { assigneeAgentId: query.agentId } : {}),
      automated: query.automated,
      ...(query.completedWithin && { completedWithin: query.completedWithin }),
      ...(query.filter && { filter: query.filter }),
      includeArchived: query.includeArchived,
      orderBy: query.orderBy,
      projectId: query.projectId,
      ...(query.scope && { scope: query.scope }),
      statuses: query.statuses,
      visibility: filterToServerVisibility(query.visibility),
    };
    return query.complete
      ? this.fetchCompleteTaskList(params)
      : this.fetchTaskList({ ...params, limit: query.limit, offset: query.offset });
  };

  #fetchGroups = (query: TaskGroupListQuery) =>
    taskService.groupList({
      assigneeAgentId: query.agentId,
      ...(query.automated === undefined ? {} : { automated: query.automated }),
      ...(query.completedWithin && { completedWithin: query.completedWithin }),
      excludeStatuses: query.excludeStatuses,
      ...(query.filter && { filter: query.filter }),
      ...(query.groupBy === 'status'
        ? { groups: DEFAULT_KANBAN_GROUPS }
        : query.groupBy.startsWith('label:')
          ? { groupBy: 'label' as const, labelGroupId: query.groupBy.slice('label:'.length) }
          : { groupBy: query.groupBy as 'assignee' | 'member' | 'priority' | 'project' }),
      includeArchived: query.includeArchived,
      projectId: query.projectId,
      scope: query.scope,
      visibility: filterToServerVisibility(query.visibility),
    });

  /**
   * Optimistic patch of a task in every loaded list and board (a status board
   * moves the card). `commit` keeps it as confirmed until the refresh lands and
   * applies the change to persisted lists and boards that are not loaded, so
   * reopening one later does not paint the old status; `rollback` restores
   * every loaded collection exactly, card order included.
   */
  internal_beginCollectionTaskOptimistic = (
    taskId: string,
    fn: <T extends CollectionTask>(task: T) => T,
  ) => {
    const tokens = [
      ...this.#taskList.beginEntityOptimistic<CollectionTask>(taskId, fn),
      ...this.#taskGroupList.beginEntityOptimistic<CollectionTask>(taskId, fn),
    ];
    return {
      commit: () => {
        tokens.forEach((token) => token.commit());
        void this.#taskList.patchStoredEntity<CollectionTask>(taskId, fn);
        void this.#taskGroupList.patchStoredEntity<CollectionTask>(taskId, fn);
      },
      rollback: () => tokens.forEach((token) => token.rollback()),
    };
  };

  fetchTaskList = async (params: Parameters<typeof taskService.list>[0]) =>
    taskService.list(params);

  /**
   * Every page of a list, merged, walked with a keyset cursor: each request
   * asks for the rows after the last row it already holds, so a task created
   * or deleted while the walk is in flight shifts nothing — offset pages would
   * repeat or skip a row at the boundary. Stops at a short page or at
   * `COMPLETE_TASK_LIST_MAX_ITEMS`; `total` is the first page's live count.
   */
  fetchCompleteTaskList = async (
    params: Omit<Parameters<typeof taskService.list>[0], 'after' | 'limit' | 'offset'>,
  ) => {
    const limit = COMPLETE_TASK_LIST_PAGE_SIZE;
    const orderBy = params.orderBy ?? 'createdAt';
    const first = await this.fetchTaskList({ ...params, limit });

    const byId = new Map<string, (typeof first.data)[number]>();
    let page = first;
    for (;;) {
      for (const task of page.data) byId.set(task.id, task);
      const last = page.data.at(-1);
      if (!last || page.data.length < limit || byId.size >= COMPLETE_TASK_LIST_MAX_ITEMS) break;
      page = await this.fetchTaskList({
        ...params,
        after: { at: last[orderBy], seq: last.seq },
        limit,
      });
    }

    return { ...first, data: [...byId.values()] };
  };

  refreshTaskList = async (): Promise<void> => {
    await Promise.all([
      // Every loaded list and board of the active scope — an edit can move a
      // task across any query boundary (touching reorders `updatedAt`,
      // scheduling flips the automation filter), so none are singled out.
      // That includes the scheduled roll-up and "My tasks" pages (a schedule
      // or an assignee can change on any edit) and the agent sidebar panels.
      this.#taskList.revalidate(),
      this.#taskGroupList.revalidate(),
    ]);
  };
}

export type TaskListSliceAction = Pick<TaskListSliceActionImpl, keyof TaskListSliceActionImpl>;
