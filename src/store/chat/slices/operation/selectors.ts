import { type ChatStoreState } from '@/store/chat/initialState';
import { messageMapKey, type MessageMapKeyInput } from '@/store/chat/utils/messageMapKey';
import { topicMapKey } from '@/store/chat/utils/topicMapKey';

import { type Operation, type OperationType } from './types';
import {
  AI_RUNTIME_OPERATION_TYPES,
  INPUT_LOADING_OPERATION_TYPES,
  isQueueBlockingOperation,
  QUEUE_BLOCKING_OPERATION_TYPES,
  SEND_NOW_CANCEL_REASON,
  TOPIC_VISIBLY_RUNNING_OPERATION_TYPES,
} from './types';

const isRunningOperation = (op: Operation): boolean =>
  op.status === 'running' && !op.metadata.isAborting;

const isVisiblyRunningOperation = (op: Operation): boolean =>
  isRunningOperation(op) && !op.metadata.visibleLoadingDone;

/**
 * Get operation by ID
 */
const getOperationById =
  (operationId: string) =>
  (s: ChatStoreState): Operation | undefined => {
    return s.operations[operationId];
  };

/**
 * Walk up the parent chain from an operation until the owning AI runtime
 * operation (see AI_RUNTIME_OPERATION_TYPES) is found. Returns undefined when
 * the chain has no runtime ancestor (e.g. a standalone tool operation).
 */
const findRootRuntimeOperation =
  (operationId: string) =>
  (s: ChatStoreState): Operation | undefined => {
    let currentOp: Operation | undefined = s.operations[operationId];
    while (currentOp) {
      if (AI_RUNTIME_OPERATION_TYPES.includes(currentOp.type)) return currentOp;

      const parentId: string | undefined = currentOp.parentOperationId;
      currentOp = parentId ? s.operations[parentId] : undefined;
    }
    return undefined;
  };

/**
 * Get operations by message ID
 */
const getOperationsByMessage =
  (messageId: string) =>
  (s: ChatStoreState): Operation[] => {
    const operationIds = s.operationsByMessage[messageId] || [];
    return operationIds.map((id) => s.operations[id]).filter(Boolean);
  };

/**
 * Get operations by context (agentId, topicId, threadId, scope, groupId, subAgentId).
 *
 * Operations are indexed by `operationsByContext` under the full `messageMapKey`,
 * which keys on scope/group/subAgent in addition to agent+topic. Callers that
 * live inside a group or thread/sub-agent conversation MUST pass the matching
 * scope/group info — omitting them computes the 'main' scope key, which silently
 * returns an empty list and causes flows like approve/reject to fall back to the
 * wrong branch. Same-shape input as messageMapKey for consistency.
 */
const getOperationsByContext =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): Operation[] => {
    const contextKey = messageMapKey(context);
    const operationIds = s.operationsByContext[contextKey] || [];
    return operationIds
      .map((id) => s.operations[id])
      .filter((op): op is Operation => {
        if (!op) return false;
        // Also filter by threadId if provided
        const opThreadId = op.context.threadId ?? null;
        const contextThreadId = context.threadId ?? null;
        return opThreadId === contextThreadId;
      });
  };

/**
 * Whether a later conversation operation has taken ownership of this context.
 *
 * A run can publish `visible_output_end` before its terminal snapshot arrives,
 * which intentionally lets the next send start. The old snapshot must not then
 * replace the newer turn's optimistic messages. Status is deliberately ignored:
 * the newer send may already have handed off to its runtime (or even settled),
 * but its later registration in the context index still proves that the older
 * snapshot is superseded. The index is local insertion order, so it remains
 * monotonic even when restored server timestamps and the client clock differ.
 * Child operations stay within their parent's turn and therefore cannot claim
 * conversation ownership from that turn's terminal reconciliation.
 */
const hasNewerConversationOperation =
  (operationId: string, context: Operation['context']) =>
  (s: ChatStoreState): boolean => {
    const operation = s.operations[operationId];
    if (!operation || !context.agentId) return false;

    const operations = getOperationsByContext({ ...context, agentId: context.agentId })(s);
    const operationIndex = operations.findIndex((candidate) => candidate.id === operationId);
    if (operationIndex < 0) return false;

    return operations
      .slice(operationIndex + 1)
      .some(
        (candidate) =>
          !candidate.parentOperationId && QUEUE_BLOCKING_OPERATION_TYPES.includes(candidate.type),
      );
  };

