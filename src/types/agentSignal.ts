/**
 * AgentSignal source event shapes the app reports to the server. Kept from the removed
 * `agent-signal` package, which held the server's signal pipeline.
 */
/** AgentSignal source type identifiers shared by browser producers and server executors. */
export const AGENT_SIGNAL_SOURCE_TYPES = {
  agentExecutionCompleted: 'agent.execution.completed',
  agentExecutionFailed: 'agent.execution.failed',
  agentNightlyReviewRequested: 'agent.nightly_review.requested',
  agentSelfFeedbackIntentDeclared: 'agent.self_feedback_intent.declared',
  agentSelfReflectionRequested: 'agent.self_reflection.requested',
  agentUserMessage: 'agent.user.message',
  botMessageMerged: 'bot.message.merged',
  channelMessageRouted: 'channel.message.routed',
  clientGatewayError: 'client.gateway.error',
  clientGatewayRuntimeEnd: 'client.gateway.runtime_end',
  clientGatewayStepComplete: 'client.gateway.step_complete',
  clientGatewayStreamStart: 'client.gateway.stream_start',
  clientRuntimeComplete: 'client.runtime.complete',
  clientRuntimeStart: 'client.runtime.start',
  runtimeAfterStep: 'runtime.after_step',
  runtimeBeforeStep: 'runtime.before_step',
  toolOutcomeCompleted: 'tool.outcome.completed',
  toolOutcomeFailed: 'tool.outcome.failed',
} as const;

type ValueOf<TValue> = TValue[keyof TValue];

/** AgentSignal source type union derived from {@link AGENT_SIGNAL_SOURCE_TYPES}. */
export type AgentSignalSourceType = ValueOf<typeof AGENT_SIGNAL_SOURCE_TYPES>;

