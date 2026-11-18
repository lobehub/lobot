import { type AgentItem, type AgentRankItem, type LobeAgentConfig } from '@lobot/types';
import { type PartialDeep } from 'type-fest';

import { lambdaClient } from '@/libs/trpc/client';

const AVAILABLE_AGENTS_CONTEXT_LIMIT = 10;
export const AVAILABLE_AGENTS_CONTEXT_QUERY_LIMIT = AVAILABLE_AGENTS_CONTEXT_LIMIT + 2;

export interface AvailableAgentItem {
  avatar: string | null;
  backgroundColor: string | null;
  description: string | null;
  id: string;
  /** Product-owned inbox (Lobe AI). A builtin can never join a chat group. */
  isInbox?: boolean;
  /** Personal name; resolve the label with `agentDisplayName(item, fallback)`. */
  name: string | null;
  title: string | null;
}

/**
 * Market agent model can be either a string or an object with model details
 */
type MarketAgentModel =
  | LobeAgentConfig['model']
  | {
      model: LobeAgentConfig['model'];
      parameters?: Partial<LobeAgentConfig['params']>;
      provider?: LobeAgentConfig['provider'];
    };

type AgentMetaUpdate = Partial<
  Pick<
    AgentItem,
    | 'avatar'
    | 'backgroundColor'
    | 'description'
    | 'marketIdentifier'
    | 'metadata'
    | 'name'
    | 'profile'
    | 'societyId'
    | 'tags'
    | 'title'
  >
>;

/**
 * Normalize market agent config to standard agent config.
 * Handles the case where market returns model as an object instead of string.
 */
const normalizeMarketAgentModel = (config?: PartialDeep<AgentItem>): PartialDeep<AgentItem> => {
  if (!config) return {};

  const model = config.model as MarketAgentModel | undefined;

  // If model is not an object, return config as-is
  if (typeof model !== 'object' || model === null) {
    return config;
  }

  // Extract model info and merge parameters
  const { model: modelName, provider: modelProvider, parameters } = model;
  const existingParams = (config.params ?? {}) as Record<string, any>;
  const mergedParams = { ...parameters, ...existingParams };

  return {
    ...config,
    model: modelName,
    params: Object.keys(mergedParams).length > 0 ? mergedParams : undefined,
    provider: config.provider ?? modelProvider,
  };
};

export interface CreateAgentParams {
  config?: PartialDeep<AgentItem>;
  groupId?: string;
  /**
   * `private` keeps the agent visible only to its creator within the active
   * workspace; `public` (default) makes it visible to every member. The
   * router enforces this — sidebar "Create in Private" forwards `'private'`
   * verbatim, all other creators (templates, marketplace import, etc.)
   * default to `'public'`.
   */
  visibility?: 'private' | 'public';
}

export interface CreateAgentResult {
  agentId: string;
}

interface CreateAgentOnlyParams {
  config?: PartialDeep<AgentItem>;
  groupId: string;
}

interface CreateAgentOnlyResult {
  agentId: string;
}

interface AgentGroupMembershipImpactRef {
  agentId: string;
  groupAvatar: string | null;
  groupBackgroundColor: string | null;
  /** `null` when the caller may not see the group; identity is withheld. */
  groupId: string | null;
  groupTitle: string | null;
  /** `false` when the caller may not see the group; its identity is withheld. */
  groupVisible: boolean;
}

class AgentService {
  /**
   * Get an agent by forkedFromIdentifier stored in params
   * @returns agent id if exists, null otherwise
   */
  getAgentByForkedFromIdentifier = async (
    forkedFromIdentifier: string,
    options?: { virtual?: boolean },
  ): Promise<string | null> => {
    return lambdaClient.agent.getAgentByForkedFromIdentifier.query({
      forkedFromIdentifier,
      ...options,
    });
  };

  /**
   * Create a new agent with session.
   * Automatically normalizes market agent config (handles model as object).
   */
  createAgent = async (params: CreateAgentParams): Promise<CreateAgentResult> => {
    const normalizedConfig = normalizeMarketAgentModel(params.config);

    return lambdaClient.agent.createAgent.mutate({
      config: normalizedConfig as any,
      groupId: params.groupId,
      visibility: params.visibility,
    });
  };

  /**
   * Publish a private agent to the workspace. Caller should refresh the
   * sidebar list afterwards so the agent moves from the Private bucket to
   * the shared list. The inverse (public → private) goes through
   * {@link setAgentVisibility}.
   */
  publishAgentToWorkspace = async (id: string): Promise<void> => {
    await lambdaClient.agent.publishAgentToWorkspace.mutate({ id });
  };

  /**
   * Bidirectional visibility switch. The server only allows the
   * agent's creator or a workspace owner to pull a published agent back to
   * private, and rejects builtin agents (LobeAI etc.) outright.
   */
  setAgentVisibility = async (
    id: string,
    visibility: 'private' | 'public',
    /** Going private also takes it out of group Channels shared with other people. */
    options?: { removeFromChannels?: boolean },
  ): Promise<void> => {
    await lambdaClient.agent.setAgentVisibility.mutate({ id, visibility, ...options });
  };

