import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTaskExecutionAvailability } from './useTaskExecutionAvailability';

interface ModelPin {
  model: string;
  provider: string;
}

const state = vi.hoisted(() => ({
  agentModel: { model: 'agent-model', provider: 'agent-provider' } as ModelPin,
  isPreferenceLoading: false,
  toolUseModels: [] as ModelPin[],
  topicModel: undefined as ModelPin | undefined,
}));

vi.mock('@/features/ChatInput/hooks/effectiveAgentModePreference', () => ({
  useEffectiveAgentModePreference: () => ({
    enableAgentMode: true,
    isPreferenceLoading: state.isPreferenceLoading,
    usesWorkspaceMemberMode: false,
  }),
}));

// Store boundary: the real agent, topic and model selectors run against these states.
vi.mock('@/store/agent', () => ({
  useAgentStore: (selector: (s: object) => unknown) =>
    selector({
      activeAgentId: 'agent-1',
      agentMap: { 'agent-1': { ...state.agentModel } },
    }),
}));

vi.mock('@/store/chat', () => ({
  useChatStore: (selector: (s: object) => unknown) =>
    selector({
      activeTopicId: state.topicModel ? 'topic-1' : undefined,
      topicDataMap: {},
      topicDetailMap: state.topicModel ? { 'topic-1': { id: 'topic-1', ...state.topicModel } } : {},
    }),
}));

const renderAvailability = () =>
  renderHook(() => useTaskExecutionAvailability('agent-1')).result.current;

beforeEach(() => {
  state.agentModel = { model: 'agent-model', provider: 'agent-provider' };
  state.isPreferenceLoading = false;
  state.topicModel = undefined;
});

// Agents always call tools, so only the agent mode preference decides availability.
describe('useTaskExecutionAvailability', () => {
  it('is available once the agent mode preference has loaded', () => {
    expect(renderAvailability()).toBe(true);
  });

  it('is unavailable while the agent mode preference is loading', () => {
    state.isPreferenceLoading = true;

    expect(renderAvailability()).toBe(false);
  });
});
