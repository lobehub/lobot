import { INBOX_SESSION_ID } from '@lobechat/const';
import { BUILTIN_AGENT_SLUGS } from '@lobechat/const/builtinAgents';

import { type AgentStoreState } from '@/store/agent/initialState';

/**
 * Get builtin agent ID by slug
 */
const getBuiltinAgentId = (slug: string) => (s: AgentStoreState) => s.builtinAgentIdMap[slug];

/**
 * Get inbox agent id from builtinAgentIdMap
 */
const inboxAgentId = (s: AgentStoreState) => s.builtinAgentIdMap[INBOX_SESSION_ID];

/**
 * Check if current active agent is the inbox agent
 */
const isInboxAgent = (s: AgentStoreState) => {
  const id = inboxAgentId(s);
  return !!id && s.activeAgentId === id;
};

/** Every provisioned builtin slug, for classifying a hydrated agent row. */
const BUILTIN_SLUG_SET: ReadonlySet<string> = new Set<string>([
  ...Object.values(BUILTIN_AGENT_SLUGS),
  INBOX_SESSION_ID,
]);

/**
 * Get web onboarding agent id (convenience selector)
 */
const webOnboardingAgentId = (s: AgentStoreState) =>
  s.builtinAgentIdMap[BUILTIN_AGENT_SLUGS.webOnboarding];

export const builtinAgentSelectors = {
  getBuiltinAgentId,
  inboxAgentId,
  isInboxAgent,
  webOnboardingAgentId,
};
