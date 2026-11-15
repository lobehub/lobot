import { type ConversationContext, RequestTrigger } from '@lobechat/types';
import { act, renderHook } from '@testing-library/react';
import { t } from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { lambdaClient } from '@/libs/trpc/client';
import { heterogeneousAgentService } from '@/services/electron/heterogeneousAgent';
import { messageService } from '@/services/message';
import { agentByIdSelectors, agentSelectors } from '@/store/agent/selectors';
import { useUserStore } from '@/store/user';

import { useChatStore } from '../../../../store';
import { messageMapKey } from '../../../../utils/messageMapKey';
import * as agentDispatcher from '../dispatch/agentDispatcher';
import { createMockMessage, createMockResolvedAgentConfig, TEST_IDS } from './fixtures';
import { resetTestEnvironment } from './helpers';

// Mock the tRPC client so the import chain doesn't pull
// server-only code (cloud business packages, redis envs) into the test env.
vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    aiAgent: {
      processHumanIntervention: { mutate: vi.fn().mockResolvedValue({ success: true }) },
      resolveAgentInterventionBySource: {
        mutate: vi.fn().mockResolvedValue({
          contractVersion: 2,
          status: 'unavailable',
          success: false,
        }),
      },
      stopPendingApproval: { mutate: vi.fn().mockResolvedValue({ success: true }) },
      submitHeteroIntervention: { mutate: vi.fn().mockResolvedValue({ success: true }) },
    },
    shareChat: {
      resolveInterventionBySource: {
        mutate: vi.fn().mockResolvedValue({
          contractVersion: 2,
          status: 'unavailable',
          success: false,
        }),
      },
      stopPendingApproval: { mutate: vi.fn().mockResolvedValue({ success: true }) },
    },
  },
}));

vi.mock('@/utils/localStorage', () => {
  class AsyncLocalStorage<State> {
    getFromLocalStorageSync(): State {
      return {} as State;
    }

    async getFromLocalStorage(): Promise<State> {
      return {} as State;
    }

    async saveToLocalStorage(): Promise<void> {
      return undefined;
    }
  }

  return { AsyncLocalStorage };
});

