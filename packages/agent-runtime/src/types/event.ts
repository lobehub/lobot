import type { ChatToolPayload } from '@lobechat/types';

import type { AgentState, ToolsCalling } from './state';

interface AgentEventInit {
  type: 'init';
}

interface AgentEventLlmStart {
  payload: unknown;
  type: 'llm_start';
}

interface AgentEventLlmStream {
  chunk: unknown;
  type: 'llm_stream';
}

interface AgentEventLlmResult {
  result: unknown;
  type: 'llm_result';
}

interface AgentEventStreamRetry {
  data: {
    attempt: number;
    delayMs: number;
    errorType?: string;
    kind?: string;
    maxAttempts: number;
  };
  type: 'stream_retry';
}

interface AgentEventToolPending {
  toolCalls: ToolsCalling[];
  type: 'tool_pending';
}

interface AgentEventToolResult {
  id: string;
  result: any;
  type: 'tool_result';
}

interface AgentEventHumanApproveRequired {
  operationId: string;
  pendingToolsCalling: ChatToolPayload[];
  type: 'human_approve_required';
}

interface AgentEventHumanPromptRequired {
  metadata?: Record<string, unknown>;
  operationId: string;
  prompt: string;
  type: 'human_prompt_required';
}

interface AgentEventHumanSelectRequired {
  metadata?: Record<string, unknown>;
  multi?: boolean;
  operationId: string;
  options: { label: string; value: string }[];
  prompt?: string;
  type: 'human_select_required';
}

/**
 * Standardized finish reasons
 */
export type FinishReason =
  | 'completed' // Normal completion
  | 'user_requested' // User requested to end
  | 'user_aborted' // User abort
  | 'max_steps_exceeded' // Reached maximum steps limit
  | 'max_steps_completed' // Completed after reaching max steps (forceFinish)
  | 'cost_limit_exceeded' // Reached cost limit
  | 'timeout' // Execution timeout
  | 'agent_decision' // Agent decided to finish
  | 'queued_message_interrupt' // Soft interrupt: user queued a message during execution
  | 'error_recovery' // Finished due to unrecoverable error
  | 'system_shutdown'; // System is shutting down

interface AgentEventDone {
  finalState: AgentState;
  reason: FinishReason;
  reasonDetail?: string;
  type: 'done';
}

interface AgentEventError {
  error: any;
  type: 'error';
}

interface AgentEventInterrupted {
  canResume: boolean;
  interruptedAt: string;
  interruptedInstruction?: any;
  metadata?: Record<string, unknown>;
  reason: string;
  type: 'interrupted';
}

interface AgentEventResumed {
  metadata?: Record<string, unknown>;
  reason: string;
  resumedAt: string;
  resumedFromStep: number;
  type: 'resumed';
}

interface AgentEventCompressionComplete {
  groupId: string;
  parentMessageId?: string;
  type: 'compression_complete';
}

interface AgentEventCompressionError {
  error: unknown;
  type: 'compression_error';
}

/**
 * Events emitted by the AgentRuntime during execution
 */
export type AgentEvent =
  // Initialization
  | AgentEventInit
  // LLM streaming output
  | AgentEventLlmStart
  | AgentEventLlmStream
  | AgentEventLlmResult
  | AgentEventStreamRetry
  // Tool invocation
  | AgentEventToolPending
  | AgentEventToolResult
  // Normal completion
  | AgentEventDone
  // Error thrown
  | AgentEventError
  // Human-in-the-loop (HIL)
  | AgentEventHumanApproveRequired
  | AgentEventHumanPromptRequired
  | AgentEventHumanSelectRequired
  // Interruption and resumption
  | AgentEventInterrupted
  | AgentEventResumed
  // Context compression
  | AgentEventCompressionComplete
  | AgentEventCompressionError;
