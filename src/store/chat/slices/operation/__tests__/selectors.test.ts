import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useChatStore } from '@/store/chat/store';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';

import { operationSelectors } from '../selectors';
import {
  INPUT_LOADING_OPERATION_TYPES,
  INTERIM_LOADING_OPERATION_TYPES,
  QUEUE_BLOCKING_OPERATION_TYPES,
  SEND_NOW_CANCEL_REASON,
} from '../types';

describe('Operation Selectors', () => {
  beforeEach(() => {
    useChatStore.setState(useChatStore.getInitialState());
  });

  // Coherence invariant: interim approve/submit/skip/regenerate ops must live in
  // BOTH whitelists. If the input shows loading for an op (INPUT_LOADING), a
  // follow-up must queue behind it and "Send now" must be able to cancel it
  // (QUEUE_BLOCKING). Dropping them from either set silently reintroduces the
  // interleave / stuck-queue / no-op-send-now bugs.
  describe('operation-type set invariants', () => {
    it('keeps interim ops in both INPUT_LOADING and QUEUE_BLOCKING', () => {
      for (const type of INTERIM_LOADING_OPERATION_TYPES) {
        expect(INPUT_LOADING_OPERATION_TYPES).toContain(type);
        expect(QUEUE_BLOCKING_OPERATION_TYPES).toContain(type);
      }
    });

    it('queues later turns behind voice upload without locking the composer', () => {
      expect(QUEUE_BLOCKING_OPERATION_TYPES).toContain('uploadVoiceMessage');
      expect(INPUT_LOADING_OPERATION_TYPES).not.toContain('uploadVoiceMessage');
    });
  });

  describe('getRunningQueueBlockingOperationIds', () => {
    it('returns every running queue-blocking op, not just the first', () => {
      // A delAndRegenerate/delAndResendThread retry runs two concurrent
      // `regenerate` ops (outer wrapper + inner regenerateUserMessage). "Send now"
      // must cancel BOTH — returning only the first would leave the queue blocked.
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };
      let outerId = '';
      let innerId = '';

      act(() => {
        outerId = result.current.startOperation({ type: 'regenerate', context }).operationId;
        innerId = result.current.startOperation({ type: 'regenerate', context }).operationId;
      });

      const ids = operationSelectors.getRunningQueueBlockingOperationIds(context)(result.current);
      expect(ids).toHaveLength(2);
      expect(ids).toEqual(expect.arrayContaining([outerId, innerId]));
    });

    // Regression: the enqueue check used a bare `status === 'running'` while every
    // loading UI used `isRunningOperation` (which excludes isAborting) and
    // `isVisiblyRunningOperation` (which also excludes visibleLoadingDone). The two
    // definitions of "finished" differed by exactly those two fields, so a composer
    // showing Send would silently drop the next message into the tray — forever when
    // the terminal never landed, since the queue only drains on success.
    it('excludes an aborting op — Stop means the next send starts a fresh turn', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };
      let opId = '';

      act(() => {
        opId = result.current.startOperation({ type: 'execAgentRuntime', context }).operationId;
        result.current.updateOperationMetadata(opId, { isAborting: true });
      });

      expect(
        operationSelectors.getRunningQueueBlockingOperationIds(context)(result.current),
      ).toEqual([]);
    });

    it('keeps an aborting op blocking while older follow-ups are queued', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };
      let opId = '';

      act(() => {
        opId = result.current.startOperation({ type: 'execAgentRuntime', context }).operationId;
        result.current.updateOperationMetadata(opId, { isAborting: true });
        result.current.enqueueMessage(messageMapKey(context), {
          content: 'queued first',
          createdAt: Date.now(),
          id: 'queued-1',
          interruptMode: 'soft',
        });
      });

      expect(
        operationSelectors.getRunningQueueBlockingOperationIds(context)(result.current),
      ).toEqual([opId]);
    });

    it('stops blocking once visible output ends — the composer already shows Send', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };
      let opId = '';

      act(() => {
        opId = result.current.startOperation({
          type: 'execServerAgentRuntime',
          context,
        }).operationId;
      });

      expect(
        operationSelectors.getRunningQueueBlockingOperationIds(context)(result.current),
      ).toEqual([opId]);

      act(() => {
        result.current.updateOperationMetadata(opId, { visibleLoadingDone: true });
      });

      expect(
        operationSelectors.getRunningQueueBlockingOperationIds(context)(result.current),
      ).toEqual([]);
    });

    it('keeps blocking past visible output end while follow-ups are already queued', () => {
      // The terminal drain owns those queued items; letting a newer send jump ahead
      // would reorder the conversation and run two turns at once.
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };
      let opId = '';

      act(() => {
        opId = result.current.startOperation({
          type: 'execServerAgentRuntime',
          context,
        }).operationId;
        result.current.updateOperationMetadata(opId, { visibleLoadingDone: true });
        result.current.enqueueMessage(messageMapKey(context), {
          content: 'queued before the visible end',
          createdAt: Date.now(),
          id: 'queued-1',
          interruptMode: 'soft',
        });
      });

      expect(
        operationSelectors.getRunningQueueBlockingOperationIds(context)(result.current),
      ).toEqual([opId]);
    });

    it('excludes non-running and non-blocking ops', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };
      let runningId = '';

      act(() => {
        runningId = result.current.startOperation({ type: 'regenerate', context }).operationId;
        // Different queue-blocking op, but completed → excluded.
        const doneId = result.current.startOperation({
          type: 'execAgentRuntime',
          context,
        }).operationId;
        result.current.completeOperation(doneId);
      });

      expect(
        operationSelectors.getRunningQueueBlockingOperationIds(context)(result.current),
      ).toEqual([runningId]);
    });
  });

  describe('getRunningQueueBlockingOperationIds', () => {
    it('returns every running queue blocker for send-now in the same context', () => {
      const { result } = renderHook(() => useChatStore());

      let outerRegenerate: string;
      let innerRegenerate: string;

      act(() => {
        outerRegenerate = result.current.startOperation({
          context: { agentId: 'agent-1', topicId: 'topic-1' },
          type: 'regenerate',
        }).operationId;
        innerRegenerate = result.current.startOperation({
          context: { agentId: 'agent-1', topicId: 'topic-1' },
          type: 'regenerate',
        }).operationId;
        const completedRegenerate = result.current.startOperation({
          context: { agentId: 'agent-1', topicId: 'topic-1' },
          type: 'regenerate',
        }).operationId;
        result.current.startOperation({
          context: { agentId: 'agent-1', topicId: 'topic-1' },
          type: 'toolCalling',
        });
        result.current.startOperation({
          context: { agentId: 'agent-2', topicId: 'topic-2' },
          type: 'regenerate',
        });
        result.current.completeOperation(completedRegenerate);
      });

      // Regression: delAndRegenerate/delAndResendThread can leave both an outer
      // wrapper regenerate and an inner regenerateUserMessage running. Send-now
      // must cancel both; cancelling only the first makes it re-queue.
      expect(
        operationSelectors.getRunningQueueBlockingOperationIds({
          agentId: 'agent-1',
          topicId: 'topic-1',
        })(result.current),
      ).toEqual([outerRegenerate!, innerRegenerate!]);
    });
  });

  describe('getDeepestRunningOperationByMessage', () => {
    it('should return undefined when no operations exist', () => {
      const { result } = renderHook(() => useChatStore());

      const deepestOp = operationSelectors.getDeepestRunningOperationByMessage('msg1')(
        result.current,
      );

      expect(deepestOp).toBeUndefined();
    });

    it('should return undefined when no running operations exist', () => {
      const { result } = renderHook(() => useChatStore());

      let opId: string;
      act(() => {
        opId = result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'session1', messageId: 'msg1' },
        }).operationId;
        result.current.associateMessageWithOperation('msg1', opId);
        result.current.completeOperation(opId);
      });

      const deepestOp = operationSelectors.getDeepestRunningOperationByMessage('msg1')(
        result.current,
      );

      expect(deepestOp).toBeUndefined();
    });

    it('should return the only running operation when there is one', () => {
      const { result } = renderHook(() => useChatStore());

      let opId: string;
      act(() => {
        opId = result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'session1', messageId: 'msg1' },
        }).operationId;
        result.current.associateMessageWithOperation('msg1', opId);
      });

      const deepestOp = operationSelectors.getDeepestRunningOperationByMessage('msg1')(
        result.current,
      );

      expect(deepestOp).toBeDefined();
      expect(deepestOp?.type).toBe('execAgentRuntime');
    });

    it('should return the leaf operation in a parent-child tree', () => {
      const { result } = renderHook(() => useChatStore());

      let parentOpId: string;
      let childOpId: string;

      act(() => {
        // Start parent operation
        parentOpId = result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'session1', messageId: 'msg1' },
        }).operationId;
        result.current.associateMessageWithOperation('msg1', parentOpId);

        // Start child operation
        childOpId = result.current.startOperation({
          type: 'reasoning',
          context: { agentId: 'session1', messageId: 'msg1' },
          parentOperationId: parentOpId,
        }).operationId;
        result.current.associateMessageWithOperation('msg1', childOpId);
      });

      const deepestOp = operationSelectors.getDeepestRunningOperationByMessage('msg1')(
        result.current,
      );

      // Should return the child (reasoning) not the parent (execAgentRuntime)
      expect(deepestOp).toBeDefined();
      expect(deepestOp?.type).toBe('reasoning');
      expect(deepestOp?.id).toBe(childOpId!);
    });

    it('should return the deepest leaf in a multi-level tree', () => {
      const { result } = renderHook(() => useChatStore());

      let rootOpId: string;
      let level1OpId: string;
      let level2OpId: string;

      act(() => {
        // Level 0: root operation
        rootOpId = result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'session1', messageId: 'msg1' },
        }).operationId;
        result.current.associateMessageWithOperation('msg1', rootOpId);

        // Level 1: child of root
        level1OpId = result.current.startOperation({
          type: 'callLLM',
          context: { agentId: 'session1', messageId: 'msg1' },
          parentOperationId: rootOpId,
        }).operationId;
        result.current.associateMessageWithOperation('msg1', level1OpId);

        // Level 2: grandchild (deepest)
        level2OpId = result.current.startOperation({
          type: 'reasoning',
          context: { agentId: 'session1', messageId: 'msg1' },
          parentOperationId: level1OpId,
        }).operationId;
        result.current.associateMessageWithOperation('msg1', level2OpId);
      });

      const deepestOp = operationSelectors.getDeepestRunningOperationByMessage('msg1')(
        result.current,
      );

      // Should return the deepest leaf (reasoning at level 2)
      expect(deepestOp).toBeDefined();
      expect(deepestOp?.type).toBe('reasoning');
      expect(deepestOp?.id).toBe(level2OpId!);
    });

    it('should return parent when child operation completes', () => {
      const { result } = renderHook(() => useChatStore());

      let parentOpId: string;
      let childOpId: string;

      act(() => {
        parentOpId = result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'session1', messageId: 'msg1' },
        }).operationId;
        result.current.associateMessageWithOperation('msg1', parentOpId);

        childOpId = result.current.startOperation({
          type: 'reasoning',
          context: { agentId: 'session1', messageId: 'msg1' },
          parentOperationId: parentOpId,
        }).operationId;
        result.current.associateMessageWithOperation('msg1', childOpId);
      });

      // Before completing child
      let deepestOp = operationSelectors.getDeepestRunningOperationByMessage('msg1')(
        result.current,
      );
      expect(deepestOp?.type).toBe('reasoning');

      // Complete child operation
      act(() => {
        result.current.completeOperation(childOpId);
      });

      // After completing child, parent should be the deepest running
      deepestOp = operationSelectors.getDeepestRunningOperationByMessage('msg1')(result.current);
      expect(deepestOp?.type).toBe('execAgentRuntime');
      expect(deepestOp?.id).toBe(parentOpId!);
    });
  });

  describe('isMessageProcessing', () => {
    it('should return true if message has running operations', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'session1', messageId: 'msg1' },
        });
      });

      expect(operationSelectors.isMessageProcessing('msg1')(result.current)).toBe(true);
      expect(operationSelectors.isMessageProcessing('msg2')(result.current)).toBe(false);
    });
  });

  describe('isMessageCreating', () => {
    it('should return true for user message during sendMessage operation', () => {
      const { result } = renderHook(() => useChatStore());

      let opId: string;

      act(() => {
        opId = result.current.startOperation({
          type: 'sendMessage',
          context: { agentId: 'session1', messageId: 'user_msg_1' },
        }).operationId;

        // Associate message with operation
        result.current.associateMessageWithOperation('user_msg_1', opId!);
      });

      expect(operationSelectors.isMessageCreating('user_msg_1')(result.current)).toBe(true);
      expect(operationSelectors.isMessageCreating('other_msg')(result.current)).toBe(false);
    });

    it('should return true for assistant message during createAssistantMessage operation', () => {
      const { result } = renderHook(() => useChatStore());

      let opId: string;

      act(() => {
        opId = result.current.startOperation({
          type: 'createAssistantMessage',
          context: { agentId: 'session1', messageId: 'assistant_msg_1' },
        }).operationId;

        // Associate message with operation
        result.current.associateMessageWithOperation('assistant_msg_1', opId!);
      });

      expect(operationSelectors.isMessageCreating('assistant_msg_1')(result.current)).toBe(true);
      expect(operationSelectors.isMessageCreating('other_msg')(result.current)).toBe(false);
    });

    it('should return false when operation completes', () => {
      const { result } = renderHook(() => useChatStore());

      let opId: string;

      act(() => {
        opId = result.current.startOperation({
          type: 'sendMessage',
          context: { agentId: 'session1', messageId: 'msg1' },
        }).operationId;

        result.current.associateMessageWithOperation('msg1', opId!);
      });

      expect(operationSelectors.isMessageCreating('msg1')(result.current)).toBe(true);

      act(() => {
        result.current.completeOperation(opId!);
      });

      expect(operationSelectors.isMessageCreating('msg1')(result.current)).toBe(false);
    });

    it('should return false for other operation types', () => {
      const { result } = renderHook(() => useChatStore());

      let opId: string;

      act(() => {
        // execAgentRuntime should not be considered as "creating"
        opId = result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'session1', messageId: 'msg1' },
        }).operationId;

        result.current.associateMessageWithOperation('msg1', opId!);
      });

      expect(operationSelectors.isMessageCreating('msg1')(result.current)).toBe(false);
    });

    it('should only check sendMessage and createAssistantMessage operations', () => {
      const { result } = renderHook(() => useChatStore());

      let sendMsgOpId: string;
      let createAssistantOpId: string;
      let toolCallOpId: string;

      act(() => {
        // sendMessage - should be creating
        sendMsgOpId = result.current.startOperation({
          type: 'sendMessage',
          context: { agentId: 'session1', messageId: 'user_msg' },
        }).operationId;
        result.current.associateMessageWithOperation('user_msg', sendMsgOpId!);

        // createAssistantMessage - should be creating
        createAssistantOpId = result.current.startOperation({
          type: 'createAssistantMessage',
          context: { agentId: 'session1', messageId: 'assistant_msg' },
        }).operationId;
        result.current.associateMessageWithOperation('assistant_msg', createAssistantOpId!);

        // toolCalling - should NOT be creating
        toolCallOpId = result.current.startOperation({
          type: 'toolCalling',
          context: { agentId: 'session1', messageId: 'tool_msg' },
        }).operationId;
        result.current.associateMessageWithOperation('tool_msg', toolCallOpId!);
      });

      expect(operationSelectors.isMessageCreating('user_msg')(result.current)).toBe(true);
      expect(operationSelectors.isMessageCreating('assistant_msg')(result.current)).toBe(true);
      expect(operationSelectors.isMessageCreating('tool_msg')(result.current)).toBe(false);
    });
  });

  describe('visible loading selectors', () => {
    it('should count a steered run from the start of the turn it continues', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };

      act(() => {
        result.current.startOperation({
          type: 'execServerAgentRuntime',
          context,
          metadata: { startTime: 5000, turnStartTime: 1000 },
        });
      });

      expect(
        operationSelectors.getVisibleAgentRuntimeStartTimeByContext(context)(result.current),
      ).toBe(1000);
    });

    it('should keep counting while a steered send waits for its runtime to start', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };

      act(() => {
        result.current.startOperation({
          type: 'sendMessage',
          context,
          metadata: { startTime: 5000 },
        });
      });

      expect(
        operationSelectors.getVisibleAgentRuntimeStartTimeByContext(context)(result.current),
      ).toBeUndefined();

      act(() => {
        result.current.startOperation({
          type: 'sendMessage',
          context,
          metadata: { startTime: 6000, turnStartTime: 1000 },
        });
      });

      expect(
        operationSelectors.getVisibleAgentRuntimeStartTimeByContext(context)(result.current),
      ).toBe(1000);
    });

    it('should resolve the turn start of the latest runtime operation, finished or not', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };

      act(() => {
        const { operationId: first } = result.current.startOperation({
          type: 'execAgentRuntime',
          context,
          metadata: { startTime: 1000 },
        });
        result.current.completeOperation(first);
        const { operationId: second } = result.current.startOperation({
          type: 'execAgentRuntime',
          context,
          metadata: { startTime: 3000, turnStartTime: 1000 },
        });
        result.current.cancelOperation(second, 'send_now');
        result.current.startOperation({
          type: 'sendMessage',
          context,
          metadata: { startTime: 4000 },
        });
      });

      expect(operationSelectors.getLatestAgentRuntimeTurnStartTime(context)(result.current)).toBe(
        1000,
      );
      expect(
        operationSelectors.getLatestAgentRuntimeTurnStartTime({ agentId: 'agent2' })(
          result.current,
        ),
      ).toBeUndefined();
    });

    it('should keep visible loading while a completed run hands its queue to the next turn', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };

      act(() => {
        const { operationId } = result.current.startOperation({
          type: 'execServerAgentRuntime',
          context,
          metadata: { startTime: 1000 },
        });
        result.current.completeOperation(operationId);
      });

      expect(operationSelectors.isSteerHandoffPending(context)(result.current)).toBe(false);
      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(
        false,
      );

      act(() => {
        result.current.enqueueMessage(messageMapKey(context), {
          content: 'follow up',
          createdAt: 2000,
          files: [],
          id: 'q1',
          interruptMode: 'soft',
        });
      });

      expect(operationSelectors.isSteerHandoffPending(context)(result.current)).toBe(true);
      expect(operationSelectors.isQueueDrainPending(context)(result.current)).toBe(true);
      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(true);
    });

    it('should treat a run cancelled by Send now as handing off to the queued message', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };

      act(() => {
        const { operationId } = result.current.startOperation({
          type: 'execServerAgentRuntime',
          context,
          metadata: { startTime: 1000 },
        });
        result.current.enqueueMessage(messageMapKey(context), {
          content: 'follow up',
          createdAt: 2000,
          id: 'q1',
          interruptMode: 'soft',
        });
        void result.current.cancelOperation(operationId, SEND_NOW_CANCEL_REASON);
      });

      expect(operationSelectors.isSteerHandoffPending(context)(result.current)).toBe(true);
      expect(operationSelectors.isQueueDrainPending(context)(result.current)).toBe(false);
      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(true);
    });

    it('should not treat a queue left behind a cancelled run as a pending handoff', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };

      act(() => {
        const { operationId } = result.current.startOperation({
          type: 'execAgentRuntime',
          context,
          metadata: { startTime: 1000 },
        });
        result.current.enqueueMessage(messageMapKey(context), {
          content: 'follow up',
          createdAt: 2000,
          files: [],
          id: 'q1',
          interruptMode: 'soft',
        });
        result.current.cancelOperation(operationId, 'user_cancelled');
      });

      expect(operationSelectors.isSteerHandoffPending(context)(result.current)).toBe(false);
      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(
        false,
      );
    });

    it('should keep visible loading when a queued message waits behind a visibly-done op', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };

      act(() => {
        useChatStore.setState({ activeAgentId: 'agent1', activeTopicId: 'topic1' });

        // Prior op has finished its visible output but hasn't reached its
        // terminal end yet (visibleLoadingDone), so it is not visibly running.
        result.current.startOperation({
          type: 'execAgentRuntime',
          context,
          metadata: { startTime: 1000, visibleLoadingDone: true },
        });
      });

      // Sanity: without a queued message the input reads idle in this window.
      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(
        false,
      );

      // User sends a follow-up while the op is still running: it queues without
      // its own op. The visible loading must stay on so the input doesn't look idle.
      act(() => {
        result.current.enqueueMessage(messageMapKey(context), {
          content: 'follow-up',
          createdAt: 1200,
          id: 'queued-1',
          interruptMode: 'soft',
        });
      });

      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(true);
    });

    it('should not pin visible loading on a stale queue once the op is no longer running', () => {
      const { result } = renderHook(() => useChatStore());
      const context = { agentId: 'agent1', topicId: 'topic1' };

      let opId!: string;
      act(() => {
        useChatStore.setState({ activeAgentId: 'agent1', activeTopicId: 'topic1' });
        opId = result.current.startOperation({
          type: 'execAgentRuntime',
          context,
          metadata: { startTime: 1000, visibleLoadingDone: true },
        }).operationId;
        result.current.enqueueMessage(messageMapKey(context), {
          content: 'follow-up',
          createdAt: 1200,
          id: 'queued-1',
          interruptMode: 'soft',
        });
      });

      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(true);

      // A cancelled/errored run never drains its queue; with no running op left,
      // the leftover queue must not keep the indicator pinned on.
      act(() => {
        result.current.cancelOperation(opId);
      });

      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(
        false,
      );
    });

    it('should find a queued follow-up in a thread-scope context (full context key)', () => {
      const { result } = renderHook(() => useChatStore());
      // Thread scope keys on threadId/scope; a reduced agentId/topicId key would
      // collapse to the main-scope bucket and miss the queue.
      const context = {
        agentId: 'agent1',
        scope: 'thread' as const,
        threadId: 'thread1',
        topicId: 'topic1',
      };

      act(() => {
        useChatStore.setState({ activeAgentId: 'agent1', activeTopicId: 'topic1' });
        result.current.startOperation({
          type: 'execAgentRuntime',
          context,
          metadata: { startTime: 1000, visibleLoadingDone: true },
        });
        result.current.enqueueMessage(messageMapKey(context), {
          content: 'follow-up',
          createdAt: 1200,
          id: 'queued-1',
          interruptMode: 'soft',
        });
      });

      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(true);
    });

    it('should count a queued follow-up in a thread-scope context (QueueTray mounts)', () => {
      const { result } = renderHook(() => useChatStore());
      // queuedMessageCount gates whether QueueTray mounts. It must key off the
      // same full context as getQueuedMessages/enqueue — a reduced
      // agentId/topicId key would report 0 here and hide the tray even though a
      // real queued message is pinning the input loading.
      const context = {
        agentId: 'agent1',
        scope: 'thread' as const,
        threadId: 'thread1',
        topicId: 'topic1',
      };

      act(() => {
        result.current.enqueueMessage(messageMapKey(context), {
          content: 'follow-up',
          createdAt: 1200,
          id: 'queued-1',
          interruptMode: 'soft',
        });
      });

      expect(operationSelectors.queuedMessageCount(context)(result.current)).toBe(1);
    });

    it('should keep visible loading for a normal running runtime operation', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'agent1', topicId: 'topic1' },
          metadata: { startTime: 1000 },
        });
      });

      const context = { agentId: 'agent1', topicId: 'topic1' };

      expect(
        operationSelectors.isAgentRuntimeVisiblyRunningByContext(context)(result.current),
      ).toBe(true);
      expect(operationSelectors.isInputVisiblyLoadingByContext(context)(result.current)).toBe(true);
      expect(
        operationSelectors.getVisibleAgentRuntimeStartTimeByContext(context)(result.current),
      ).toBe(1000);
    });
  });

  describe('isAgentRunning', () => {
    it('should return false when no operations exist', () => {
      const { result } = renderHook(() => useChatStore());

      expect(operationSelectors.isAgentRunning('agent1')(result.current)).toBe(false);
    });

    it('should return true only for the agent with running operations', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'agent1' },
        });
      });

      expect(operationSelectors.isAgentRunning('agent1')(result.current)).toBe(true);
      expect(operationSelectors.isAgentRunning('agent2')(result.current)).toBe(false);
    });

    it('should return false when operation completes', () => {
      const { result } = renderHook(() => useChatStore());

      let opId: string;

      act(() => {
        opId = result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'agent1' },
        }).operationId;
      });

      expect(operationSelectors.isAgentRunning('agent1')(result.current)).toBe(true);

      act(() => {
        result.current.completeOperation(opId!);
      });

      expect(operationSelectors.isAgentRunning('agent1')(result.current)).toBe(false);
    });

    it('should exclude aborting operations', () => {
      const { result } = renderHook(() => useChatStore());

      let opId: string;

      act(() => {
        opId = result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'agent1' },
        }).operationId;
      });

      expect(operationSelectors.isAgentRunning('agent1')(result.current)).toBe(true);

      act(() => {
        result.current.updateOperationMetadata(opId!, { isAborting: true });
      });

      expect(operationSelectors.isAgentRunning('agent1')(result.current)).toBe(false);
    });

    it('should detect any topic with running operations for the agent', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        // Agent 1, topic 1
        result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'agent1', topicId: 'topic1' },
        });

        // Agent 1, topic 2
        result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'agent1', topicId: 'topic2' },
        });

        // Agent 2, topic 3
        result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'agent2', topicId: 'topic3' },
        });
      });

      // Agent 1 should be running (has 2 topics with operations)
      expect(operationSelectors.isAgentRunning('agent1')(result.current)).toBe(true);
      // Agent 2 should also be running
      expect(operationSelectors.isAgentRunning('agent2')(result.current)).toBe(true);
      // Agent 3 should not be running
      expect(operationSelectors.isAgentRunning('agent3')(result.current)).toBe(false);
    });

    it('should detect server agent runtime operations', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.startOperation({
          type: 'execServerAgentRuntime',
          context: { agentId: 'agent1', groupId: 'group1' },
        });
      });

      expect(operationSelectors.isAgentRunning('agent1')(result.current)).toBe(true);
      expect(operationSelectors.isAgentRunning('agent2')(result.current)).toBe(false);
    });

    it('should not detect non-AI-runtime operations', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        // sendMessage is not an AI runtime operation type
        result.current.startOperation({
          type: 'sendMessage',
          context: { agentId: 'agent1' },
        });
      });

      // sendMessage is not in AI_RUNTIME_OPERATION_TYPES, so should return false
      expect(operationSelectors.isAgentRunning('agent1')(result.current)).toBe(false);
    });
  });

  describe('backward compatibility selectors', () => {
    it('isAgentRuntimeRunning should work', () => {
      const { result } = renderHook(() => useChatStore());

      expect(operationSelectors.isAgentRuntimeRunning(result.current)).toBe(false);

      act(() => {
        result.current.startOperation({
          type: 'execAgentRuntime',
          context: { agentId: 'session1' },
        });
      });

      expect(operationSelectors.isAgentRuntimeRunning(result.current)).toBe(true);
    });
  });
});