beforeEach(() => {
  resetTestEnvironment();
  vi.mocked(lambdaClient.aiAgent.resolveAgentInterventionBySource.mutate)
    .mockReset()
    .mockResolvedValue({
      contractVersion: 2,
      status: 'unavailable',
      success: false,
    });
  vi.mocked(lambdaClient.shareChat.resolveInterventionBySource.mutate)
    .mockReset()
    .mockResolvedValue({
      contractVersion: 2,
      status: 'unavailable',
      success: false,
    });
  vi.mocked(lambdaClient.shareChat.stopPendingApproval.mutate)
    .mockReset()
    .mockResolvedValue({ operationId: 'operation-share', success: true } as any);
  useChatStore.setState({
    updateTopicStatus: vi.fn().mockResolvedValue(undefined),
    questionSubmissions: {},
  });
  useUserStore.setState({ user: undefined, workspaceUserPreference: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const createToolMessageState = (
  agentId: string,
  topicId: string,
  chatKey: string,
  toolMessage: ReturnType<typeof createMockMessage>,
) => ({
  activeAgentId: agentId,
  activeTopicId: topicId,
  dbMessagesMap: { [chatKey]: [toolMessage] },
  messagesMap: { [chatKey]: [toolMessage] },
});

const createHeteroQuestionMessage = (parentId: string) =>
  createMockMessage({
    id: 'tool-msg-1',
    parentId,
    plugin: {
      apiName: 'askUserQuestion',
      arguments: '{}',
      identifier: 'lobe-claude-code',
      type: 'default',
    },
    role: 'tool',
    tool_call_id: 'cc_call_1',
  } as any);

const captureActError = async (action: () => Promise<void>): Promise<unknown> => {
  let captured: unknown;
  await act(async () => {
    try {
      await action();
    } catch (error) {
      captured = error;
    }
  });
  return captured;
};

describe('ConversationControl actions', () => {
  describe('stopGenerateMessage', () => {
    it('should cancel running generateAI operations in current context', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        useChatStore.setState({
          activeAgentId: TEST_IDS.SESSION_ID,
          activeTopicId: TEST_IDS.TOPIC_ID,
        });
      });

      // Create a generateAI operation
      let operationId: string;
      act(() => {
        const res = result.current.startOperation({
          type: 'execAgentRuntime',
          context: {
            agentId: TEST_IDS.SESSION_ID,
            topicId: TEST_IDS.TOPIC_ID,
          },
        });
        operationId = res.operationId;
      });

      expect(result.current.operations[operationId!].status).toBe('running');

      // Stop generation
      act(() => {
        result.current.stopGenerateMessage();
      });

      expect(result.current.operations[operationId!].status).toBe('cancelled');
    });

    it('should not cancel operations from different context', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        useChatStore.setState({
          activeAgentId: TEST_IDS.SESSION_ID,
          activeTopicId: TEST_IDS.TOPIC_ID,
        });
      });

      // Create a generateAI operation in a different context
      let operationId: string;
      act(() => {
        const res = result.current.startOperation({
          type: 'execAgentRuntime',
          context: {
            agentId: 'different-session',
            topicId: 'different-topic',
          },
        });
        operationId = res.operationId;
      });

      expect(result.current.operations[operationId!].status).toBe('running');

      // Stop generation - should not affect different context
      act(() => {
        result.current.stopGenerateMessage();
      });

      expect(result.current.operations[operationId!].status).toBe('running');
    });

    it('cancels Gateway-mode execServerAgentRuntime ops and invokes their cancel handler', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        useChatStore.setState({
          activeAgentId: TEST_IDS.SESSION_ID,
          activeTopicId: TEST_IDS.TOPIC_ID,
        });
      });

      let operationId!: string;
      act(() => {
        const res = result.current.startOperation({
          type: 'execServerAgentRuntime',
          context: { agentId: TEST_IDS.SESSION_ID, topicId: TEST_IDS.TOPIC_ID },
        });
        operationId = res.operationId;
      });

      const cancelHandler = vi.fn();
      act(() => {
        result.current.onOperationCancel(operationId, cancelHandler);
      });

      expect(result.current.operations[operationId].status).toBe('running');

      act(() => {
        result.current.stopGenerateMessage();
      });

      // Operation gets cancelled and the handler (which would fire the WS interrupt
      // in real code) is invoked with the operation context.
      expect(result.current.operations[operationId].status).toBe('cancelled');
      expect(cancelHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId,
          type: 'execServerAgentRuntime',
        }),
      );
      // isAborting flag is also flipped so the UI loading state clears immediately.
      expect(result.current.operations[operationId].metadata.isAborting).toBe(true);
    });
  });

  describe('cancelSendMessageInServer', () => {
    it('should cancel operation and restore editor state', () => {
      const { result } = renderHook(() => useChatStore());
      const mockSetJSONState = vi.fn();
      const editorState = { content: 'saved content' };

      act(() => {
        useChatStore.setState({
          activeAgentId: TEST_IDS.SESSION_ID,
          activeTopicId: TEST_IDS.TOPIC_ID,
          mainInputEditor: { setJSONState: mockSetJSONState } as any,
        });
      });

      // Create operation
      let operationId: string;
      act(() => {
        const res = result.current.startOperation({
          type: 'sendMessage',
          context: {
            agentId: TEST_IDS.SESSION_ID,
            topicId: TEST_IDS.TOPIC_ID,
          },
        });
        operationId = res.operationId;

        result.current.updateOperationMetadata(res.operationId, {
          inputEditorTempState: editorState,
        });
      });

      expect(result.current.operations[operationId!].status).toBe('running');

      // Cancel
      act(() => {
        result.current.cancelSendMessageInServer();
      });

      expect(result.current.operations[operationId!].status).toBe('cancelled');
      expect(mockSetJSONState).toHaveBeenCalledWith(editorState);
    });

    it('does not restore a completed send or an older cancelled draft', () => {
      const context = { agentId: TEST_IDS.SESSION_ID, topicId: TEST_IDS.TOPIC_ID };
      const editor = { setJSONState: vi.fn() };
      const store = useChatStore.getState();
      const older = store.startOperation({ context, type: 'sendMessage' });
      store.updateOperationMetadata(older.operationId, {
        inputEditorTempState: { content: 'older cancelled draft' },
      });
      store.cancelOperation(older.operationId);
      const latest = store.startOperation({ context, type: 'sendMessage' });
      store.updateOperationMetadata(latest.operationId, {
        inputEditorTempState: { content: 'already sent' },
      });
      store.completeOperation(latest.operationId);

      store.cancelSendMessageInServer(context, editor as any);

      expect(editor.setJSONState).not.toHaveBeenCalled();
    });

    it('restores a pending send only once after stop has cancelled operations', () => {
      const context = { agentId: TEST_IDS.SESSION_ID, topicId: TEST_IDS.TOPIC_ID };
      const editor = { setJSONState: vi.fn() };
      const store = useChatStore.getState();
      const { operationId } = store.startOperation({ context, type: 'sendMessage' });
      const snapshot = { content: 'still sending' };
      store.updateOperationMetadata(operationId, { inputEditorTempState: snapshot });
      store.cancelOperation(operationId);

      store.cancelSendMessageInServer(context, editor as any);
      store.cancelSendMessageInServer(context, editor as any);

      expect(editor.setJSONState).toHaveBeenCalledExactlyOnceWith(snapshot);
    });

    it('should cancel operation for specified topic ID', () => {
      const { result } = renderHook(() => useChatStore());
      const customTopicId = 'custom-topic-id';

      act(() => {
        useChatStore.setState({
          activeAgentId: TEST_IDS.SESSION_ID,
        });
      });

      // Create operation
      let operationId: string;
      act(() => {
        const res = result.current.startOperation({
          type: 'sendMessage',
          context: {
            agentId: TEST_IDS.SESSION_ID,
            topicId: customTopicId,
          },
        });
        operationId = res.operationId;
      });

      expect(result.current.operations[operationId!].status).toBe('running');

      // Cancel
      act(() => {
        result.current.cancelSendMessageInServer(customTopicId);
      });

      expect(result.current.operations[operationId!].status).toBe('cancelled');
    });

    it('should cancel and restore a creating thread without touching the active main conversation', () => {
      const { result } = renderHook(() => useChatStore());
      const mainEditor = { setJSONState: vi.fn() };
      const threadEditor = { setJSONState: vi.fn() };
      const threadEditorState = { content: 'thread draft' };
      const agentId = TEST_IDS.SESSION_ID;
      const topicId = TEST_IDS.TOPIC_ID;

      act(() => {
        useChatStore.setState({
          activeAgentId: agentId,
          activeTopicId: topicId,
          mainInputEditor: mainEditor as any,
        });
      });

      let mainOperationId: string;
      let threadOperationId: string;
      act(() => {
        mainOperationId = result.current.startOperation({
          context: { agentId, scope: 'main', topicId },
          type: 'sendMessage',
        }).operationId;
        threadOperationId = result.current.startOperation({
          context: { agentId, isNew: true, scope: 'thread', threadId: null, topicId },
          metadata: { inputEditorTempState: threadEditorState },
          type: 'sendMessage',
        }).operationId;
      });

      act(() => {
        result.current.cancelSendMessageInServer(
          { agentId, isNew: true, scope: 'thread', threadId: null, topicId },
          threadEditor as any,
        );
      });

      expect(result.current.operations[threadOperationId!].status).toBe('cancelled');
      expect(result.current.operations[mainOperationId!].status).toBe('running');
      expect(threadEditor.setJSONState).toHaveBeenCalledWith(threadEditorState);
      expect(mainEditor.setJSONState).not.toHaveBeenCalled();
    });

    it('should handle gracefully when operation does not exist', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        useChatStore.setState({
          operations: {},
          operationsByContext: {},
        });
      });

      expect(() => {
        act(() => {
          result.current.cancelSendMessageInServer('non-existing-topic');
        });
      }).not.toThrow();
    });
  });

  describe('clearSendMessageError', () => {
    it('should clear error state for current topic', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        useChatStore.setState({
          activeAgentId: TEST_IDS.SESSION_ID,
          activeTopicId: TEST_IDS.TOPIC_ID,
        });
      });

      // Create operation with error
      let operationId: string;
      act(() => {
        const res = result.current.startOperation({
          type: 'sendMessage',
          context: {
            agentId: TEST_IDS.SESSION_ID,
            topicId: TEST_IDS.TOPIC_ID,
          },
        });
        operationId = res.operationId;

        result.current.updateOperationMetadata(res.operationId, {
          inputSendErrorMsg: 'Some error',
        });
      });

      expect(result.current.operations[operationId!].metadata.inputSendErrorMsg).toBe('Some error');

      // Clear error
      act(() => {
        result.current.clearSendMessageError();
      });

      expect(result.current.operations[operationId!].metadata.inputSendErrorMsg).toBeUndefined();
    });

    it('should handle gracefully when no error operation exists', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        useChatStore.setState({
          operations: {},
          operationsByContext: {},
        });
      });

      expect(() => {
        act(() => {
          result.current.clearSendMessageError();
        });
      }).not.toThrow();
    });
  });

  describe('Operation system integration', () => {
    it('should create operation with abort controller', () => {
      const { result } = renderHook(() => useChatStore());

      let operationId: string = '';
      let abortController: AbortController | undefined;

      act(() => {
        const res = result.current.startOperation({
          type: 'sendMessage',
          context: { agentId: 'test-session' },
        });
        operationId = res.operationId;
        abortController = res.abortController;
      });

      expect(abortController!).toBeInstanceOf(AbortController);
      expect(result.current.operations[operationId!].abortController).toBe(abortController);
      expect(result.current.operations[operationId!].status).toBe('running');
    });

    it('should update operation metadata', () => {
      const { result } = renderHook(() => useChatStore());

      let operationId: string;

      act(() => {
        const res = result.current.startOperation({
          type: 'sendMessage',
          context: { agentId: 'test-session' },
        });
        operationId = res.operationId;

        result.current.updateOperationMetadata(res.operationId, {
          inputSendErrorMsg: 'test error',
          inputEditorTempState: { content: 'test' },
        });
      });

      expect(result.current.operations[operationId!].metadata.inputSendErrorMsg).toBe('test error');
      expect(result.current.operations[operationId!].metadata.inputEditorTempState).toEqual({
        content: 'test',
      });
    });

    it('should support multiple parallel operations', () => {
      const { result } = renderHook(() => useChatStore());

      let opId1: string = '';
      let opId2: string = '';

      act(() => {
        const res1 = result.current.startOperation({
          type: 'sendMessage',
          context: { agentId: 'session-1', topicId: 'topic-1' },
        });
        const res2 = result.current.startOperation({
          type: 'sendMessage',
          context: { agentId: 'session-1', topicId: 'topic-2' },
        });

        opId1 = res1.operationId;
        opId2 = res2.operationId;
      });

      expect(result.current.operations[opId1!].status).toBe('running');
      expect(result.current.operations[opId2!].status).toBe('running');
      expect(opId1).not.toBe(opId2);

      const contextKey1 = messageMapKey({ agentId: 'session-1', topicId: 'topic-1' });
      const contextKey2 = messageMapKey({ agentId: 'session-1', topicId: 'topic-2' });

      expect(result.current.operationsByContext[contextKey1]).toContain(opId1!);
      expect(result.current.operationsByContext[contextKey2]).toContain(opId2!);
    });
  });

  describe('switchMessageBranch', () => {
    // ROOT CAUSE:
    // An unclaimed retry grant could outlive its visible branch. Selecting old
    // history must revoke that grant before a newly mounted error card sees it.
    /** @example Branch selection revokes only the selected conversation's grants. */
    it('revokes unclaimed auto retries before displaying another branch', async () => {
      const context = { agentId: 'retry-agent', topicId: 'retry-topic', threadId: null };
      const otherContext = { agentId: 'retry-agent', topicId: 'other-topic', threadId: null };
      const current = useChatStore.getState().startOperation({
        context,
        metadata: { heteroAutoRetryAvailable: true },
        type: 'execServerAgentRuntime',
      });
      const unrelated = useChatStore.getState().startOperation({
        context: otherContext,
        metadata: { heteroAutoRetryAvailable: true },
        type: 'execServerAgentRuntime',
      });
      vi.spyOn(useChatStore.getState(), 'optimisticUpdateMessageMetadata').mockImplementation(
        async () => {
          /** @example Revocation happens before the asynchronous branch replacement. */
          expect(
            useChatStore.getState().operations[current.operationId].metadata
              .heteroAutoRetryAvailable,
          ).toBe(false);
        },
      );
      await useChatStore.getState().switchMessageBranch('parent-user', 1, { context });
      /** @example Other topics retain their live recovery intent. */
      expect(
        useChatStore.getState().operations[unrelated.operationId].metadata.heteroAutoRetryAvailable,
      ).toBe(true);
    });

    it('should switch to a different message branch', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = TEST_IDS.MESSAGE_ID;
      const branchIndex = 1;

      const optimisticUpdateSpy = vi
        .spyOn(result.current, 'optimisticUpdateMessageMetadata')
        .mockResolvedValue(undefined);

      await act(async () => {
        await result.current.switchMessageBranch(messageId, branchIndex);
      });

      expect(optimisticUpdateSpy).toHaveBeenCalledWith(
        messageId,
        { activeBranchIndex: branchIndex },
        undefined,
      );
    });

    it('should handle switching to branch 0', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = TEST_IDS.MESSAGE_ID;
      const branchIndex = 0;

      const optimisticUpdateSpy = vi
        .spyOn(result.current, 'optimisticUpdateMessageMetadata')
        .mockResolvedValue(undefined);

      await act(async () => {
        await result.current.switchMessageBranch(messageId, branchIndex);
      });

      expect(optimisticUpdateSpy).toHaveBeenCalledWith(
        messageId,
        { activeBranchIndex: 0 },
        undefined,
      );
    });

    it('should handle errors gracefully when optimistic update fails', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = TEST_IDS.MESSAGE_ID;
      const branchIndex = 2;

      const optimisticUpdateSpy = vi
        .spyOn(result.current, 'optimisticUpdateMessageMetadata')
        .mockRejectedValue(new Error('Update failed'));

      await expect(
        act(async () => {
          await result.current.switchMessageBranch(messageId, branchIndex);
        }),
      ).rejects.toThrow('Update failed');

      expect(optimisticUpdateSpy).toHaveBeenCalledWith(
        messageId,
        { activeBranchIndex: branchIndex },
        undefined,
      );
    });
  });









  // ===========================================================================
  // CHARACTERIZATION TESTS (lifecycle refactor regression net)
  //
  // Lock the CURRENT behavior of these non-sendMessage entry points so an
  // upcoming lifecycle refactor cannot silently change them. They assert what
  // the code does NOW.
  // ===========================================================================

});
