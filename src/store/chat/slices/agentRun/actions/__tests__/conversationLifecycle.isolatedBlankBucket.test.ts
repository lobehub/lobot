import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { agentService } from '@/services/agent';
import { aiChatService } from '@/services/aiChat';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';
import { getSessionStoreState } from '@/store/session';
import { useUserStore } from '@/store/user';

import { useChatStore } from '../../../../store';
import { clearBlankConversationBucket } from '../clearBlankBucket';
import { createMockAgentConfig, createMockMessage, TEST_CONTENT, TEST_IDS } from './fixtures';
import { resetTestEnvironment, setupMockSelectors, spyOnMessageService } from './helpers';

vi.mock('@/services/resourcePermission', () => ({
  resourcePermissionService: { getGeneralAccess: vi.fn() },
}));

vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    session: { updateSession: { mutate: vi.fn().mockResolvedValue(undefined) } },
  },
}));

beforeEach(() => {
  resetTestEnvironment();
  setupMockSelectors();
  spyOnMessageService();
  vi.spyOn(getSessionStoreState(), 'triggerSessionUpdate').mockResolvedValue(undefined);
  vi.spyOn(agentService, 'getAgentConfigById').mockResolvedValue(createMockAgentConfig() as any);
  useUserStore.setState({ workspaceUserPreference: {} });

  act(() => {
    useChatStore.setState({
      executeClientAgent: vi.fn(),
      mainInputEditor: null,
      refreshMessages: vi.fn(),
      refreshTopic: vi.fn(),
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const agentId = TEST_IDS.SESSION_ID;
const blankKey = messageMapKey({ agentId, scope: 'main', topicId: null });

describe('isolated sends and the blank conversation bucket', () => {
  it('clears only the blank bucket of the conversation the send came from', () => {
    const topicKey = messageMapKey({ agentId, topicId: TEST_IDS.TOPIC_ID });
    const leftover = createMockMessage({ id: 'leftover', role: 'user' });
    const kept = createMockMessage({ id: 'kept', role: 'user', topicId: TEST_IDS.TOPIC_ID });
    act(() => {
      useChatStore.setState({
        dbMessagesMap: { [blankKey]: [leftover], [topicKey]: [kept] },
        messagesMap: { [blankKey]: [leftover], [topicKey]: [kept] },
      });
    });

    act(() => clearBlankConversationBucket(useChatStore.getState, { agentId, scope: 'main' }));

    expect(useChatStore.getState().dbMessagesMap[blankKey]).toEqual([]);
    expect(useChatStore.getState().dbMessagesMap[topicKey]).toHaveLength(1);
  });
});
