import { AgentManagementIdentifier } from '@lobechat/const/builtinTools';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { messageService } from '@/services/message';
import { topicService } from '@/services/topic';
import { agentSelectors } from '@/store/agent/selectors';
import * as agentDispatcher from '@/store/chat/slices/agentRun/actions/dispatch/agentDispatcher';
import { INPUT_LOADING_OPERATION_TYPES } from '@/store/chat/slices/operation/types';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';

import { type ConversationContext, type ConversationHooks } from '../../../types';
import { createStore } from '../../index';
import type { CodexMessageEdit } from './action';
import { MAX_HETERO_AUTO_RETRIES } from './heteroRetryConfig';

vi.mock('@/services/topic', () => ({
  topicService: { branchTopicAtMessage: vi.fn(), cancelRateLimitContinuation: vi.fn() },
}));

// Mock useChatStore
const mockCancelOperations = vi.fn();
const mockCancelOperation = vi.fn();
const mockCancelSendMessageInServer = vi.fn();
const mockRegenerateUserMessage = vi.fn();
const mockRegenerateAssistantMessage = vi.fn();
const mockContinueGenerationMessage = vi.fn();
const mockDeleteMessage = vi.fn();
const mockSwitchMessageBranch = vi.fn();
const mockStartOperation = vi.fn(() => ({ operationId: 'test-op-id' }));
const mockCompleteOperation = vi.fn();
const mockAssociateMessageWithOperation = vi.fn();
const mockFailOperation = vi.fn();
const mockExecuteClientAgent = vi.fn();
const mockIsGatewayModeEnabled = vi.fn(() => false);
const mockExecuteGatewayAgent = vi.fn();
const mockUpdateTopicMetadata = vi.fn();
const mockUpdateTopicStatus = vi.fn();
const mockOpenThreadCreator = vi.fn();
const mockSourceTopic = {
  status: 'scheduled',
  metadata: { scheduledRun: { kind: 'resume_after_rate_limit' } },
};

vi.mock('@/store/chat', () => ({
  useChatStore: {
    getState: vi.fn(() => ({
      dbMessagesMap: {},
      messagesMap: {
        'session-1-': [
          { id: 'msg-1', role: 'user', content: 'Hello' },
          { id: 'msg-2', role: 'assistant', content: 'Hi there', parentId: 'msg-1' },
        ],
      },
      topicDataMap: {},
      topicDetailMap: { 'source-topic': mockSourceTopic },
      operations: {},
      operationsByMessage: {},

      cancelOperations: mockCancelOperations,
      cancelOperation: mockCancelOperation,
      cancelSendMessageInServer: mockCancelSendMessageInServer,
      regenerateUserMessage: mockRegenerateUserMessage,
      regenerateAssistantMessage: mockRegenerateAssistantMessage,
      continueGenerationMessage: mockContinueGenerationMessage,
      deleteMessage: mockDeleteMessage,
      switchMessageBranch: mockSwitchMessageBranch,
      startOperation: mockStartOperation,
      associateMessageWithOperation: mockAssociateMessageWithOperation,
      completeOperation: mockCompleteOperation,
      failOperation: mockFailOperation,
      executeClientAgent: mockExecuteClientAgent,
      isGatewayModeEnabled: mockIsGatewayModeEnabled,
      executeGatewayAgent: mockExecuteGatewayAgent,
      internal_dispatchTopic: vi.fn(),
      openThreadCreator: mockOpenThreadCreator,
      updateTopicMetadata: mockUpdateTopicMetadata,
      updateTopicStatus: mockUpdateTopicStatus,
    })),
    setState: vi.fn(),
  },
}));

const createContext = (topicId: string | null): ConversationContext => ({
  agentId: 'session-1',
  topicId,
  threadId: null,
});

