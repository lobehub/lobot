import { defineReplica, identityOnlyScope } from '@/libs/replica';
import type { AgentTemplate } from '@/services/agentMarketplace/types';

/**
 * Marketplace agent templates the onboarding picker offers, per UI locale.
 * The same for every workspace, so partitioned by identity only; persisted so
 * a returning onboarding step paints its grid at once.
 */
export const onboardingAgentTemplatesResource = defineReplica<{ locale: string }, AgentTemplate[]>({
  key: ({ locale }) => locale,
  name: 'onboardingAgentTemplates',
  persist: { maxEntries: 5 },
  scope: identityOnlyScope,
  storage: 'indexedDB',
  version: 1,
});
