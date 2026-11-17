import type { ExtendedHumanInterventionConfig } from '@/types/index';

interface LobeChatPluginApi {
  /**
   * Default execution timeout in milliseconds for this API.
   * Falls back to the global default (120_000 ms) when omitted.
   * The resolver reads this when the LLM does not supply `arguments.timeout`.
   */
  defaultTimeoutMs?: number;
  description: string;
  /**
   * Human intervention configuration
   * Controls when and how the tool requires human approval/selection
   *
   * Can be either:
   * - Simple: A policy string ('never', 'always', 'first')
   * - Complex: Array of rules for parameter-level control
   *
   * Examples:
   * - 'always' - always require intervention
   * - [{ match: { command: "git add:*" }, policy: "never" }, { policy: "always" }]
   */
  humanIntervention?: ExtendedHumanInterventionConfig;
  name: string;
  parameters: Record<string, any>;
  url?: string;
}

interface LobeToolManifest {
  api: LobeChatPluginApi[];
  identifier: string;
  meta: any;
  systemRole?: string;
  type?: 'default' | 'standalone' | 'markdown' | 'mcp' | 'builtin';
}

interface UniformFunctions {
  /**
   * The description of what the function does.
   * @type {string}
   * @memberof UniformFunctions
   */
  description?: string;
  /**
   * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.
   * @type {string}
   * @memberof UniformFunctions
   */
  name: string;
  /**
   * The parameters the functions accepts, described as a JSON Schema object. See the [guide](/docs/guides/gpt/function-calling) for examples, and the [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for documentation about the format.
   * @type {{ [key: string]: any }}
   * @memberof UniformFunctions
   */
  parameters?: {
    [key: string]: any;
  };
}

interface UniformTool {
  function: UniformFunctions;

  /**
   * The type of the tool. Currently, only `function` is supported.
   */
  type: 'function';
}

// ---- Tool Lifecycle Types ----

export type ToolSource = 'builtin' | 'client' | 'mcp' | 'composio' | 'lobehubSkill';

/**
 * Where the tool is executed for a given invocation.
 * Orthogonal to ToolSource (origin): executor describes dispatch target.
 */
export type ToolExecutor = 'client' | 'server';

/**
 * How a tool was activated at step level
 */
type ActivationSource = 'active_tools' | 'mention' | 'device' | 'discovery';

/**
 * Operation-level tool set: determined at createOperation time, immutable during execution.
 */
export interface OperationToolSet {
  /** Tool IDs that may be restored from historical explicit activations for this run. */
  activatableToolIds?: string[];
  enabledToolIds: string[];
  executorMap?: Record<string, ToolExecutor>;
  manifestMap: Record<string, LobeToolManifest>;
  sourceMap: Record<string, ToolSource>;
  tools: UniformTool[];
}

/**
 * Record of a tool activated at step level.
 */
export interface ActivatedStepTool {
  activatedAtStep: number;
  id: string;
  manifest?: LobeToolManifest;
  source: ActivationSource;
}

/**
 * Final resolved tool set ready for LLM call.
 */
export interface ResolvedToolSet {
  enabledToolIds: string[];
  executorMap?: Record<string, ToolExecutor>;
  manifestMap: Record<string, LobeToolManifest>;
  promptManifestMap: Record<string, LobeToolManifest>;
  sourceMap: Record<string, ToolSource>;
  tools: UniformTool[];
}
