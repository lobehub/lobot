import type { AgentStreamClientFeature } from '@lobechat/agent-gateway-client';
import { CLIENT_PROTOCOL_VERSION } from '@lobechat/agent-gateway-client';
import type {
  ComposerUserMessage,
  ContextSelection,
  ExecAgentAppContext,
  ExecAgentClientIds,
  ExecAgentResult,
  PageSelection,
  RuntimeMentionedAgent,
  ScheduleAgentRunParams,
  ScheduleAgentRunResult,
  UserInterventionConfig,
} from '@lobot/types';

import { canUseGatewayProtocolV2 } from '@/helpers/gatewayProtocol';
import { lambdaClient } from '@/libs/trpc/client';

/** Gateway stream features every run started from this client handles. */
const STREAM_FEATURES: AgentStreamClientFeature[] = ['file_works', 'member_runtime_end'];

/**
 * Resume instruction for an operation that hit `human_approve_required`. When
 * present, the new op acts as the "continue" step: server reads the target tool
 * message, writes the user's decision, and either re-dispatches the tool
 * (approved) or feeds the rejection back to the LLM as user feedback
 * (rejected / rejected_continue).
 *
 * Kept as a top-level field (not folded into `appContext`) so the server schema
 * can validate it independently.
 */
export interface ResumeApprovalParam {
  decision: 'approved' | 'rejected' | 'rejected_continue';
  /** ID of the pending `role='tool'` message this decision targets. */
  parentMessageId: string;
  /** Optional user-supplied rejection reason (only meaningful for rejected variants). */
  rejectionReason?: string;
  /** tool_call_id of the pending tool call being approved/rejected. */
  toolCallId: string;
}

/**
 * Resume instruction for an operation that paused on a `humanIntervention:
 * 'always'` tool (e.g. lobe-agent `askUserQuestion`) during a GATEWAY/server
 * run. When present, the new op writes the human-provided answer as the pending
 * tool message's result and resumes from `phase: 'tool_result'` — the tool is
 * NOT re-executed, so the server runtime never overwrites the answer with a
 * fresh "pending" placeholder.
 *
 * Kept as a top-level field (not folded into `appContext`) so the server schema
 * can validate it independently.
 */
export interface ResumeToolResultParam {
  /** The human-provided tool result (the answer text). */
  content: string;
  /** Distinguishes a submitted form from an explicit skip. */
  outcome?: 'skipped' | 'submitted';
  /** ID of the pending `role='tool'` message this result targets. */
  parentMessageId: string;
  /** Optional plugin state to persist on the tool message. */
  pluginState?: Record<string, unknown>;
  /** Optional user-supplied reason for a skipped interaction. */
  rejectionReason?: string;
  /** tool_call_id of the pending tool call being answered. */
  toolCallId: string;
}

/** Must not exceed the server's `ExecAgentSchema.clientOperations` bound. */
export const MAX_CLIENT_OPERATION_SNAPSHOT = 10;

export interface ClientOperationSnapshot {
  isAborting?: boolean;
  operationId: string;
  status: string;
  visibleLoadingDone?: boolean;
}

