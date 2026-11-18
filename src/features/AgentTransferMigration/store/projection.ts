import { defineReplica } from '@/libs/replica';

/**
 * What a migration surface is keyed on. Exactly one side is set: agent
 * conversations poll by `agentId`, group conversations by `groupId` (a group's
 * job is registered against the group, not its member agents — an empty roster
 * would otherwise have nothing to look up).
 */
export interface MigrationTarget {
  agentId?: null | string;
  groupId?: null | string;
}

export interface AgentTransferJobStatus {
  completedTopics: number;
  jobId: string;
  pendingTopicIds: string[];
  totalTopics: number;
  /** Job kind (`transfer` | `copy`) — progress hints are worded by it. */
  type: string;
}

/** The side a job is polled by; `groupId` wins over the agent. */
export type TransferJobParams = { agentId: string } | { groupId: string };

export const transferJobKey = (params: TransferJobParams) =>
  'groupId' in params ? `group/${params.groupId}` : `agent/${params.agentId}`;

/**
 * The async history-backfill job of a transferred / copied agent or chat
 * group; `null` once it completes (or when there never was one). Memory only:
 * a running job's progress is stale the moment it is written, and the
 * steady state (`null`) is nothing to paint.
 */
export const agentTransferJobResource = defineReplica<
  TransferJobParams,
  AgentTransferJobStatus | null
>({
  key: transferJobKey,
  name: 'agentTransferJob',
  storage: 'memory',
  version: 1,
});
