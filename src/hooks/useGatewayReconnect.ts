import { useEffect, useRef } from 'react';

import { useChatStore } from '@/store/chat';
import { useServerConfigStore } from '@/store/serverConfig';
import { isTrpcErrorCode } from '@/utils/trpcError';

/** Transient failures retry with exponential backoff. */
const MAX_RETRIES = 5;
const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000);

interface RunningOperation {
  assistantMessageId: string;
  heteroType?: string | null;
  operationId: string;
  scope?: string;
  startedAt?: string;
  threadId?: string | null;
}

/**
 * Auto-reconnect to a running Gateway operation on the given topic.
 *
 * The caller sources `runningOperation` itself — the chat-store topic map
 * (main agent) and the task-detail activity (task drawer) live in different
 * stores, so this hook stays source-agnostic.
 *
 * Reconnect only depends on whether the server has a Gateway URL configured;
 * the user's lab toggle controls *new* requests, not resuming an op that's
 * already running on the Gateway.
 *
 * Keyed on the operationId: one reconnect attempt fires per op while mounted,
 * and concurrent callers share it (`reconnectToGatewayOperation` dedupes).
 */
export const useGatewayReconnect = (
  topicId: string | null | undefined,
  runningOperation: RunningOperation | null | undefined,
  /**
   * Agent owning the rendered conversation. Required off the agent route (task
   * detail / home run drawer), where the chat store's `activeAgentId` is stale or
   * unset — see `reconnectToGatewayOperation`.
   */
  agentId?: string,
  /**
   * Present on the agent-share visitor surface. Routes the reconnect's token
   * refresh and cancellation through the share-authorized `shareChat`
   * procedures instead of the owner-scoped ones — see
   * `reconnectToGatewayOperation`'s param JSDoc.
   */
  agentShareId?: string,
) => {
  const agentGatewayUrl = useServerConfigStore((s) => s.serverConfig.agentGatewayUrl);

  // The attempt reads the latest marker fields without re-firing when they change.
  const latest = useRef({ agentId, agentShareId, runningOperation, topicId });
  latest.current = { agentId, agentShareId, runningOperation, topicId };

  const operationId =
    runningOperation && topicId && agentGatewayUrl ? runningOperation.operationId : null;

  useEffect(() => {
    if (!operationId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async (retry: number) => {
      const { runningOperation, topicId } = latest.current;
      if (cancelled || !runningOperation || !topicId) return;

      try {
        await useChatStore.getState().reconnectToGatewayOperation({
          agentId: latest.current.agentId,
          agentShareId: latest.current.agentShareId,
          assistantMessageId: runningOperation.assistantMessageId,
          heteroType: runningOperation.heteroType,
          operationId: runningOperation.operationId,
          scope: runningOperation.scope,
          startedAt: runningOperation.startedAt,
          threadId: runningOperation.threadId,
          topicId,
        });
      } catch (error) {
        // Never retry the stale-marker case (operation already gone → NOT_FOUND) or a
        // teammate's run the gateway will not stream to this user (FORBIDDEN), even if
        // either escapes the action-level catch; transient network/server errors retry
        // so a live run still resumes.
        if (
          cancelled ||
          retry >= MAX_RETRIES ||
          isTrpcErrorCode(error, 'NOT_FOUND') ||
          isTrpcErrorCode(error, 'FORBIDDEN')
        )
          return;
        timer = setTimeout(() => void attempt(retry + 1), retryDelay(retry));
      }
    };

    void attempt(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [operationId]);
};