interface ExecAgentTaskParams {
  agentId?: string;
  appContext?: ExecAgentAppContext;
  autoStart?: boolean;
  /**
   * Client-minted ids for the rows this run creates, honoured verbatim by the
   * server — the gateway counterpart of `sendMessageInServer`'s
   * `newTopic.id` / `newUserMessage.id` / `newAssistantMessage.id`. Fresh
   * sends only; resume / regeneration must not replay them.
   */
  clientIds?: ExecAgentClientIds;
  /**
   * Server runs the composer tracked on this conversation at send time. The
   * server records them only when this send has to stop a run the client left
   * live, to tell whether the client never saw it or its stop never landed.
   */
  clientOperations?: ClientOperationSnapshot[];
  /** @deprecated Mirror of `userMessage.metadata.contextSelections` for servers that predate it. */
  contextSelections?: ContextSelection[];
  deviceId?: string;
  existingMessageIds?: string[];
  /** File IDs of already-uploaded attachments to attach to the new user message */
  fileIds?: string[];
  localDeviceId?: string;
  /**
   * Agents the user @-mentioned in this message (multi-mention). The server
   * enables the callAgent tool and injects the mentioned-agents delegation
   * context so the supervisor run delegates to them instead of answering itself.
   */
  mentionedAgents?: RuntimeMentionedAgent[];
  /** @deprecated Mirror of `userMessage.metadata.pageSelections` for servers that predate it. */
  pageSelections?: PageSelection[];
  /** Parent message ID for regeneration/continue (skip user message creation, branch from this message) */
  parentMessageId?: string;
  prompt: string;
  /** Existing gateway operation this fresh turn atomically supersedes. */
  replacesOperationId?: string;
  /** Resume a previous op paused on `human_approve_required` instead of starting from a fresh user prompt. */
  resumeApproval?: ResumeApprovalParam;
  /**
   * Batch form of `resumeApproval` — one entry per pending tool resolved in a
   * single "approve all" action. The server applies every decision, runs all
   * approved tools as ONE `call_tools_batch`, and continues the LLM once.
   */
  resumeApprovals?: ResumeApprovalParam[];
  /** Resume a previous op paused on a human-intervention tool by carrying the human answer as the tool result. */
  resumeToolResult?: ResumeToolResultParam;
  /** Skill identifiers the user selected in this message; the server injects their bodies. */
  selectedSkillIds?: string[];
  /** Tool identifiers the user @-mentioned in this message; the server enables them for this run. */
  selectedToolIds?: string[];
  slug?: string;
  /** The prompt was queued behind a running turn and renders as its continuation. */
  steer?: boolean;
  /**
   * Override what initiated this operation. Server defaults to `'chat'` when
   * omitted. Pass a more specific value (`'cli'`, `'openapi'`, …) so the
   * `agent_operations.trigger` column reflects the real source.
   */
  trigger?: string;
  userInterventionConfig?: UserInterventionConfig;
  /** The composer-authored part of the new user message; see `ExecAgentParams.userMessage`. */
  userMessage?: ComposerUserMessage;
}

/**
 * A composer send queued behind the running turn on the server: the
 * fresh-send part of {@link ExecAgentTaskParams}.
 */
export type QueuedFollowUpRequest = Omit<
  ExecAgentTaskParams,
  | 'autoStart'
  | 'clientIds'
  | 'clientOperations'
  | 'existingMessageIds'
  | 'parentMessageId'
  | 'replacesOperationId'
  | 'resumeApproval'
  | 'resumeApprovals'
  | 'resumeToolResult'
  | 'steer'
>;

/** One follow-up of `agentSteerQueue.list`, as the server projects it for its sender. */
export interface QueuedFollowUpListItem {
  createdAt: number;
  /** Taken by a run but not confirmed yet; a failed delivery returns it to the queue. */
  delivering: boolean;
  editorData?: Record<string, unknown>;
  fileIds?: QueuedFollowUpRequest['fileIds'];
  filesPreview?: Record<string, unknown>[];
  id: string;
  mentionedAgents?: QueuedFollowUpRequest['mentionedAgents'];
  prompt: QueuedFollowUpRequest['prompt'];
  selectedSkillIds?: QueuedFollowUpRequest['selectedSkillIds'];
  selectedToolIds?: QueuedFollowUpRequest['selectedToolIds'];
}

interface QueuedFollowUpSurface {
  threadId?: string | null;
  topicId: string;
}

/**
 * Parameters for execSubAgentTask
 * Supports both Group mode (with groupId) and Single Agent mode (without groupId)
 */
interface ExecSubAgentTaskParams {
  agentId: string;
  /** Optional for Single Agent mode, required for Group mode */
  groupId?: string;
  instruction: string;
  parentMessageId: string;
  /** Parent operation ID for dispatching callAgent hooks */
  parentOperationId?: string;
  timeout?: number;
  /** Task title (shown in UI, used as thread title) */
  title?: string;
  topicId: string;
}

interface GetSubAgentTaskStatusParams {
  threadId: string;
}

interface InterruptTaskParams {
  operationId?: string;
  threadId?: string;
  topicId?: string;
}

class AiAgentService {
  async getServerDefaultHeterogeneousCapability() {
    return await lambdaClient.aiAgent.getServerDefaultHeterogeneousCapability.query();
  }