/**
 * Check if agent runtime is running in a specific context
 * Checks all AI runtime operation types (see AI_RUNTIME_OPERATION_TYPES)
 */
const isAgentRuntimeRunningByContext =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): boolean => {
    if (!context.agentId) return false;

    const operations = getOperationsByContext(context)(s);

    return operations.some(
      (op) =>
        AI_RUNTIME_OPERATION_TYPES.includes(op.type) &&
        op.status === 'running' &&
        !op.metadata.isAborting,
    );
  };

/**
 * Check if agent runtime should still show visible loading in a specific context.
 * The underlying operation may remain running for terminal bookkeeping after a
 * producer has emitted visible_output_end.
 */
const isAgentRuntimeVisiblyRunningByContext =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): boolean => {
    if (!context.agentId) return false;

    const operations = getOperationsByContext(context)(s);

    return operations.some(
      (op) => AI_RUNTIME_OPERATION_TYPES.includes(op.type) && isVisiblyRunningOperation(op),
    );
  };

/**
 * All live queue-blocking operation ids in a context (see
 * `isQueueBlockingOperation` — the same predicate the enqueue check uses, so
 * "Send now" cancels exactly what a fresh send would have queued behind and
 * never fires at an op that already stopped holding the queue). "Send now"
 * cancels every one of them, not just
 * the first: a retry via delAndRegenerate/delAndResendThread runs an outer
 * wrapper `regenerate` op AND an inner regenerateUserMessage `regenerate` op at
 * once, so cancelling only one would leave the queue blocked and make "Send now"
 * a no-op during that retry window.
 */
const getRunningQueueBlockingOperationIds =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): string[] => {
    if (!context.agentId) return [];
    const hasQueuedMessages = getQueuedMessages(context)(s).length > 0;
    return getOperationsByContext(context)(s)
      .filter((op) => isQueueBlockingOperation(op, { hasQueuedMessages }))
      .map((op) => op.id);
  };

/**
 * Whether the run a context's queue waits behind sends it only once the whole
 * run ends, instead of at the next step boundary.
 *
 * Heterogeneous CLI runs (Claude Code, Codex, …) cannot hand the turn back
 * mid-run: a local `execHeterogeneousAgent` drains the queue after the CLI
 * exits, and a Gateway run the server dispatched to an external producer
 * (`heteroType`) drains it in `heteroFinish`. Read from the running operation,
 * not the conversation's agent config, which can differ from what actually
 * runs (an `@Agent` route, a legacy CLI agent recovered from its model id).
 *
 * A Gateway run whose producer went unreported (`heteroType` undefined: an
 * older server or topic marker) may be a CLI run, so it promises the later
 * timing, as the Gateway lifecycle treats it (`heteroType !== null`). A group
 * member's run is skipped: its supervisor's run owns the queue.
 *
 * With nothing holding the queue locally, the queue still waits behind its
 * idle host: a Gateway CLI socket that closes without its terminal completes
 * the local op, yet the server keeps the producer running until `heteroFinish`.
 */
const isQueueDrainedAtRunEnd =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): boolean => {
    if (!context.agentId) return false;
    const hasQueuedMessages = getQueuedMessages(context)(s).length > 0;
    const isCliRun = (op: Operation) => {
      if (op.metadata.liveSteer) return false;
      if (op.type === 'execHeterogeneousAgent') return true;
      if (op.type !== 'execServerAgentRuntime') return false;

      const parent = op.parentOperationId ? s.operations[op.parentOperationId] : undefined;
      return parent?.type !== 'execServerAgentRuntime' && op.metadata.heteroType !== null;
    };

    const blocking = getOperationsByContext(context)(s).filter((op) =>
      isQueueBlockingOperation(op, { hasQueuedMessages }),
    );
    if (blocking.length > 0) return blocking.some(isCliRun);

    const host = getIdleQueueHost(context)(s);
    return !!host && isCliRun(host);
  };

