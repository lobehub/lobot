import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import {
  createReplicaSlice,
  createReplicaState,
  recordLens,
  type ReplicaState,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { fetchOnboardingAgentTemplates } from '@/services/agentMarketplace';
import type { AgentTemplate } from '@/services/agentMarketplace/types';

import { onboardingAgentTemplatesResource } from './projection';

interface OnboardingTemplatesState {
  agentTemplatesMap: Record<string, AgentTemplate[]>;
  agentTemplatesReplica: ReplicaState<AgentTemplate[]>;
}

export const useOnboardingTemplatesStore = createWithEqualityFn<OnboardingTemplatesState>()(
  () => ({ agentTemplatesMap: {}, agentTemplatesReplica: createReplicaState() }),
  shallow,
);

const agentTemplatesSlice = createReplicaSlice(onboardingAgentTemplatesResource, {
  actionPrefix: 'onboardingAgentTemplates',
  fetcher: () => fetchOnboardingAgentTemplates(),
  get: useOnboardingTemplatesStore.getState,
  set: useOnboardingTemplatesStore.setState,
  stateKey: 'agentTemplatesReplica',
  view: recordLens<OnboardingTemplatesState, AgentTemplate[]>('agentTemplatesMap'),
});

export const onboardingTemplatesSelectors = {
  /** `undefined` until the templates of `locale` are loaded. */
  agentTemplates: (locale: string) => (s: OnboardingTemplatesState) => s.agentTemplatesMap[locale],
};

export const useFetchOnboardingAgentTemplates = (
  locale: string,
  enabled: boolean,
): ReplicaSyncResult =>
  agentTemplatesSlice.useSync(
    { locale },
    { dedupingInterval: 60_000, enabled, revalidateOnFocus: false },
  );