  /**
   * Execute a single Agent task.
   * Returns the operationId needed to connect to the Agent Gateway.
   */
  async execAgentTask(
    params: ExecAgentTaskParams,
    options?: { signal?: AbortSignal },
  ): Promise<ExecAgentResult> {
    // Ask for protocol-v2 delivery — message revisions instead of whole message
    // snapshots — when this client both understands it and is inside the
    // rollout. Anything else stays on the pushed snapshots, which is what an
    // older bundle needs to render the run at all. A caller may still pin it
    // (a replay harness asserting v1 delivery).
    const clientProtocol = canUseGatewayProtocolV2() ? CLIENT_PROTOCOL_VERSION : undefined;
    // Inside the `agent_llm_relay` rollout this tab offers to run the LLM calls
    // of providers only this device can reach (a local Ollama, a private
    // endpoint); the server hands them over as `llm_execute`.
    return await lambdaClient.aiAgent.execAgent.mutate(
      {
        clientProtocol,
        ...params,
        streamFeatures: STREAM_FEATURES,
      },
      options,
    );
  }

  /**
   * Queue a follow-up behind the surface's running turn on the server. It
   * carries the same run declarations as {@link execAgentTask}, so the run can
   * tell whether the follow-up can join it. `queued: false` means nothing was
   * stored and this client must send it itself.
   */
  async appendQueuedFollowUp(params: {
    /** Composer state to keep with it, so a reloaded page can show and resend it as typed. */
    composer?: { editorData?: Record<string, any>; filesPreview?: Record<string, any>[] };
    id: string;
    request: QueuedFollowUpRequest;
  }) {
    const clientProtocol = canUseGatewayProtocolV2() ? CLIENT_PROTOCOL_VERSION : undefined;
    return await lambdaClient.agentSteerQueue.append.mutate({
      ...(params.composer && { composer: params.composer }),
      id: params.id,
      request: {
        clientProtocol,
        ...params.request,
        streamFeatures: STREAM_FEATURES,
      },
    });
  }

  /** This user's follow-ups still waiting on the server, oldest first. */
  async listQueuedFollowUps(surface: QueuedFollowUpSurface): Promise<QueuedFollowUpListItem[]> {
    return await lambdaClient.agentSteerQueue.list.query(surface);
  }

  /** `removed: false` means the follow-up already left the queue to be delivered. */
  async removeQueuedFollowUp(params: QueuedFollowUpSurface & { id: string }) {
    return await lambdaClient.agentSteerQueue.remove.mutate(params);
  }

  /**
   * Defer an agent run to a future time. Creates an empty `scheduled` topic that
   * the backend cron fires once `runAt` passes; nothing runs now.
   */
  async scheduleAgentRun(params: ScheduleAgentRunParams): Promise<ScheduleAgentRunResult> {
    return await lambdaClient.aiAgent.scheduleAgentRun.mutate(params);
  }

  /**
   * Execute a sub-agent task (supports both Group and Single Agent mode)
   *
   * - Group mode: pass groupId, Thread will be associated with the Group
   * - Single Agent mode: omit groupId, Thread will only be associated with the Agent
   */
  /**
   * Get a fresh JWT token for Gateway WebSocket reconnection.
   */
  async refreshGatewayToken(topicId: string): Promise<{ token: string }> {
    return await lambdaClient.aiAgent.refreshGatewayToken.query({ topicId });
  }

  /**
   * Mint the per-user JWT for the multiplexed Gateway WebSocket (v2, one
   * socket per user). Not bound to any operation — the mux client calls this
   * before every connect attempt.
   */
  async issueGatewayUserToken(): Promise<{ token: string }> {
    return await lambdaClient.aiAgent.issueGatewayUserToken.query();
  }

  async execSubAgentTask(params: ExecSubAgentTaskParams) {
    return await lambdaClient.aiAgent.execSubAgentTask.mutate(params);
  }

  /**
   * Get SubAgent task status by threadId
   * Works for both Group and Single Agent mode tasks
   */
  async getSubAgentTaskStatus(params: GetSubAgentTaskStatusParams) {
    return await lambdaClient.aiAgent.getSubAgentTaskStatus.query(params);
  }

  /**
   * Interrupt a running task
   */
  async interruptTask(params: InterruptTaskParams) {
    return await lambdaClient.aiAgent.interruptTask.mutate(params);
  }

  /**
   * Tell a running server operation whether user messages are queued behind it,
   * so it hands the turn back at its next step boundary.
   */
  async setQueuedMessages(params: { operationId: string; pending: boolean }) {
    return await lambdaClient.aiAgent.setQueuedMessages.mutate(params);
  }
}

export const aiAgentService = new AiAgentService();
