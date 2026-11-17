/* eslint-disable perfectionist/sort-interfaces */
/**
 * Context types the agent state carries: tool and skill sets, and the per-run context the host's
 * prompt builder renders. Moved here from the removed `@lobechat/context-engine` package.
 */
import type {
  BotPlatformInfo,
  DiscordChannelInfo,
  DiscordGuildInfo,
  DiscordThreadInfo,
  GroupContextMemberInfo,
  SkillSource,
} from '@lobechat/prompts';
import type { ExtendedHumanInterventionConfig } from '@lobot/types';

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

/**
 * Lightweight skill metadata for context injection
 * Compatible with the SkillMeta that will be added in @lobot/types (Phase 3.2)
 */
export interface SkillMeta {
  /**
   * When true, the skill's content is directly injected into the system prompt
   * instead of only appearing in the <available_skills> list.
   */
  activated?: boolean;
  /**
   * Full skill content to inject when activated.
   * Only used when `activated` is true.
   */
  content?: string;
  description: string;
  identifier: string;
  location?: string;
  name: string;
  /**
   * Skill origin. `project` skills are discovered on the device filesystem and
   * loaded on demand via the readFile tool (see `location`).
   */
  source?: SkillSource;
}

/**
 * Operation-level skill set: determined at createOperation time, immutable during execution.
 * Analogous to OperationToolSet for tools.
 */
export interface OperationSkillSet {
  /** Plugin IDs enabled on this agent — skills matching these IDs are auto-activated */
  enabledPluginIds: string[];
  /** All available skills after enableChecker filtering */
  skills: SkillMeta[];
}

/**
 * Record of a skill activated at step level (e.g., via activateSkill tool call).
 */
export interface ActivatedStepSkill {
  activatedAtStep: number;
  content?: string;
  identifier: string;
}

/**
 * User memory item interfaces
 * Uses index signature to allow additional properties from database models
 * Note: Properties can be null (from database) or undefined
 */
interface UserMemoryContextItem {
  description?: string | null;
  id?: string;
  title?: string | null;
  [key: string]: unknown;
}

interface UserMemoryExperienceItem {
  id?: string;
  keyLearning?: string | null;
  situation?: string | null;
  [key: string]: unknown;
}

interface UserMemoryPreferenceItem {
  conclusionDirectives?: string | null;
  id?: string;
  [key: string]: unknown;
}

interface UserMemoryActivityItem {
  endsAt?: string | Date | null;
  id?: string;
  startsAt?: string | Date | null;
  status?: string | null;
  timezone?: string | null;
  type?: string | null;
  [key: string]: unknown;
}

interface UserMemoryIdentityItem {
  capturedAt?: string | Date | null;
  description?: string | null;
  id?: string;
  role?: string | null;
  /** Identity type: personal (role), professional (occupation), demographic (attribute) */
  type?: 'demographic' | 'personal' | 'professional' | string | null;
  [key: string]: unknown;
}

interface UserMemoryPersonaItem {
  narrative?: string | null;
  tagline?: string | null;
  [key: string]: unknown;
}

/**
 * User memory data structure
 * Compatible with SearchMemoryResult from @lobot/types
 */
interface UserMemoryData {
  activities?: UserMemoryActivityItem[];
  contexts: UserMemoryContextItem[];
  experiences: UserMemoryExperienceItem[];
  identities?: UserMemoryIdentityItem[];
  persona?: UserMemoryPersonaItem;
  preferences: UserMemoryPreferenceItem[];
}

/**
 * User memory configuration
 */
export interface UserMemoryConfig {
  /** Whether user memory is enabled */
  enabled?: boolean;
  /** When the memories were fetched */
  fetchedAt?: number;
  /** User memories data */
  memories?: UserMemoryData;
}

/**
 * Agent group configuration
 * Used to inject sender identity into assistant messages in multi-agent scenarios
 */
export interface AgentGroupConfig {
  /** Mapping from agentId to agent info (name, role) */
  agentMap?: Record<string, AgentInfo>;

  // ========== Group context injection (for current agent's identity) ==========
  /** Current agent's ID (the one who will respond) */
  currentAgentId?: string;
  /** Current agent's name */
  currentAgentName?: string;
  /** Current agent's role */
  currentAgentRole?: 'supervisor' | 'participant';
  /** Group title/name */
  groupTitle?: string;
  /** List of group members for context injection */
  members?: GroupMemberInfo[];
  /** Custom system prompt/role description for the group */
  systemPrompt?: string;
}

/**
 * Agent info for message sender identification
 */
export interface AgentInfo {
  name: string;
  role: 'supervisor' | 'participant';
}

type GroupMemberInfo = GroupContextMemberInfo;

export interface BotPlatformContext {
  /** Whether the platform can read chat history at runtime (`readMessages`). */
  canReadHistory?: boolean;
  /** Identifiers of the conversation this run replies in (`lobe-message` args). */
  currentChannel?: BotPlatformInfo['currentChannel'];
  /** The bot woke on its own because a message falls within its duties (see `formatBotPlatformContext`). */
  duty?: BotPlatformInfo['duty'];
  /** The bot woke in its follow-up window (see `formatBotPlatformContext`). */
  followup?: BotPlatformInfo['followup'];
  /** The bot woke only because its name is in the text (see `formatBotPlatformContext`). */
  named?: boolean;
  /** Acknowledgement already posted before the run (see `formatBotPlatformContext`). */
  openingReply?: BotPlatformInfo['openingReply'];
  platformName: string;
  /** Pre-injected recent same-channel history for platforms without history-read. */
  recentChannelHistory?: BotPlatformInfo['recentChannelHistory'];
  /** Emoji the owner lets the bot use (see `formatBotPlatformContext`). */
  replyEmojis?: BotPlatformInfo['replyEmojis'];
  /** How the bot talks in this conversation (see `formatBotPlatformContext`). */
  replyStyle?: BotPlatformInfo['replyStyle'];
  /** The agent may step back from the conversation (see `formatBotPlatformContext`). */
  standDown?: boolean;
  supportsMarkdown: boolean;
  /** `followup` tells the agent it may stay silent (see `formatBotPlatformContext`). */
  wakeKind?: BotPlatformInfo['wakeKind'];
  warnings?: string[];
}

export interface DiscordContext {
  channel?: DiscordChannelInfo;
  guild?: DiscordGuildInfo;
  thread?: DiscordThreadInfo;
}

export interface EvalContext {
  envPrompt?: string;
  /**
   * The attempt's clock (ISO date or instant). Every "today" the model sees
   * renders from it, so the prompt reads like a real session on that day.
   */
  sessionDate?: string;
  /** IANA timezone the clock renders in; UTC when absent. */
  timezone?: string;
}

export interface ProjectInstructionFile {
  content: string;
  /** Where the file came from, e.g. `AGENTS.md` — surfaced to the model. */
  source: string;
}
