import type { TaskLabelWithUsage } from '@lobot/types';

import { defineReplica } from '@/libs/replica';

/**
 * One registry per cache scope. Labels are workspace-shared, or personal outside a workspace;
 * the replica scope (`${userId}:${workspaceId}`) keeps a switch from serving the previous
 * workspace's labels.
 */
export const TASK_LABELS_KEY = 'registry';

export const taskLabelsResource = defineReplica<Record<string, never>, TaskLabelWithUsage[]>({
  key: () => TASK_LABELS_KEY,
  name: 'taskLabels',
  storage: 'indexedDB',
  version: 1,
});
