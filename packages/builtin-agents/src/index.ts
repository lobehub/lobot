import { AGENT_BUILDER } from './agents/agent-builder';
import { GROUP_AGENT_BUILDER } from './agents/group-agent-builder';
import { GROUP_SUPERVISOR } from './agents/group-supervisor';
import { INBOX } from './agents/inbox';
import { NIGHTLY_REVIEW } from './agents/nightly-review';
import { ONBOARDING_TASK_RECOMMENDER } from './agents/onboarding-task-recommender';
import { ONBOARDING_UNDERSTANDING } from './agents/onboarding-understanding';
import { PAGE_AGENT } from './agents/page-agent';
import { SELF_FEEDBACK_INTENT } from './agents/self-feedback-intent';
import { SELF_REFLECTION } from './agents/self-reflection';
import { SKILL_MANAGEMENT } from './agents/skill-management';
import { TASK_AGENT } from './agents/task-agent';
import { VERIFY_AGENT } from './agents/verify-agent';
import { WEB_ONBOARDING } from './agents/web-onboarding';
import type { BuiltinAgentDefinition, BuiltinAgentSlug } from './types';
import { BUILTIN_AGENT_SLUGS } from './types';

export * from './types';

/**
 * All builtin agents indexed by slug
 */
const BUILTIN_AGENTS: Record<BuiltinAgentSlug, BuiltinAgentDefinition> = {
  [BUILTIN_AGENT_SLUGS.agentBuilder]: AGENT_BUILDER,
  [BUILTIN_AGENT_SLUGS.groupAgentBuilder]: GROUP_AGENT_BUILDER,
  [BUILTIN_AGENT_SLUGS.groupSupervisor]: GROUP_SUPERVISOR,
  [BUILTIN_AGENT_SLUGS.inbox]: INBOX,
  [BUILTIN_AGENT_SLUGS.nightlyReview]: NIGHTLY_REVIEW,
  [BUILTIN_AGENT_SLUGS.onboardingUnderstanding]: ONBOARDING_UNDERSTANDING,
  [BUILTIN_AGENT_SLUGS.onboardingTaskRecommender]: ONBOARDING_TASK_RECOMMENDER,
  [BUILTIN_AGENT_SLUGS.pageAgent]: PAGE_AGENT,
  [BUILTIN_AGENT_SLUGS.selfFeedbackIntent]: SELF_FEEDBACK_INTENT,
  [BUILTIN_AGENT_SLUGS.selfReflection]: SELF_REFLECTION,
  [BUILTIN_AGENT_SLUGS.skillManagement]: SKILL_MANAGEMENT,
  [BUILTIN_AGENT_SLUGS.taskAgent]: TASK_AGENT,
  [BUILTIN_AGENT_SLUGS.verifyAgent]: VERIFY_AGENT,
  [BUILTIN_AGENT_SLUGS.webOnboarding]: WEB_ONBOARDING,
};

/**
 * Get persist config for a builtin agent (for DB operations)
 * @param slug - The builtin agent slug
 * @returns Persist config with slug or undefined if not found
 */
export const getAgentPersistConfig = (slug: string) => {
  const agent = BUILTIN_AGENTS[slug as BuiltinAgentSlug];
  if (!agent) return undefined;

  return { ...agent.persist, slug: agent.slug };
};
