import { useCallback, useEffect } from 'react';

import { useChatStore } from '@/store/chat';

import {
  type MigrationTarget,
  refreshAgentTransferJob,
  toTransferJobParams,
  transferJobSelectors,
  useAgentTransferJobStore,
  useFetchAgentTransferJob,
} from './store';

export type { MigrationTarget } from './store';

/**
 * Poll the async history-backfill status of a transferred/copied agent or
 * chat group. `data` is the pending job, `null` once it completes.
 */
export const useAgentTransferJob = ({ agentId, groupId }: MigrationTarget) => {
  const params = toTransferJobParams({ agentId, groupId });
  const { error, isValidating } = useFetchAgentTransferJob(params);
  const data = useAgentTransferJobStore(transferJobSelectors.job(params));

  const revalidate = useCallback(async () => {
    const target = toTransferJobParams({ agentId, groupId });
    if (target) await refreshAgentTransferJob(target);
  }, [agentId, groupId]);

  // The candidate set is an implicit fetcher argument, not part of the replica
  // key: opening a topic that the previous (capped) candidates missed would
  // otherwise read stale `pendingTopicIds` until the next 3s tick, leaving
  // the conversation ungated against unmigrated history. Revalidate the
  // moment the active topic changes while a job is pending.
  const activeTopicId = useChatStore((s) => s.activeTopicId);
  const hasPendingJob = !!data;
  useEffect(() => {
    if (hasPendingJob) void revalidate();
  }, [activeTopicId, hasPendingJob, revalidate]);

  return { data, error, isValidating, revalidate };
};
