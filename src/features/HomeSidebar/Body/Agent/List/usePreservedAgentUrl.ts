import { AGENT_CHAT_URL } from '@lobechat/const';

import { useActiveLocationSelector } from '@/hooks/useActiveLocation';

// Sub-routes that are agent-scoped views (not tied to a specific topic/task id),
// safe to carry over when switching between agents from the sidebar switcher.
const PRESERVED_AGENT_SUB_PATHS = new Set(['topics', 'profile', 'channel']);

/**
 * When switching from an agent's sub-view (e.g. `/agent/A/topics`) to another
 * agent, preserve the sub-route on the destination so the user lands on the
 * same view. Topic / task ids belong to the previous agent and are
 * intentionally dropped.
 */
export const resolvePreservedAgentUrl = (pathname: string, agentId: string): string => {
  const match = pathname.match(/^\/agent\/[^/]+\/([^/]+)\/?$/);
  const subPath = match?.[1];
  if (subPath && PRESERVED_AGENT_SUB_PATHS.has(subPath)) {
    return `/agent/${agentId}/${subPath}`;
  }
  return AGENT_CHAT_URL(agentId, false);
};

// Subscribes to the resolved URL only, so a list of agent rows does not re-render on every navigation.
export const usePreservedAgentUrl = (agentId: string): string =>
  useActiveLocationSelector(({ pathname }) => resolvePreservedAgentUrl(pathname, agentId));