const getOperationTurnStartTime = (op: Operation) =>
  op.metadata.turnStartTime ?? op.metadata.startTime;

const isTurnTimedOperation = (op: Operation) =>
  AI_RUNTIME_OPERATION_TYPES.includes(op.type) || op.metadata.turnStartTime !== undefined;

const getLatestAgentRuntimeTurnStartTime =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): number | undefined => {
    if (!context.agentId) return undefined;

    let latest: Operation | undefined;
    for (const op of getOperationsByContext(context)(s)) {
      if (!AI_RUNTIME_OPERATION_TYPES.includes(op.type)) continue;
      if (!latest || op.metadata.startTime > latest.metadata.startTime) latest = op;
    }

    return latest ? getOperationTurnStartTime(latest) : undefined;
  };

/**
 * Get the earliest start time for a visibly running agent runtime operation.
 */
const getVisibleAgentRuntimeStartTimeByContext =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): number | undefined => {
    if (!context.agentId) return undefined;

    const operations = getOperationsByContext(context)(s);
    let startTime: number | undefined;

    for (const op of operations) {
      if (!isTurnTimedOperation(op) || !isVisiblyRunningOperation(op)) {
        continue;
      }

      const turnStartTime = getOperationTurnStartTime(op);
      startTime = startTime === undefined ? turnStartTime : Math.min(startTime, turnStartTime);
    }

    return startTime;
  };

/**
 * Check if input should show loading state in a specific context
 * Includes sendMessage in addition to AI runtime operations,
 * so the input stays in loading state from the moment user sends until AI finishes
 */
const isInputLoadingByContext =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): boolean => {
    if (!context.agentId) return false;

    const operations = getOperationsByContext(context)(s);

    return operations.some(
      (op) =>
        INPUT_LOADING_OPERATION_TYPES.includes(op.type) &&
        op.status === 'running' &&
        !op.metadata.isAborting,
    );
  };

/**
 * Check if input should show visible loading state in a specific context.
 */
const isInputVisiblyLoadingByContext =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): boolean => {
    if (!context.agentId) return false;

    const operations = getOperationsByContext(context)(s);

    const hasVisiblyRunning = operations.some(
      (op) => INPUT_LOADING_OPERATION_TYPES.includes(op.type) && isVisiblyRunningOperation(op),
    );
    if (hasVisiblyRunning) return true;

    // A queued message is a follow-up the user already sent while a prior op was
    // running; it gets no op of its own until that op ends and the queue drains.
    // In the window where the prior op has finished its *visible* output
    // (visibleLoadingDone) but hasn't reached its terminal end yet, there is no
    // visibly-running op and no op for the queued message, so the input would
    // look idle even though a send is pending. Keep the visible loading on while
    // some INPUT_LOADING op is still running to absorb the queue. Gate on a
    // still-running op so a stale queue left by a cancelled/errored run (which
    // never drains) doesn't pin the indicator on forever.
    const hasRunning = operations.some(
      (op) => INPUT_LOADING_OPERATION_TYPES.includes(op.type) && isRunningOperation(op),
    );
    if (hasRunning) return getQueuedMessages(context)(s).length > 0;

    return isSteerHandoffPending(context)(s);
  };

// === Backward Compatibility ===

/**
 * Check if a specific agent has running AI runtime operations
 * Used for agent list item loading states where we need per-agent granularity
 */
const isAgentRunning =
  (agentId: string) =>
  (s: ChatStoreState): boolean => {
    for (const type of AI_RUNTIME_OPERATION_TYPES) {
      const operationIds = s.operationsByType[type] || [];
      const hasRunning = operationIds.some((id) => {
        const op = s.operations[id];
        return op && isRunningOperation(op) && op.context.agentId === agentId;
      });
      if (hasRunning) return true;
    }
    return false;
  };

/**
 * Check if a specific agent should still show visible runtime loading.
 */
