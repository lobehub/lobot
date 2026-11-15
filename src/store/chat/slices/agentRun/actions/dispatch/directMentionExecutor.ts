import {
  AgentRuntimeErrorType,
  ChatErrorType,
  type ChatMessageError,
  type ConversationContext,
  ThreadStatus,
} from '@lobechat/types';

import type { ChatStore } from '@/store/chat/store';

import { ServerSubAgentTask } from './serverSubAgentTask';

interface DirectMentionExecutionParams {
  context: ConversationContext;
  instruction: string;
  parentOperationId: string;
  sourceMessageId: string;
  targetAgentId: string;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const toDirectMentionMessageError = (error: unknown): ChatMessageError => {
  const message = getErrorMessage(error);
  const isDeviceOffline = message.includes('DEVICE_OFFLINE');

  if (isDeviceOffline) {
    return { type: ChatErrorType.DeviceGatewayNotConfigured };
  }

  return {
    body: { message },
    message,
    type: AgentRuntimeErrorType.AgentRuntimeError,
  };
};

const MENTION_MARKUP = /<mention\s[^>]*?name="([^"]*)"[^>]*\/>\s*/g;

/** Thread title for a direct @Agent run: mentions read as `@name`, not as their markup. */
export const toDirectMentionThreadTitle = (instruction: string): string =>
  instruction
    .replaceAll(MENTION_MARKUP, (_, name: string) => `@${name} `)
    .trim()
    .slice(0, 50);

/**
 * Executes a direct @Agent route as an isolated task and projects its final
 * answer onto the source assistant message in the parent conversation.
 *
 * The server owns durable Thread completion and projection. The client mirrors
 * the result into the active store so the visible conversation updates without
 * waiting for a refetch.
 */
export const executeDirectMention = async (
  params: DirectMentionExecutionParams,
  get: () => ChatStore,
): Promise<void> => {
  const { context, instruction, parentOperationId, sourceMessageId, targetAgentId } = params;

  if (!context.topicId) throw new Error('Direct mention requires a persisted topic');

  const { operationId } = get().startOperation({
    context: { ...context, messageId: sourceMessageId },
    parentOperationId,
    type: 'execClientSubAgent',
  });
  get().associateMessageWithOperation(sourceMessageId, operationId);

  let stopWatching: (() => void) | undefined;
  const endWatching = () => {
    stopWatching?.();
    stopWatching = undefined;
  };

  // The progress card needs the thread now, not after the first poll.
  const showRunningThread = (threadId: string) =>
    get().internal_dispatchMessage(
      {
        id: sourceMessageId,
        type: 'updateMessage',
        value: {
          taskDetail: {
            startedAt: new Date().toISOString(),
            status: ThreadStatus.Processing,
            threadId,
          },
        },
      },
      { operationId },
    );

  try {
    const topicId = context.topicId;
    const transport = new ServerSubAgentTask(get, operationId, {
      onDispatched: (dispatch) => {
        showRunningThread(dispatch.threadId);
        // The full-record panel resolves the thread's agent from this list.
        void get().refreshThreads();
        // Follow the child live, so its thread fills in as it streams.
        if (!dispatch.token) return;
        stopWatching = get().watchSubAgentRun({
          assistantMessageId: dispatch.assistantMessageId,
          context: {
            agentId: targetAgentId,
            scope: 'thread',
            threadId: dispatch.threadId,
            topicId,
          },
          operationId: dispatch.operationId,
          token: dispatch.token,
        });
      },
    });
    const result = await transport.run({
      agentId: targetAgentId,
      instruction,
      parentMessageId: sourceMessageId,
      parentOperationId: operationId,
      title: toDirectMentionThreadTitle(instruction),
      topicId,
    });
    endWatching();

    if (!result.success) throw new Error(result.error || 'Mentioned agent execution failed');
    const resultContent = result.result || '';

    await get().optimisticUpdateMessageContent(sourceMessageId, resultContent, undefined, {
      operationId,
    });
    void get().refreshThreads();
    // The thread panel keys its transcript by the mentioned agent; one fetched
    // while the run was still going would otherwise keep an empty reply.
    void get().refreshMessages({ agentId: targetAgentId, topicId: context.topicId });
    get().completeOperation(operationId);
  } catch (error) {
    endWatching();
    void get().refreshMessages({ agentId: targetAgentId, topicId: context.topicId });

    await get()
      .optimisticUpdateMessageError(sourceMessageId, toDirectMentionMessageError(error), {
        operationId,
      })
      .catch(console.error);

    get().failOperation(operationId, {
      message: getErrorMessage(error),
      type: 'DirectMentionExecutionError',
    });
    throw error;
  }
};