const createRegenerationChatState = () => ({
  dbMessagesMap: {},
  messagesMap: {},
  operations: {},
  operationsByMessage: {},
  topicDataMap: {},

  cancelOperations: mockCancelOperations,
  cancelOperation: mockCancelOperation,
  deleteMessage: mockDeleteMessage,
  switchMessageBranch: mockSwitchMessageBranch,
  startOperation: mockStartOperation,
  associateMessageWithOperation: mockAssociateMessageWithOperation,
  completeOperation: mockCompleteOperation,
  failOperation: mockFailOperation,
  executeClientAgent: mockExecuteClientAgent,
  isGatewayModeEnabled: mockIsGatewayModeEnabled,
});

describe('Generation Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSourceTopic.status = 'scheduled';
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('openThreadCreator', () => {
    it('anchors a steered row on its tail instead of the row/host id', () => {
      const store = createStore({
        context: { agentId: 'session-1', threadId: null, topicId: 'topic-1' },
      });

      // Steered row: host `g1` + steer message `s1` + continuation `g2`. The row
      // renders as one block whose id is `g1` (the chain head), so passing the raw
      // id anchored the fork at the top of the row instead of where the user is.
      store.setState({
        displayMessages: [
          { content: '', createdAt: 0, id: 'u1', role: 'user' },
          { content: '', createdAt: 0, id: 'g1', role: 'assistantGroup' },
          { content: '', createdAt: 0, id: 's1', metadata: { steer: true }, role: 'user' },
          { content: '', createdAt: 0, id: 'g2', role: 'assistantGroup' },
        ] as any,
      });

      act(() => {
        store.getState().openThreadCreator('g1');
      });

      expect(mockOpenThreadCreator).toHaveBeenCalledWith('g2');
    });
  });

  describe('cancelHeteroContinuation', () => {
    it('does not overwrite a source topic that has already started running', async () => {
      mockSourceTopic.status = 'running';
      const store = createStore({
        context: { agentId: 'target-agent', topicId: 'target-topic', threadId: null },
      });
      await store.getState().cancelHeteroContinuation('source-topic');
      expect(mockUpdateTopicStatus).not.toHaveBeenCalled();
      expect(mockUpdateTopicMetadata).not.toHaveBeenCalled();
    });

    it('propagates cancellation failure instead of clearing metadata separately', async () => {
      vi.mocked(topicService.cancelRateLimitContinuation).mockRejectedValueOnce(
        new Error('database failed'),
      );
      const store = createStore({
        context: { agentId: 'agent', topicId: 'source-topic', threadId: null },
      });
      await expect(store.getState().cancelHeteroContinuation()).rejects.toThrow('database failed');
      expect(mockUpdateTopicMetadata).not.toHaveBeenCalled();
    });

    it('cancels the captured source topic after navigation changes the conversation context', async () => {
      const store = createStore({
        context: { agentId: 'target-agent', threadId: null, topicId: 'target-topic' },
      });

      await store.getState().cancelHeteroContinuation('source-topic');

      expect(topicService.cancelRateLimitContinuation).toHaveBeenCalledWith('source-topic');
      expect(mockUpdateTopicStatus).not.toHaveBeenCalled();
      expect(mockUpdateTopicMetadata).not.toHaveBeenCalled();
    });
  });

  describe('stopGenerating', () => {
    it('should cancel all running execAgentRuntime operations', () => {
      const context: ConversationContext = createContext('topic-1');

      const store = createStore({ context });

      act(() => {
        store.getState().stopGenerating();
      });

      expect(mockCancelOperations).toHaveBeenCalledWith(
        {
          agentId: 'session-1',
          groupId: undefined,
          isNew: undefined,
          scope: undefined,
          status: 'running',
          threadId: null,
          topicId: 'topic-1',
          type: INPUT_LOADING_OPERATION_TYPES,
        },
        expect.any(String),
      );
    });

    it('should isolate a creating thread from the main conversation in the same topic', () => {
      const editor = { setJSONState: vi.fn() };
      const context: ConversationContext = {
        agentId: 'session-1',
        isNew: true,
        scope: 'thread',
        threadId: null,
        topicId: 'topic-1',
      };

      const store = createStore({ context });
      store.setState({ editor });

      act(() => {
        store.getState().stopGenerating();
      });

      expect(mockCancelOperations).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'session-1',
          isNew: true,
          scope: 'thread',
          threadId: null,
          topicId: 'topic-1',
        }),
        expect.any(String),
      );
      expect(mockCancelSendMessageInServer).toHaveBeenCalledWith(context, editor);
    });

    it('should call onGenerationStop hook', () => {
      const onGenerationStop = vi.fn();
      const context: ConversationContext = createContext(null);
      const hooks: ConversationHooks = { onGenerationStop };

      const store = createStore({ context, hooks });

      act(() => {
        store.getState().stopGenerating();
      });

      expect(onGenerationStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelOperation', () => {
    it('should cancel specific operation via ChatStore', () => {
      const context: ConversationContext = createContext(null);

      const store = createStore({ context });

      act(() => {
        store.getState().cancelOperation('op-1', 'User cancelled');
      });

      expect(mockCancelOperation).toHaveBeenCalledWith('op-1', 'User cancelled');
    });

    it('should call onOperationCancelled hook', () => {
      const onOperationCancelled = vi.fn();
      const context: ConversationContext = createContext(null);
      const hooks: ConversationHooks = { onOperationCancelled };

      const store = createStore({ context, hooks });

      act(() => {
        store.getState().cancelOperation('op-1');
      });

      expect(onOperationCancelled).toHaveBeenCalledWith('op-1');
    });
  });

  describe('clearOperations', () => {
    it('should be a no-op since operations are managed by ChatStore', () => {
      const context: ConversationContext = createContext(null);

      const store = createStore({ context });

      // clearOperations should be callable without error
      act(() => {
        store.getState().clearOperations();
      });

      // No assertions needed - it's a no-op
    });
  });

  describe('retryFailedAssistantStep', () => {
    const context: ConversationContext = createContext('topic-1');

    const mockChatStore = async () => {
      const { useChatStore } = await import('@/store/chat');
      vi.mocked(useChatStore.getState).mockReturnValue({
        dbMessagesMap: {},
        messagesMap: {},
        dbMessagesMap: {},
        operations: {},
        operationsByMessage: {},
        topicDataMap: {},
        deleteMessage: mockDeleteMessage,
        switchMessageBranch: mockSwitchMessageBranch,
        startOperation: mockStartOperation,
        associateMessageWithOperation: mockAssociateMessageWithOperation,
        completeOperation: mockCompleteOperation,
        failOperation: mockFailOperation,
        executeClientAgent: mockExecuteClientAgent,
        isGatewayModeEnabled: mockIsGatewayModeEnabled,
      } as any);
    };




    it('routes a heterogeneous status error to the session-resuming path', async () => {
      await mockChatStore();
      const store = createStore({ context });
      const deleteDBMessage = vi.fn();
      const continueHeteroAfterError = vi.fn();

      act(() => {
        store.setState({
          continueHeteroAfterError,
          deleteDBMessage,
          displayMessages: [
            { id: 'user-1', role: 'user', content: 'Hi' },
            {
              id: 'group-1',
              role: 'assistantGroup',
              content: '',
              parentId: 'user-1',
              children: [
                { id: 'block-1', content: 'step one' },
                {
                  id: 'block-2',
                  content: '...',
                  error: {
                    type: 'ProviderBizError',
                    body: { agentType: 'claude-code', code: 'overloaded' },
                  },
                },
              ],
            },
          ],
        } as any);
      });

      await act(async () => {
        await store.getState().retryFailedAssistantStep('group-1', 'block-2');
      });

      expect(continueHeteroAfterError).toHaveBeenCalledWith('group-1');
      expect(deleteDBMessage).not.toHaveBeenCalled();
    });
  });

  describe('delAndRegenerateMessage', () => {


    it('should not proceed if assistant message has no parentId', async () => {
      const { useChatStore } = await import('@/store/chat');
      vi.mocked(useChatStore.getState).mockReturnValue({
        dbMessagesMap: {},
        messagesMap: {},
        operations: {},
        operationsByMessage: {},
        topicDataMap: {},

        startOperation: mockStartOperation,
        associateMessageWithOperation: mockAssociateMessageWithOperation,
        completeOperation: mockCompleteOperation,
        deleteMessage: mockDeleteMessage,
      } as any);

      const context: ConversationContext = createContext(null);

      const store = createStore({ context });

      // Set displayMessages with assistant message that has no parentId
      act(() => {
        store.setState({
          displayMessages: [
            { id: 'msg-1', role: 'assistant', content: 'Hi there' }, // no parentId
          ],
        } as any);
      });

      await act(async () => {
        await store.getState().delAndRegenerateMessage('msg-1');
      });

      // Should not proceed - no operation created, no delete called
      expect(mockStartOperation).not.toHaveBeenCalled();
      expect(mockDeleteMessage).not.toHaveBeenCalled();
    });



  });

  describe('regenerateUserMessage', () => {


    it('should bail out if the interim op was cancelled during preflight (Stop pressed)', async () => {
      const { useChatStore } = await import('@/store/chat');
      vi.mocked(useChatStore.getState).mockReturnValue({
        dbMessagesMap: {},
        messagesMap: {},
        // Simulate the user hitting Stop during the preflight awaits: stopGenerating
        // has already flipped the interim regenerate op to 'cancelled'.
        operations: { 'test-op-id': { id: 'test-op-id', status: 'cancelled' } },
        operationsByMessage: {},
        topicDataMap: {},

        cancelOperations: mockCancelOperations,
        cancelOperation: mockCancelOperation,
        deleteMessage: mockDeleteMessage,
        switchMessageBranch: mockSwitchMessageBranch,
        startOperation: mockStartOperation,
        associateMessageWithOperation: mockAssociateMessageWithOperation,
        completeOperation: mockCompleteOperation,
        failOperation: mockFailOperation,
        executeClientAgent: mockExecuteClientAgent,
        isGatewayModeEnabled: mockIsGatewayModeEnabled,
      } as any);

      const context: ConversationContext = createContext('topic-1');

      const store = createStore({ context });

      act(() => {
        store.setState({
          displayMessages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
        } as any);
      });

      await act(async () => {
        await store.getState().regenerateUserMessage('msg-1');
      });

      // The interim op is still created up front (so the input shows loading
      // instantly)...
      expect(mockStartOperation).toHaveBeenCalledWith({
        context: { ...context, messageId: 'msg-1' },
        type: 'regenerate',
      });
      // ...but because Stop cancelled it during preflight, the run must NOT start.
      expect(mockSwitchMessageBranch).not.toHaveBeenCalled();
      expect(mockExecuteClientAgent).not.toHaveBeenCalled();
    });

    it('should bail out if the interim op was cancelled during switchMessageBranch (Stop pressed)', async () => {
      const { useChatStore } = await import('@/store/chat');
      // The op passes the preflight guard as 'running', then a Stop lands while
      // switchMessageBranch is awaiting — flip it to cancelled inside the mock.
      const chatState: any = {
        dbMessagesMap: {},
        messagesMap: {},
        operations: { 'test-op-id': { id: 'test-op-id', status: 'running' } },
        operationsByMessage: {},
        topicDataMap: {},
        dbMessages: [],
        cancelOperations: mockCancelOperations,
        cancelOperation: mockCancelOperation,
        deleteMessage: mockDeleteMessage,
        startOperation: mockStartOperation,
        associateMessageWithOperation: mockAssociateMessageWithOperation,
        completeOperation: mockCompleteOperation,
        failOperation: mockFailOperation,
        executeClientAgent: mockExecuteClientAgent,
        executeGatewayAgent: mockExecuteGatewayAgent,
        isGatewayModeEnabled: mockIsGatewayModeEnabled,
      };
      chatState.switchMessageBranch = vi.fn().mockImplementation(async () => {
        chatState.operations = { 'test-op-id': { id: 'test-op-id', status: 'cancelled' } };
      });
      vi.mocked(useChatStore.getState).mockReturnValue(chatState);

      const context: ConversationContext = createContext('topic-1');

      const store = createStore({ context });

      act(() => {
        store.setState({
          displayMessages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
        } as any);
      });

      await act(async () => {
        await store.getState().regenerateUserMessage('msg-1');
      });

      // The branch switch ran (preflight passed), but the Stop during it must
      // stop the runtime from starting.
      expect(chatState.switchMessageBranch).toHaveBeenCalled();
      expect(mockExecuteClientAgent).not.toHaveBeenCalled();
      expect(mockExecuteGatewayAgent).not.toHaveBeenCalled();
    });


    it('should use executeGatewayAgent when gateway mode is enabled', async () => {
      const { useChatStore } = await import('@/store/chat');
      vi.mocked(useChatStore.getState).mockReturnValue({
        dbMessagesMap: {},
        messagesMap: {},
        operations: {},
        operationsByMessage: {},
        topicDataMap: {},

        startOperation: mockStartOperation,
        associateMessageWithOperation: mockAssociateMessageWithOperation,
        completeOperation: mockCompleteOperation,
        failOperation: mockFailOperation,
        isGatewayModeEnabled: vi.fn(() => true),
        executeGatewayAgent: mockExecuteGatewayAgent,
        executeClientAgent: mockExecuteClientAgent,
        switchMessageBranch: mockSwitchMessageBranch,
      } as any);

      const context: ConversationContext = createContext('topic-1');

      const store = createStore({ context });

      act(() => {
        store.setState({
          displayMessages: [{ id: 'msg-1', role: 'user', content: 'Hello world' }],
        } as any);
      });

      await act(async () => {
        await store.getState().regenerateUserMessage('msg-1');
      });

      // Should switch message branch before gateway call
      expect(mockSwitchMessageBranch).toHaveBeenCalledWith('msg-1', 0, {
        operationId: 'test-op-id',
      });

      // Should call executeGatewayAgent with parentMessageId, original content, and onComplete
      // — and, critically, the wrapper op id. `executeGatewayAgent` completes
      // `parentOperationId` at phase-1 (child runtime op running), which is the
      // only thing that keeps a WS drop before session end from stranding a
      // running `regenerate` op on the user turn. The retry guard reads exactly
      // that op type, so a stranded wrapper would brick retry for the turn
      // permanently (Codex review P1 on this PR).
      expect(mockExecuteGatewayAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          context,
          message: 'Hello world',
          parentMessageId: 'msg-1',
          parentOperationId: 'test-op-id',
          onComplete: expect.any(Function),
        }),
      );

      // Should NOT call client-mode executeClientAgent
      expect(mockExecuteClientAgent).not.toHaveBeenCalled();

      // The flow itself must not settle the wrapper — phase-1 handoff belongs
      // to executeGatewayAgent (mocked here), and double-settling would mask a
      // missing handoff.
      expect(mockCompleteOperation).not.toHaveBeenCalled();

      // Simulate gateway session complete
      const onComplete = mockExecuteGatewayAgent.mock.calls[0][0].onComplete;
      onComplete();
      expect(mockCompleteOperation).toHaveBeenCalledWith('test-op-id');
    });

    it('should call onRegenerateComplete hook after gateway regeneration', async () => {
      const { useChatStore } = await import('@/store/chat');
      vi.mocked(useChatStore.getState).mockReturnValue({
        dbMessagesMap: {},
        messagesMap: {},
        operations: {},
        operationsByMessage: {},
        topicDataMap: {},

        startOperation: mockStartOperation,
        associateMessageWithOperation: mockAssociateMessageWithOperation,
        completeOperation: mockCompleteOperation,
        failOperation: mockFailOperation,
        isGatewayModeEnabled: vi.fn(() => true),
        executeGatewayAgent: mockExecuteGatewayAgent,
        switchMessageBranch: mockSwitchMessageBranch,
      } as any);

      const onRegenerateComplete = vi.fn();
      const context: ConversationContext = createContext('topic-1');

      const store = createStore({ context, hooks: { onRegenerateComplete } });

      act(() => {
        store.setState({
          displayMessages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
        } as any);
      });

      await act(async () => {
        await store.getState().regenerateUserMessage('msg-1');
      });

      // Hook is called via onComplete callback, not directly
      expect(onRegenerateComplete).not.toHaveBeenCalled();

      // Simulate gateway session complete
      const onComplete = mockExecuteGatewayAgent.mock.calls[0][0].onComplete;
      onComplete();
      expect(onRegenerateComplete).toHaveBeenCalledWith('msg-1');
    });


    it('should not regenerate if the message already has a running regenerate op', async () => {
      const { useChatStore } = await import('@/store/chat');
      vi.mocked(useChatStore.getState).mockReturnValue({
        dbMessagesMap: {},
        messagesMap: {},
        operations: {
          'op-1': {
            id: 'op-1',
            type: 'regenerate',
            status: 'running',
            context: { messageIds: ['msg-1'] },
          },
        },
        operationsByMessage: { 'msg-1': ['op-1'] },
        startOperation: mockStartOperation,
        associateMessageWithOperation: mockAssociateMessageWithOperation,
      } as any);

      const context: ConversationContext = createContext(null);

      const store = createStore({ context });

      // Set displayMessages after store creation
      act(() => {
        store.setState({
          displayMessages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
        } as any);
      });

      await act(async () => {
        await store.getState().regenerateUserMessage('msg-1');
      });

      // Should not create operation if already regenerating
      expect(mockStartOperation).not.toHaveBeenCalled();
    });

    // Regression: the guard used to be `isMessageProcessing` — ANY running op on
    // the message. A stray op that outlived its run (a translate, or a gateway
    // regenerate whose WS dropped non-terminally so `onComplete` never fired)
    // then killed retry for that turn permanently, and silently.
  });

  // ===========================================================================
  // CHARACTERIZATION TESTS (lifecycle refactor regression net)
  //
  // These lock the CURRENT behavior of the non-sendMessage entry points so an
  // upcoming lifecycle refactor cannot silently change them. They assert what
  // the code does NOW — including behavior that looks buggy (called out inline).
  // ===========================================================================
  /** @example Both local CLI providers preserve attachments and topic configuration on retry. */

  describe('heterogeneous overloaded auto-retry counter', () => {
    const context: ConversationContext = {
      agentId: 'session-1',
      threadId: null,
      topicId: 'topic-1',
    };

    it('increments the counter keyed by parent user message id', () => {
      const store = createStore({ context });

      act(() => {
        store.getState().recordHeteroOverloadRetry('user-1');
        store.getState().recordHeteroOverloadRetry('user-1');
        store.getState().recordHeteroOverloadRetry('user-2');
      });

      expect(store.getState().heteroOverloadRetryAttempts).toEqual({ 'user-1': 2, 'user-2': 1 });
    });

    it('resets a single scope without touching others', () => {
      const store = createStore({ context });

      act(() => {
        store.getState().recordHeteroOverloadRetry('user-1');
        store.getState().recordHeteroOverloadRetry('user-2');
        store.getState().resetHeteroOverloadRetry('user-1');
      });

      expect(store.getState().heteroOverloadRetryAttempts).toEqual({ 'user-2': 1 });
    });

    it('pins the counter to the cap when marked exhausted (cancel)', () => {
      const store = createStore({ context });

      act(() => {
        store.getState().markHeteroOverloadRetryExhausted('user-1');
      });

      expect(store.getState().heteroOverloadRetryAttempts['user-1']).toBe(MAX_HETERO_AUTO_RETRIES);
    });
  });
});