const isAgentVisiblyRunning =
  (agentId: string) =>
  (s: ChatStoreState): boolean => {
    for (const type of AI_RUNTIME_OPERATION_TYPES) {
      const operationIds = s.operationsByType[type] || [];
      const hasRunning = operationIds.some((id) => {
        const op = s.operations[id];
        return op && isVisiblyRunningOperation(op) && op.context.agentId === agentId;
      });
      if (hasRunning) return true;
    }
    return false;
  };

/**
 * Topic ids with a visibly-running turn on this client. Set form of
 * `isTopicVisiblyRunning` for list-level consumers (byStatus grouping, project
 * group badges). Builds a new Set per call — subscribe with an equality fn or
 * use it inside a selector that already recomputes per store change.
 */
const visiblyRunningTopicIds = (s: ChatStoreState): Set<string> => {
  const ids = new Set<string>();
  for (const type of TOPIC_VISIBLY_RUNNING_OPERATION_TYPES) {
    for (const id of s.operationsByType[type] || []) {
      const op = s.operations[id];
      if (op && isVisiblyRunningOperation(op) && op.context.topicId) {
        ids.add(op.context.topicId);
      }
    }
  }
  return ids;
};

/**
 * Check if agent runtime is running (including both main window and thread)
 * Checks all AI runtime operation types (see AI_RUNTIME_OPERATION_TYPES)
 * Excludes operations that are aborting (cleaning up after cancellation)
 */
const isAgentRuntimeRunning = (s: ChatStoreState): boolean => {
  // Check all AI runtime operation types
  for (const type of AI_RUNTIME_OPERATION_TYPES) {
    const operationIds = s.operationsByType[type] || [];
    const hasRunning = operationIds.some((id) => {
      const op = s.operations[id];
      // Exclude operations that are aborting (user already cancelled, just cleaning up)
      return op && isRunningOperation(op);
    });
    if (hasRunning) return true;
  }
  return false;
};

/**
 * Check if a specific message is being processed (any operation type)
 */
const isMessageProcessing =
  (messageId: string) =>
  (s: ChatStoreState): boolean => {
    const operations = getOperationsByMessage(messageId)(s);
    return operations.some((op) => op.status === 'running');
  };

/**
 * Check if a specific message is being generated (AI generation only)
 * Checks all AI runtime operation types (see AI_RUNTIME_OPERATION_TYPES)
 */
const isMessageGenerating =
  (messageId: string) =>
  (s: ChatStoreState): boolean => {
    const operations = getOperationsByMessage(messageId)(s);
    return operations.some(
      (op) => AI_RUNTIME_OPERATION_TYPES.includes(op.type) && op.status === 'running',
    );
  };

/**
 * Check if a specific message is being created (CRUD operation only)
 * Checks message creation operations:
 * - User messages: sendMessage
 * - Assistant messages: createAssistantMessage
 */
const isMessageCreating =
  (messageId: string) =>
  (s: ChatStoreState): boolean => {
    const operations = getOperationsByMessage(messageId)(s);
    return operations.some(
      (op) =>
        (op.type === 'sendMessage' || op.type === 'createAssistantMessage') &&
        op.status === 'running',
    );
  };

/**
 * Get the deepest running operation for a message (leaf node in operation tree)
 * Operations form a tree structure via parentOperationId/childOperationIds
 * This returns the most specific (deepest) running operation for UI display
 */
const getDeepestRunningOperationByMessage =
  (messageId: string) =>
  (s: ChatStoreState): Operation | undefined => {
    const operations = getOperationsByMessage(messageId)(s);
    const runningOps = operations.filter((op) => op.status === 'running');

    if (runningOps.length === 0) return undefined;

    const runningOpIds = new Set(runningOps.map((op) => op.id));

    // A leaf running operation has no running children
    return runningOps.find((op) => {
      const childIds = op.childOperationIds || [];
      return !childIds.some((childId) => runningOpIds.has(childId));
    });
  };

/**
 * Check if a specific message is being regenerated
 */
const isMessageRegenerating =
  (messageId: string) =>
  (s: ChatStoreState): boolean => {
    const operations = getOperationsByMessage(messageId)(s);
    return operations.some((op) => op.type === 'regenerate' && op.status === 'running');
  };

/**
 * Check if a specific message is in tool calling (plugin API invocation)
 */
