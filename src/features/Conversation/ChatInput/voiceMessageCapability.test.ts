import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { canSendVoiceMessage, useCanSendVoiceMessage } from './voiceMessageCapability';

const state = vi.hoisted(() => ({ asrConfigured: true, heterogeneous: true }));

vi.mock('@/store/agent', () => ({
  getAgentStoreState: () => state,
  useAgentStore: (selector: (s: typeof state) => unknown) => selector(state),
}));
vi.mock('@/store/agent/selectors', () => ({
  agentByIdSelectors: {
    isAgentHeterogeneousById: () => (s: typeof state) => s.heterogeneous,
  },
}));
vi.mock('@/store/user', () => ({
  getUserStoreState: () => state,
  useUserStore: (selector: (s: typeof state) => unknown) => selector(state),
}));
vi.mock('@/store/user/selectors', () => ({
  systemAgentSelectors: { isAsrConfigured: (s: typeof state) => s.asrConfigured },
}));

const context = { agentId: 'agent-1' } as never;

beforeEach(() => {
  state.asrConfigured = true;
  state.heterogeneous = true;
});

describe('voice messages', () => {
  it('records for an external Agent once speech-to-text is configured', () => {
    expect(canSendVoiceMessage(context)).toBe(true);
    expect(renderHook(() => useCanSendVoiceMessage(context)).result.current).toBe(true);
  });

  it('stays off without speech-to-text', () => {
    state.asrConfigured = false;
    expect(canSendVoiceMessage(context)).toBe(false);
    expect(renderHook(() => useCanSendVoiceMessage(context)).result.current).toBe(false);
  });

  it('stays off for an Agent that is not external', () => {
    state.heterogeneous = false;
    expect(canSendVoiceMessage(context)).toBe(false);
  });
});
