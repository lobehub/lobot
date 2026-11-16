/** Shared scope metadata for one AgentSignal chain. */
export interface AgentSignalScope {
  agentId?: string;
  botScopeKey?: string;
  taskId?: string;
  topicId?: string;
  userId: string;
  /**
   * Workspace identifier when the chain runs inside a team workspace. Omitted
   * for personal-mode chains. Action handlers that write workspace-scoped
   * tables (messages, memories) must honor this when present.
   */
  workspaceId?: string;
}

/** Causal chain metadata for source, signal, and action nodes. */
interface AgentSignalChainRef {
  chainId?: string;
  parentActionId?: string;
  parentNodeId?: string;
  parentSignalId?: string;
  rootSourceId: string;
}

/** Base source node for the AgentSignal semantic core. */
interface AgentSignalSource {
  chain: AgentSignalChainRef;
  payload: Record<string, unknown>;
  scope?: AgentSignalScope;
  scopeKey: string;
  sourceId: string;
  sourceType: string;
  timestamp: number;
}

/**
 * Backward-compatible source alias used by the current AgentSignal facade.
 */
export interface BaseSource extends AgentSignalSource {}