const isMessageInToolCalling =
  (messageId: string) =>
  (s: ChatStoreState): boolean => {
    const operations = getOperationsByMessage(messageId)(s);
    return operations.some((op) => op.type === 'toolCalling' && op.status === 'running');
  };

// ━━━ Message Queue Selectors ━━━

/**
 * Get queued messages count for a context
 */
const queuedMessageCount =
  (context: MessageMapKeyInput) =>
  (s: ChatStoreState): number =>
    // Delegate to getQueuedMessages so the count keys off the SAME full context
    // (threadId / scope / documentId / ...) the queue is stored under. A reduced
    // agentId/groupId/topicId key here would report 0 for thread / page /
    // group_agent follow-ups, so QueueTray would never mount even though the
    // input is pinned loading by a real queued message.
    getQueuedMessages(context)(s).length;

/**
 * Get all queued messages for a context
 */
const getQueuedMessages = (context: MessageMapKeyInput) => (s: ChatStoreState) => {
  if (!context.agentId) return [];
  // Build the key from the FULL context (threadId / scope / subAgentId /
  // documentId), matching both the enqueue side (`messageMapKey(operationContext)`
  // in conversationLifecycle) and getOperationsByContext. A reduced
  // agentId/groupId/topicId key collapses thread / page / group_agent
  // conversations onto the main-scope bucket, so their queued follow-ups would
  // never be found.
  return s.queuedMessages[messageMapKey(context)] ?? [];
};

const getIdleQueueHost = (context: MessageMapKeyInput) => (s: ChatStoreState) => {
  if (getQueuedMessages(context)(s).length === 0) return;

  let latest: Operation | undefined;
  for (const op of getOperationsByContext(context)(s)) {
    if (!INPUT_LOADING_OPERATION_TYPES.includes(op.type)) continue;
    if (isRunningOperation(op)) return;
    if (!AI_RUNTIME_OPERATION_TYPES.includes(op.type)) continue;
    if (!latest || op.metadata.startTime > latest.metadata.startTime) latest = op;
  }

  return latest;
};

// A successful top-level run always drains its queue into a steered send, so a
// queue sitting behind a completed run is the hand-off window, not a stale queue.
const isDrainingQueueHost = (host?: Operation): boolean =>
  host?.status === 'completed' && !host.metadata.endedWithoutCompletion;

const isQueueDrainPending = (context: MessageMapKeyInput) => (s: ChatStoreState) =>
  isDrainingQueueHost(getIdleQueueHost(context)(s));

// Send now keeps its item queued until the interrupt is confirmed; that wait is
// part of the hand-off too, but its own send must not be re-queued.
const isSteerHandoffPending = (context: MessageMapKeyInput) => (s: ChatStoreState) => {
  const host = getIdleQueueHost(context)(s);
  if (isDrainingQueueHost(host)) return true;

  return host?.status === 'cancelled' && host.metadata.cancelReason === SEND_NOW_CANCEL_REASON;
};

/**
 * Operation Selectors
 */
export const operationSelectors = {
  findRootRuntimeOperation,
  getDeepestRunningOperationByMessage,
  getVisibleAgentRuntimeStartTimeByContext,
  getOperationById,
  getLatestAgentRuntimeTurnStartTime,
  getOperationsByContext,
  getOperationsByMessage,
  getRunningQueueBlockingOperationIds,
  hasNewerConversationOperation,
  /** @deprecated Use isAgentRuntimeRunning instead */
  isAIGenerating: isAgentRuntimeRunning,

  isAgentRunning,
  isAgentVisiblyRunning,
  isAgentRuntimeRunning,
  isAgentRuntimeRunningByContext,
  isAgentRuntimeVisiblyRunningByContext,
  isInputLoadingByContext,
  isInputVisiblyLoadingByContext,
  isMessageCreating,
  isMessageGenerating,
  isMessageInToolCalling,
  isMessageProcessing,
  isMessageRegenerating,
  isQueueDrainedAtRunEnd,
  isQueueDrainPending,
  isSteerHandoffPending,
  visiblyRunningTopicIds,

  // Message Queue
  getIdleQueueHost,
  getQueuedMessages,
  queuedMessageCount,
};
