import type { UIChatMessage } from '@lobechat/types';

/**
 * Consumer-side metadata extensions for PipelineContext.metadata.
 *
 * Example:
 * declare module '@lobechat/context-engine' {
 *   interface PipelineContextMetadataOverrides {
 *     myCustomFlag?: boolean;
 *   }
 * }
 */
export interface PipelineContextMetadataOverrides {}

/**
 * Agent state - inferred from original project types
 */
interface AgentState {
  [key: string]: any;
  messages: UIChatMessage[];
  model?: string;
  provider?: string;
  systemRole?: string;
  tools?: string[];
}

export interface Message {
  [key: string]: any;
  content: string | any[];
  /**
   * Set when a role conversion folded a tool result into another role's content
   * (see GroupRoleTransformProcessor). The message is no longer `role: 'tool'`,
   * but its content is still a verbatim record of what a tool returned, so
   * processors that key off the tool role must keep treating it as one.
   */
  foldedToolResult?: { apiName?: string; identifier?: string };
  role: string;
}

/**
 * Metadata shared across pipeline processors.
 * Consumers can extend this through declaration merging on
 * `LobeChatContextEngine.PipelineContextMetadataOverrides`.
 */
interface PipelineContextMetadata extends PipelineContextMetadataOverrides {
  [key: `${string}InjectedCount`]: number | undefined;
  currentTokenCount?: number;
  maxTokens?: number;
  model?: string;
  provider?: string;
}

/**
 * Pipeline context - core data structure flowing through the pipeline
 */
export interface PipelineContext {
  /** Abort reason */
  abortReason?: string;

  /** Immutable input state */
  readonly initialState: AgentState;

  /** Allow processors to terminate pipeline early */
  isAborted: boolean;

  /** Mutable message list being built */
  messages: Message[];
  /** Metadata for communication between processors */
  metadata: PipelineContextMetadata;
}

/**
 * Context processor interface - standardized interface for processing stations in the pipeline
 */
export interface ContextProcessor {
  /** Processor name, used for debugging and logging */
  name: string;
  /** Core processing method */
  process: (context: PipelineContext) => Promise<PipelineContext>;
}

/**
 * Processor configuration options
 */
export interface ProcessorOptions {
  /** Whether to enable debug mode */
  debug?: boolean;
  /** Custom logging function */
  logger?: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

/**
 * Processor error — carries diagnostic context about which processor failed and why.
 *
 * The `cause` chain follows the ES2022 standard so that error-reporting tooling
 * (Sentry, DataDog, dashboard log viewers) can walk the full causal chain without
 * custom deserialisation.  The legacy `originalError` property is kept for
 * backwards compatibility with existing catch sites that destructure it directly.
 */
export class ProcessorError extends Error {
  /** @deprecated Prefer reading the standard `cause` property. */
  public originalError?: Error;

  constructor(
    public processorName: string,
    message: string,
    cause?: Error,
  ) {
    super(`[${processorName}] ${message}`, { cause });
    this.name = 'ProcessorError';
    this.originalError = cause;
  }

  /** Serialise the full causal chain so log aggregators can ingest it. */
  toJSON(): Record<string, unknown> {
    return {
      message: this.message,
      name: this.name,
      processorName: this.processorName,
      cause: this.cause
        ? this.cause instanceof Error && typeof (this.cause as any).toJSON === 'function'
          ? (this.cause as any).toJSON()
          : String(this.cause)
        : undefined,
    };
  }
}
