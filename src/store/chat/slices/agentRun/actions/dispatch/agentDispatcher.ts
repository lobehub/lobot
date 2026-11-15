import { HETEROGENEOUS_PROVIDER_BINDING_PERSONAL_ONLY_ERROR } from '@lobechat/heterogeneous-agents';
import { type DeviceExecutionTarget, type HeterogeneousProviderConfig } from '@lobechat/types';

/**
 * Which agent runtime should handle an operation.
 *
 * The desktop never runs an agent loop itself: every run goes through the
 * Gateway, and a run that targets this machine is dispatched back to it as a
 * device by the server.
 */
export type AgentRuntimeType = 'gateway';

/**
 * Unified intent for a non-hetero, non-group sub-agent invocation.
 *
 * All three caller patterns (`callSubAgent` / `callAgent` / `@agent`) map
 * their parameters into this shape before handing off to
 * `dispatchNonHeteroSubAgent`. Runtime routing is entirely the dispatcher's
 * responsibility — callers only declare *what* they want, not *how* to run it.
 *
 * Excluded from this contract:
 * - Hetero agents (handled by the heterogeneous pipeline)
 * - Group orchestration (handled by `groupOrchestration.triggerSpeak`)
 * - Async task mode (handled by the `execSubAgent` executor via state.type)
 */
export interface AgentInvocationIntent {
  /**
   * Instruction delivered to the sub-agent.
   * In client mode it is injected as a virtual user message prepended to the
   * existing message history. In gateway mode it becomes the `message` param
   * of `executeGatewayAgent` (i.e. a real user message on the server).
   */
  instruction: string;
  /**
   * Which invocation pattern produced this intent.
   * Preserved for logging / debugging; has no effect on runtime selection.
   */
  kind: 'callAgent' | 'callSubAgent' | 'mention';
  /**
   * ID of the tool result message that triggered this invocation.
   * Used as `parentMessageId` by the client executor.
   */
  parentMessageId: string;
  /** Target agent to execute. */
  targetAgentId: string;
}

export interface RuntimeSelectionContext {
  /** Device bound by the execution switcher. Used when desktop `local` syncs to web. */
  boundDeviceId?: string;
  /**
   * Per-agent execution device choice from the composer's Execution Device
   * switcher. Only meaningful when `heterogeneousProvider` is a local CLI
   * (claude-code / codex). Controls the desktop fork:
   *   - `'device'` / `'sandbox'` → route through Gateway so the server can
   *     dispatch to an `lh connect` device or spawn a sandbox.
   *   - `'local'` / `undefined`  → keep today's default (desktop → `hetero`
   *     in-process spawn, web → `gateway` sandbox unless a desktop-local
   *     boundDeviceId is available, in which case the server dispatches to it.
   */
  executionTarget?: DeviceExecutionTarget;
  /** Per-agent heterogeneous provider config (desktop only — takes priority over gateway). */
  heterogeneousProvider?: HeterogeneousProviderConfig;
  /** Result of `chatStore.isGatewayModeEnabled()`. */
  isGatewayMode: boolean;
  /**
   * The agent is workspace-scoped (`agent.workspaceId` set), regardless of
   * authorship or per-member overrides. Unlike `workspaceScoped`, this stays
   * true for the agent's author and for members with an explicit local
   * override — the cases that CAN spawn a workspace agent in-process.
   */
  isWorkspaceAgent?: boolean;
  /**
   * Explicit override that wins over automatic selection.
   *
   * Used by sub-agent dispatches (`directMentionRoute`, `callAgent`) so child
   * operations inherit the parent operation's runtime instead of re-running
   * the global decision — a sub-agent spawned inside a Gateway run should
   * stay on Gateway, even if its own agent config would say otherwise.
   */
  parentRuntime?: AgentRuntimeType;
  /**
   * The shared-row safety coercion still applies: a member without an explicit
   * `executionTarget` override never executes the shared config on their own
   * client (see `resolveWorkspaceScoped` / `resolveExecutionTarget`). False
   * for the author or an explicitly overriding member even when
   * `isWorkspaceAgent` is true.
   */
  workspaceScoped?: boolean;
}

/**
 * Centralized "which runtime should run this agent operation" decision.
 *
 * Every entry point (sendMessage, regenerate, resume, continue, sub-agent
 * dispatch, …) asks the same question. A heterogeneous provider bound to an
 * API key must still run where its credentials live, so that combination is
 * rejected up front instead of being sent to the server.
 */
export const selectRuntimeType = (ctx: RuntimeSelectionContext): AgentRuntimeType => {
  if (
    ctx.heterogeneousProvider?.authMode === 'api' &&
    ctx.heterogeneousProvider.apiConfig &&
    ctx.heterogeneousProvider.apiConfig.source !== 'server-default' &&
    ctx.isWorkspaceAgent
  ) {
    throw new Error(HETEROGENEOUS_PROVIDER_BINDING_PERSONAL_ONLY_ERROR);
  }

  return 'gateway';
};
