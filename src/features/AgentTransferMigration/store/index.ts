import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import {
  createReplicaSlice,
  createReplicaState,
  recordLens,
  type ReplicaState,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { agentService } from '@/services/agent';
import { chatGroupService } from '@/services/chatGroup';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';

import {
  agentTransferJobResource,
  type AgentTransferJobStatus,
  type MigrationTarget,
  transferJobKey,
  type TransferJobParams,
} from './projection';

export type { AgentTransferJobStatus, MigrationTarget } from './projection';

/**
 * Topics this client can currently show for the active agent/group: the loaded
 * sidebar list plus the open topic. Sent with the status poll so the server
 * only reports pending state for these instead of the job's whole queue
 * (which can hold tens of thousands of topics).
 *
 * Group and agent surfaces share this: both drive the same chat store topic
 * list.
 */
const getVisibleTopicIds = (): string[] => {
  const state = useChatStore.getState();
  const loaded = topicSelectors.currentTopics(state)?.map((topic) => topic.id) ?? [];
  const active = state.activeTopicId;
  // The active topic goes first so the cap can never trim it away — its
  // pending state gates the conversation surface.
  const ids = active ? [active, ...loaded.filter((id) => id !== active)] : loaded;
  return ids.slice(0, 1000);
};

interface AgentTransferJobState {
  /** Job status by `transferJobKey`; `null` = no pending job. */
  transferJobMap: Record<string, AgentTransferJobStatus | null>;
  transferJobReplica: ReplicaState<AgentTransferJobStatus | null>;
}

export const useAgentTransferJobStore = createWithEqualityFn<AgentTransferJobState>()(
  () => ({ transferJobMap: {}, transferJobReplica: createReplicaState() }),
  shallow,
);

const transferJobSlice = createReplicaSlice(agentTransferJobResource, {
  actionPrefix: 'agentTransferJob',
  fetcher: (params) =>
    'groupId' in params
      ? chatGroupService.getTransferJobStatus(params.groupId, getVisibleTopicIds())
      : agentService.getTransferJobStatus(params.agentId, getVisibleTopicIds()),
  get: useAgentTransferJobStore.getState,
  set: useAgentTransferJobStore.setState,
  stateKey: 'transferJobReplica',
  view: recordLens<AgentTransferJobState, AgentTransferJobStatus | null>('transferJobMap'),
});

// `groupId` wins when both are present: on a group page the context's
// `agentId` is the group's supervisor, whose own job (if any) is not the one
// gating these conversations.
export const toTransferJobParams = ({
  agentId,
  groupId,
}: MigrationTarget): TransferJobParams | null =>
  groupId ? { groupId } : agentId ? { agentId } : null;

/** Re-poll one job now (e.g. after its topic was prioritized). */
export const refreshAgentTransferJob = (params: TransferJobParams) =>
  transferJobSlice.revalidate(transferJobKey(params));

export const transferJobSelectors = {
  /** `undefined` until the first status answers. */
  job: (params: TransferJobParams | null) => (s: AgentTransferJobState) =>
    params ? s.transferJobMap[transferJobKey(params)] : undefined,
};

/**
 * Polls only while a job is pending and stops itself once it completes, so
 * the steady state for every normal conversation is a single request per
 * switch. Many components subscribe at once (header badge, chat placeholder,
 * one indicator per sidebar topic row), so the deduping window sits just under
 * the tick: each tick issues ONE request no matter how many rows are visible.
 */
export const useFetchAgentTransferJob = (params: TransferJobParams | null): ReplicaSyncResult =>
  transferJobSlice.useSync(params, {
    dedupingInterval: 2500,
    refreshInterval: (data: AgentTransferJobStatus | null | undefined) => (data ? 3000 : 0),
  });
