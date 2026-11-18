import { agentQuotaSelectors, useAgentQuotaStore } from '@/store/agentQuota';

import type { AgentPresence } from './agentPresence';

/** A card left open keeps following the Agent, without polling like a live dashboard. */
const REFRESH_INTERVAL = 30_000;

/**
 * The status an Agent's contact card shows, as the server resolves it for
 * dispatch, or `undefined` while it cannot be told yet — better no badge than
 * a wrong one.
 */
export const useAgentPresence = (agentId?: string): AgentPresence | undefined => {
  useAgentQuotaStore((s) => s.useFetchAgentAvailability)(agentId, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const availability = useAgentQuotaStore(agentQuotaSelectors.agentAvailability(agentId));

  if (!availability) return;
  return { resetsAt: availability.resetsAt, status: availability.status };
};