  /** The group Channels shared with other people that the agent leaves if made private. */
  getPrivateDemotionImpact = async (id: string): Promise<{ sharedChannelCount: number }> =>
    lambdaClient.agent.getPrivateDemotionImpact.query({ id });

  createAgentFiles = async (agentId: string, fileIds: string[], enabled?: boolean) => {
    return lambdaClient.agent.createAgentFiles.mutate({ agentId, enabled, fileIds });
  };

  getFilesAndKnowledgeBases = async (agentId: string, visibility?: 'private' | 'public') => {
    return lambdaClient.agent.getKnowledgeBasesAndFiles.query(
      visibility ? { agentId, visibility } : { agentId },
    );
  };

  getAgentConfigById = async (agentId: string) => {
    return lambdaClient.agent.getAgentConfigById.query({ agentId });
  };

  /**
   * Update agent config and return the updated agent data
   */
  updateAgentConfig = async (
    agentId: string,
    config: PartialDeep<LobeAgentConfig>,
    signal?: AbortSignal,
    replaceWorkingDirDeviceIds: string[] = [],
  ) => {
    return lambdaClient.agent.updateAgentConfig.mutate(
      {
        agentId,
        replaceWorkingDirDeviceIds,
        value: config,
      },
      { context: { showNotification: false }, signal },
    );
  };

  /**
   * Update agent meta and return the updated agent data
   */
  updateAgentMeta = async (agentId: string, meta: AgentMetaUpdate, signal?: AbortSignal) => {
    return lambdaClient.agent.updateAgentConfig.mutate({ agentId, value: meta }, { signal });
  };

  /**
   * Get a builtin agent by slug, creating it if it doesn't exist.
   * This is a generic interface for all builtin agents (page-copilot, inbox, etc.)
   */
  getBuiltinAgent = async (slug: string) => {
    return lambdaClient.agent.getBuiltinAgent.query({ slug });
  };

  /**
   * Resolve a url slug to its agent id. Returns `null` for an unknown slug and
   * for one the caller can't see — the two are deliberately indistinguishable.
   */
  resolveAgentIdBySlug = async (slug: string): Promise<string | null> => {
    const { agentId } = await lambdaClient.agent.resolveAgentIdBySlug.query({ slug });
    return agentId;
  };

  /** Rename an agent's url slug (validated server-side; see `updateAgentSlug`). */
  updateAgentSlug = async (
    agentId: string,
    slug: string,
  ): Promise<{ reason?: 'builtin' | 'invalid' | 'reserved' | 'taken'; success: boolean }> => {
    return lambdaClient.agent.updateAgentSlug.mutate({ agentId, slug });
  };

  /**
   * Remove an agent and its associated session
   */
  removeAgent = async (agentId: string) => {
    return lambdaClient.agent.removeAgent.mutate({ agentId });
  };

  /**
   * Query non-virtual agents with optional keyword filter.
   * Returns agents with minimal info (id, title, description, avatar, backgroundColor).
   */
  queryAgents = async (params?: {
    includeInbox?: boolean;
    keyword?: string;
    limit?: number;
    offset?: number;
  }): Promise<AvailableAgentItem[]> => {
    return lambdaClient.agent.queryAgents.query(params);
  };

  /**
   * Count non-virtual agents with optional keyword and date filters,
   * matching queryAgents conditions.
   */
  countAgents = async (params?: {
    endDate?: string;
    includeInbox?: boolean;
    keyword?: string;
    range?: [string, string];
    startDate?: string;
  }) => {
    return lambdaClient.agent.countAgents.query(params);
  };

  /**
   * Pin or unpin an agent
   */
  updateAgentPinned = async (agentId: string, pinned: boolean) => {
    return lambdaClient.agent.updateAgentPinned.mutate({ id: agentId, pinned });
  };

  /**
   * Duplicate an agent.
   * Returns the new agent ID.
   */
  duplicateAgent = async (
    agentId: string,
    newTitle?: string,
  ): Promise<{ agentId: string } | null> => {
    return lambdaClient.agent.duplicateAgent.mutate({ agentId, newTitle });
  };

  /**
   * Rank the user's agents by topic count (agent usage ranking).
   */
  rankAgents = async (limit?: number): Promise<AgentRankItem[]> => {
    return lambdaClient.agent.rankAgents.query(limit);
  };

  /**
   * Async history-backfill progress for a transferred agent (null when no
   * backfill is running), including the topic ids still awaiting migration.
   */
  getTransferJobStatus = async (
    agentId: string,
    topicIds: string[],
  ): Promise<{
    completedTopics: number;
    jobId: string;
    pendingTopicIds: string[];
    totalTopics: number;
    type: string;
  } | null> => {
    return lambdaClient.agent.getTransferJobStatus.query({ agentId, topicIds });
  };

  /**
   * The user opened a topic whose history is still migrating — jump it to the
   * front of the backfill queue. `pending: false` means it already migrated.
   */
  prioritizeTransferTopic = async (topicId: string): Promise<{ pending: boolean }> => {
    return lambdaClient.agent.prioritizeTransferTopic.mutate({ topicId });
  };
}

export const agentService = new AgentService();