/** AgentSignal source payloads keyed by source type. */
export interface AgentSignalSourcePayloadMap {
  [AGENT_SIGNAL_SOURCE_TYPES.agentExecutionCompleted]: {
    agentId?: string;
    /**
     * Message the deferred skill synthesis should anchor to — the assistant turn
     * that completed this run. Lets completion-stage skill synthesis seed under
     * the assistant group instead of as a floating `parent_id=null` mainline root.
     */
    anchorMessageId?: string;
    /** Assistant message id for the completed turn; used to hydrate the trajectory. */
    assistantMessageId?: string;
    operationId: string;
    /**
     * Completion reason as classified by the producer. Non-terminal pauses
     * (`waiting_for_async_tool` / `waiting_for_human`) reuse this same source, so
     * completion-stage consumers that need a finished turn must filter on it.
     */
    reason?: string;
    /**
     * Opaque completion side-effect payload attached by the executor for
     * builtin background agents (e.g. self-iteration tool outcomes used for
     * receipt projection). Carried as-is; the producing layer owns its shape.
     */
    selfIteration?: unknown;
    serializedContext?: string;
    steps: number;
    topicId?: string;
    /** User message that initiated this turn, when known by the producer. */
    triggerMessageId?: string;
    turnCount?: number;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.agentExecutionFailed]: {
    agentId?: string;
    errorMessage?: string;
    operationId: string;
    reason?: string;
    serializedContext?: string;
    topicId?: string;
    turnCount?: number;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.agentNightlyReviewRequested]: {
    agentId: string;
    localDate: string;
    requestedAt: string;
    reviewWindowEnd: string;
    reviewWindowStart: string;
    timezone: string;
    userId: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.agentSelfFeedbackIntentDeclared]: {
    action: 'write' | 'create' | 'refine' | 'consolidate' | 'proposal';
    agentId: string;
    confidence: number;
    evidenceRefs?: Array<{ id: string; summary?: string; type: string }>;
    kind: 'memory' | 'skill' | 'gap';
    memoryId?: string;
    operationId?: string;
    reason: string;
    skillId?: string;
    summary: string;
    toolCallId?: string;
    topicId?: string;
    userId: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.agentSelfReflectionRequested]: {
    agentId: string;
    operationId?: string;
    reason: string;
    scopeId: string;
    scopeType: 'topic' | 'task' | 'operation';
    taskId?: string;
    topicId?: string;
    userId: string;
    windowEnd: string;
    windowStart: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.agentUserMessage]: {
    agentId?: string;
    /** Message the receipt or UI should attach to, usually the assistant response. */
    anchorMessageId?: string;
    documentPayload?: Record<string, unknown>;
    intents?: Array<'document' | 'memory' | 'persona' | 'prompt' | 'skill'>;
    /**
     * `true` when the producer knows the user message opens its conversation: it has no
     * parent message and no thread, so there is no earlier reply it could give feedback on.
     * `undefined` means unknown; consumers must treat it as possibly having a prior reply.
     */
    isConversationRoot?: boolean;
    memoryPayload?: Record<string, unknown>;
    message: string;
    /** Legacy source message identifier kept for compatibility. */
    messageId: string;
    serializedContext?: string;
    threadId?: string;
    topicId?: string;
    trigger?: string;
    /** Message that initiated the source or run, usually the user message. */
    triggerMessageId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.botMessageMerged]: {
    agentId?: string;
    applicationId?: string;
    message: string;
    platform?: string;
    platformThreadId?: string;
    serializedContext?: string;
    topicId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.channelMessageRouted]: {
    agentId?: string;
    channelId: string;
    memberId: string;
    message: string;
    messageId: string;
    threadId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.clientGatewayError]: {
    agentId?: string;
    /** Message the receipt or UI should attach to, usually the assistant response. */
    anchorMessageId?: string;
    /** Legacy assistant response identifier kept for compatibility. */
    assistantMessageId?: string;
    errorMessage?: string;
    operationId: string;
    serializedContext?: string;
    topicId?: string;
    /** Message that initiated the source or run, usually the user message. */
    triggerMessageId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.clientGatewayRuntimeEnd]: {
    agentId?: string;
    /** Message the receipt or UI should attach to, usually the assistant response. */
    anchorMessageId?: string;
    /** Legacy assistant response identifier kept for compatibility. */
    assistantMessageId?: string;
    operationId: string;
    serializedContext?: string;
    topicId?: string;
    /** Message that initiated the source or run, usually the user message. */
    triggerMessageId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.clientGatewayStepComplete]: {
    agentId?: string;
    /** Message the receipt or UI should attach to, usually the assistant response. */
    anchorMessageId?: string;
    /** Legacy assistant response identifier kept for compatibility. */
    assistantMessageId?: string;
    operationId: string;
    serializedContext?: string;
    stepIndex: number;
    topicId?: string;
    /** Message that initiated the source or run, usually the user message. */
    triggerMessageId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.clientGatewayStreamStart]: {
    agentId?: string;
    /** Message the receipt or UI should attach to, usually the assistant response. */
    anchorMessageId?: string;
    /** Legacy assistant response identifier kept for compatibility. */
    assistantMessageId?: string;
    operationId: string;
    serializedContext?: string;
    stepIndex: number;
    topicId?: string;
    /** Message that initiated the source or run, usually the user message. */
    triggerMessageId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.clientRuntimeComplete]: {
    agentId?: string;
    /** Message the receipt or UI should attach to, usually the assistant response. */
    anchorMessageId?: string;
    /** Legacy assistant response identifier kept for compatibility. */
    assistantMessageId?: string;
    operationId: string;
    serializedContext?: string;
    status?: 'cancelled' | 'completed' | 'failed';
    threadId?: string;
    topicId?: string;
    /** Message that initiated the source or run, usually the user message. */
    triggerMessageId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.clientRuntimeStart]: {
    agentId?: string;
    /** Message the receipt or UI should attach to, usually the assistant response. */
    anchorMessageId?: string;
    operationId: string;
    parentMessageId?: string;
    parentMessageType?: string;
    serializedContext?: string;
    threadId?: string;
    topicId?: string;
    /** Message that initiated the source or run, usually the user message. */
    triggerMessageId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.runtimeAfterStep]: {
    agentId?: string;
    operationId: string;
    serializedContext?: string;
    stepIndex: number;
    topicId?: string;
    turnCount?: number;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.runtimeBeforeStep]: {
    agentId?: string;
    operationId: string;
    serializedContext?: string;
    stepIndex: number;
    topicId?: string;
    turnCount?: number;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.toolOutcomeCompleted]: {
    agentId?: string;
    domainKey?: string;
    intentClass?: string;
    messageId?: string;
    operationId?: string;
    outcome: {
      action?: string;
      status: 'skipped' | 'succeeded';
      summary?: string;
    };
    relatedObjects?: Array<{ objectId: string; objectType: string; relation?: string }>;
    taskId?: string;
    tool: { apiName?: string; identifier: string };
    toolCallId?: string;
    topicId?: string;
  };
  [AGENT_SIGNAL_SOURCE_TYPES.toolOutcomeFailed]: {
    agentId?: string;
    domainKey?: string;
    intentClass?: string;
    messageId?: string;
    operationId?: string;
    outcome: {
      action?: string;
      errorReason?: string;
      status: 'failed';
      summary?: string;
    };
    relatedObjects?: Array<{ objectId: string; objectType: string; relation?: string }>;
    taskId?: string;
    tool: { apiName?: string; identifier: string };
    toolCallId?: string;
    topicId?: string;
  };
}

/** AgentSignal source variant with source-type-specific payload typing. */

type AgentSignalSourceEventPayload<TSourceType extends AgentSignalSourceType> =
  AgentSignalSourcePayloadMap[TSourceType];

/**
 * Caller-provided data for one AgentSignal source event.
 *
 * @param TSourceType - Source type whose payload shape should be enforced.
 */
export interface AgentSignalSourceEventInput<
  TSourceType extends AgentSignalSourceType = AgentSignalSourceType,
> {
  /** Source-type-specific payload that describes what happened. */
  payload: AgentSignalSourceEventPayload<TSourceType>;
  /** Optional explicit scope key. Defaults to a key derived from payload routing fields. */
  scopeKey?: string;
  /** Stable producer event id used for dedupe. */
  sourceId: string;
  /** Source event type identifier. */
  sourceType: TSourceType;
  /** Optional event timestamp in milliseconds. Defaults to the current time. */
  timestamp?: number;
}
