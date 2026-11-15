import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ConversationContext, type ConversationHooks } from '../../../types';
import { createStore } from '../../index';

vi.mock('@/services/topic', () => ({
  topicService: { branchTopicAtMessage: vi.fn(), cancelRateLimitContinuation: vi.fn() },
}));

// Mock useChatStore
const mockStartOperation = vi.fn(() => ({ operationId: 'test-op-id' }));
const mockCompleteOperation = vi.fn();
const mockAssociateMessageWithOperation = vi.fn();
const mockFailOperation = vi.fn();
const mockExecuteGatewayAgent = vi.fn(async ({ onComplete }: { onComplete?: () => void }) => {
  onComplete?.();
});
const mockIsGatewayModeEnabled = vi.fn(() => true);

vi.mock('@/store/chat', () => ({
  useChatStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

const createContinueChatState = (executeGatewayAgent = mockExecuteGatewayAgent) => ({
  dbMessagesMap: {},
  messagesMap: {},
  operations: {},
  operationsByMessage: {},
  topicDataMap: {},
  startOperation: mockStartOperation,
  associateMessageWithOperation: mockAssociateMessageWithOperation,
  completeOperation: mockCompleteOperation,
  failOperation: mockFailOperation,
  executeGatewayAgent,
  isGatewayModeEnabled: mockIsGatewayModeEnabled,
});

describe('Generation Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('continueGeneration', () => {
    it('should continue generation from assistantGroup message with last child as blockId', async () => {
      // Reset mock to ensure all required functions are available
      vi.mocked(await import('@/store/chat').then((m) => m.useChatStore.getState)).mockReturnValue(
        createContinueChatState() as any,
      );

      const context: ConversationContext = {
        agentId: 'session-1',
        topicId: 'topic-1',
        threadId: null,
        groupId: 'group-1',
      };

      const store = createStore({ context });

      // Set displayMessages with assistantGroup message containing children
      act(() => {
        store.setState({
          displayMessages: [
            {
              id: 'group-msg-1',
              role: 'assistantGroup',
              content: '',
              children: [
                { id: 'child-1', content: 'First response' },
                { id: 'child-2', content: 'Second response' },
              ],
            },
          ],
        } as any);
      });

      await act(async () => {
        await store.getState().continueGeneration('group-msg-1');
      });

      // Should create operation with groupMessageId
      expect(mockStartOperation).toHaveBeenCalledWith({
        context: { ...context, messageId: 'group-msg-1' },
        type: 'continue',
      });

      // The server branches a run from the last child of the group
      expect(mockExecuteGatewayAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          context,
          message: '',
          parentMessageId: 'child-2', // last child's id
        }),
      );
    });

    it('should not continue if message is not assistantGroup', async () => {
      // Reset mock to ensure all required functions are available
      vi.mocked(await import('@/store/chat').then((m) => m.useChatStore.getState)).mockReturnValue(
        createContinueChatState() as any,
      );

      const context: ConversationContext = {
        agentId: 'session-1',
        topicId: null,
        threadId: null,
      };

      const store = createStore({ context });

      // Set displayMessages with regular assistant message (not assistantGroup)
      act(() => {
        store.setState({
          displayMessages: [{ id: 'msg-1', role: 'assistant', content: 'Hello' }],
        } as any);
      });

      await act(async () => {
        await store.getState().continueGeneration('msg-1');
      });

      // Should not create operation if message is not assistantGroup
      expect(mockStartOperation).not.toHaveBeenCalled();
      expect(mockExecuteGatewayAgent).not.toHaveBeenCalled();
    });

    it('should not continue if assistantGroup has no children', async () => {
      // Reset mock to ensure all required functions are available
      vi.mocked(await import('@/store/chat').then((m) => m.useChatStore.getState)).mockReturnValue(
        createContinueChatState() as any,
      );

      const context: ConversationContext = {
        agentId: 'session-1',
        topicId: null,
        threadId: null,
      };

      const store = createStore({ context });

      // Set displayMessages with assistantGroup but no children
      act(() => {
        store.setState({
          displayMessages: [
            { id: 'group-msg-1', role: 'assistantGroup', content: '', children: [] },
          ],
        } as any);
      });

      await act(async () => {
        await store.getState().continueGeneration('group-msg-1');
      });

      // Should not create operation if no children
      expect(mockStartOperation).not.toHaveBeenCalled();
      expect(mockExecuteGatewayAgent).not.toHaveBeenCalled();
    });

    it('should call onBeforeContinue hook and respect false return', async () => {
      // Reset mock to ensure all required functions are available
      vi.mocked(await import('@/store/chat').then((m) => m.useChatStore.getState)).mockReturnValue(
        createContinueChatState() as any,
      );

      const onBeforeContinue = vi.fn().mockResolvedValue(false);

      const context: ConversationContext = {
        agentId: 'session-1',
        topicId: null,
        threadId: null,
      };
      const hooks: ConversationHooks = { onBeforeContinue };

      const store = createStore({ context, hooks });

      // Set displayMessages with assistantGroup
      act(() => {
        store.setState({
          displayMessages: [
            {
              id: 'group-msg-1',
              role: 'assistantGroup',
              content: '',
              children: [{ id: 'child-1', content: 'Response' }],
            },
          ],
        } as any);
      });

      await act(async () => {
        await store.getState().continueGeneration('group-msg-1');
      });

      expect(onBeforeContinue).toHaveBeenCalledWith('group-msg-1');
      // Should not call executeGatewayAgent if hook returns false
      expect(mockExecuteGatewayAgent).not.toHaveBeenCalled();
    });

    it('should call onContinueComplete hook after continuation', async () => {
      // Reset mock to ensure all required functions are available
      vi.mocked(await import('@/store/chat').then((m) => m.useChatStore.getState)).mockReturnValue(
        createContinueChatState(mockExecuteGatewayAgent) as any,
      );

      const onContinueComplete = vi.fn();

      const context: ConversationContext = {
        agentId: 'session-1',
        topicId: null,
        threadId: null,
      };
      const hooks: ConversationHooks = { onContinueComplete };

      const store = createStore({ context, hooks });

      // Set displayMessages with assistantGroup
      act(() => {
        store.setState({
          displayMessages: [
            {
              id: 'group-msg-1',
              role: 'assistantGroup',
              content: '',
              children: [{ id: 'child-1', content: 'Response' }],
            },
          ],
        } as any);
      });

      await act(async () => {
        await store.getState().continueGeneration('group-msg-1');
      });

      expect(onContinueComplete).toHaveBeenCalledWith('group-msg-1');
    });

    it('should not continue if message is not found', async () => {
      // Reset mock to ensure all required functions are available
      vi.mocked(await import('@/store/chat').then((m) => m.useChatStore.getState)).mockReturnValue(
        createContinueChatState() as any,
      );

      const context: ConversationContext = {
        agentId: 'session-1',
        topicId: null,
        threadId: null,
      };

      const store = createStore({ context });

      // Set empty displayMessages
      act(() => {
        store.setState({
          displayMessages: [],
        } as any);
      });

      await act(async () => {
        await store.getState().continueGeneration('msg-not-exist');
      });

      // Should not create operation if message not found
      expect(mockStartOperation).not.toHaveBeenCalled();
      expect(mockExecuteGatewayAgent).not.toHaveBeenCalled();
    });
  });

  // Retrying the failed step of a turn used to be "delete the block, then call
  // continueGeneration and hope it still finds a group". Verified live: it did
  // not. Both shapes below deleted the failed step and then created NO operation
  // at all — the answer was gone and nothing was running, with no toast.
});
