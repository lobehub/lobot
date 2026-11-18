import type { TaskCompletedWindow } from '@lobechat/const/builtinTools';
import type { TaskAutomationMode, TaskListFilter, TaskListItem, TaskStatus } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';
import type { TaskGroupListItem } from '@/types/serverData';

class TaskService {
  // ── Queries ──

  find = async (id: string) => lambdaClient.task.find.query({ id });

  getDetail = async (id: string) => lambdaClient.task.detail.query({ id });

  list = async (params: {
    /** Keyset cursor: rows strictly after this `(orderBy timestamp, seq)` position. */
    after?: { at: Date | string; seq: number };
    assigneeAgentId?: string;
    automated?: boolean;
    /** Keep completed / canceled tasks only when closed within this window. */
    completedWithin?: TaskCompletedWindow;
    /** The Tasks page filter, applied server-side before paging. */
    filter?: TaskListFilter;
    /** Archived tasks are left out unless this is set. */
    includeArchived?: boolean;
    orderBy?: 'createdAt' | 'updatedAt';
    limit?: number;
    offset?: number;
    parentIdentifier?: string;
    parentTaskId?: string | null;
    priorities?: number[];
    projectId?: string;
    /** "My tasks" narrowing: assigned to the caller, or created by them. */
    scope?: 'assigned' | 'created';
    statuses?: TaskStatus[];
    visibility?: 'private' | 'public';
  }): Promise<{ data: TaskListItem[]; success: boolean; total: number }> =>
    lambdaClient.task.list.query(params);

  groupList = async (params: {
    assigneeAgentId?: string;
    automated?: boolean;
    completedWithin?: TaskCompletedWindow;
    excludeStatuses?: TaskStatus[];
    filter?: TaskListFilter;
    groupBy?: 'assignee' | 'label' | 'member' | 'priority' | 'project';
    groups?: Array<{
      key: string;
      limit?: number;
      offset?: number;
      statuses: string[];
    }>;
    includeArchived?: boolean;
    /** The label group whose labels are the columns when `groupBy` is 'label'. */
    labelGroupId?: string;
    parentTaskId?: string | null;
    projectId?: string;
    /** "My tasks" narrowing: assigned to the caller, or created by them. */
    scope?: 'assigned' | 'created';
    visibility?: 'private' | 'public';
  }): Promise<{ data: TaskGroupListItem[]; success: boolean }> =>
    lambdaClient.task.groupList.query({
      ...params,
      // Keep `assignee`'s released hybrid API semantics for older clients.
      // This UI's Agent board deliberately opts into the agent-only contract.
      groupBy: params.groupBy === 'assignee' ? 'agent' : params.groupBy,
    });

  create = async (params: {
    assigneeAgentId?: string;
    assigneeUserId?: string;
    automationMode?: TaskAutomationMode;
    config?: Record<string, unknown>;
    createdByAgentId?: string;
    description?: string;
    editorData?: unknown;
    instruction: string;
    /** Labels attached on creation; validated before the task is written. */
    labelIds?: string[];
    name?: string;
    parentTaskId?: string;
    priority?: number;
    projectId?: string;
    schedulePattern?: string;
    scheduleTimezone?: string;
    visibility?: 'private' | 'public';
  }) => lambdaClient.task.create.mutate(params);

  updateVisibility = async (
    id: string,
    visibility: 'private' | 'public',
    options?: { takeOwnership?: boolean },
  ) => lambdaClient.task.updateVisibility.mutate({ id, visibility, ...options });

  update = async (
    id: string,
    data: {
      /**
       * The agent making this change when the task tool runs in the browser
       * (client-first runtime). Attribution only — the server verifies the
       * caller can use that agent before recording it.
       */
      actorAgentId?: string;
      assigneeAgentId?: string | null;
      assigneeUserId?: string | null;
      // Automation mode; null = no automation
      automationMode?: TaskAutomationMode | null;
      config?: Record<string, unknown>;
      /** Deep-merged into `config` server-side under the row lock (vs. `config`, which replaces). */
      configPatch?: Record<string, unknown>;
      context?: Record<string, unknown>;
      description?: string;
      editorData?: unknown;
      // heartbeatInterval: periodic execution interval (seconds), controls how often the task auto-executes
      heartbeatInterval?: number;
      // heartbeatTimeout: watchdog timeout threshold (seconds), used to detect if a running task is stuck
      heartbeatTimeout?: number | null;
      instruction?: string;
      name?: string;
      parentTaskId?: string | null;
      priority?: number;
      // null takes the task out of its project
      projectId?: string | null;
      // schedulePattern: cron expression for scheduled automation (e.g. '0 9 * * *')
      schedulePattern?: string | null;
      // scheduleTimezone: IANA timezone for the cron expression (e.g. 'Asia/Shanghai')
      scheduleTimezone?: string | null;
    },
  ) => lambdaClient.task.update.mutate({ id, ...data });
}

export const taskService = new TaskService();
