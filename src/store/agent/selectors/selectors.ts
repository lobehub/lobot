import { DEFAULT_BACKGROUND_COLOR, DEFAULT_INBOX_AVATAR, DEFAULT_MODEL } from '@lobechat/const';
import {
  agentDisplayName,
  getActivePluginIds,
  type LobeAgentConfig,
  type MetaData,
} from '@lobot/types';

import { filterToolIds } from '@/helpers/toolFilters';

import { type AgentStoreState } from '../initialState';
import { builtinAgentSelectors } from './builtinAgentSelectors';

// ==========   Meta   ============== //

const currentAgentData = (s: AgentStoreState) =>
  s.activeAgentId ? s.agentMap[s.activeAgentId] : undefined;

/**
 * The label to show for the active agent: personal name first, role as the
 * fallback. Use this for rendering; `currentAgentTitle` stays the raw role for
 * anything that edits or reasons about it.
 */
const currentAgentDisplayName = (s: AgentStoreState) => agentDisplayName(currentAgentData(s));

const getDefaultAvatarByAgentId = (s: AgentStoreState, agentId?: string) => {
  const inboxAgentId = builtinAgentSelectors.inboxAgentId(s);

  return agentId && inboxAgentId === agentId ? DEFAULT_INBOX_AVATAR : undefined;
};

const currentAgentAvatar = (s: AgentStoreState) =>
  currentAgentData(s)?.avatar || getDefaultAvatarByAgentId(s, s.activeAgentId);

const currentAgentBackgroundColor = (s: AgentStoreState) =>
  currentAgentData(s)?.backgroundColor || 'transparent';

const currentAgentVisibility = (s: AgentStoreState) => currentAgentData(s)?.visibility;

/**
 * Get agent meta by agent ID (for group chat)
 * Used to replace sessionMetaSelectors.getAgentMetaByAgentId
 */
const getAgentMetaById =
  (agentId: string) =>
  (s: AgentStoreState): MetaData => {
    const data = s.agentMap[agentId];
    if (!data) return {};

    return {
      avatar: data.avatar || getDefaultAvatarByAgentId(s, agentId),
      backgroundColor: data.backgroundColor || DEFAULT_BACKGROUND_COLOR,
      description: data.description || undefined,
      marketIdentifier: data.marketIdentifier || undefined,
      name: data.name || undefined,
      tags: data.tags,
      title: data.title || undefined,
    };
  };

const getAgentConfigById =
  (agentId: string) =>
  (s: AgentStoreState): LobeAgentConfig =>
    s.agentMap[agentId] as LobeAgentConfig;

export const currentAgentConfig = (s: AgentStoreState): LobeAgentConfig =>
  getAgentConfigById(s.activeAgentId || '')(s);

const currentAgentSystemRole = (s: AgentStoreState) => {
  return currentAgentConfig(s)?.systemRole;
};

const currentAgentModel = (s: AgentStoreState): string => {
  const config = currentAgentConfig(s);

  return config?.model || DEFAULT_MODEL;
};

/**
 * Pinned plugin identifiers for the current agent — disabled entries are
 * excluded. Matches the pre-tri-state semantics where array-membership meant
 * pinned; consumers that need the disabled set use `getDisabledPluginIds`
 * directly.
 */
const currentAgentPlugins = (s: AgentStoreState) => {
  const config = currentAgentConfig(s);

  return getActivePluginIds(config?.plugins);
};

/**
 * Get displayable agent plugins by filtering out platform-specific tools
 * that shouldn't be shown in the current environment
 */
const displayableAgentPlugins = (s: AgentStoreState) => {
  const plugins = currentAgentPlugins(s);
  return filterToolIds(plugins);
};

/**
 * Get agent's slug by ID (used to identify builtin agents)
 */
const getAgentSlugById = (agentId: string) => (s: AgentStoreState) => s.agentMap[agentId]?.slug;

/**
 * Whether current agent is driven by an external heterogeneous runtime
 * (e.g. Claude Code). These agents skip LobeHub's message-channel / model
 * pickers because their toolchain is owned by the external runtime.
 */
const isCurrentAgentHeterogeneous = (s: AgentStoreState): boolean =>
  !!currentAgentConfig(s)?.agencyConfig?.heterogeneousProvider;

/** The agent a user-chosen slug names, as known locally (persisted copy first). */
const getAgentIdBySlug = (slug?: string | null) => (s: AgentStoreState) =>
  slug ? s.agentSlugIdMap[slug] : undefined;

/** The server confirmed the slug's agent in this session (not only the persisted copy). */
const isAgentSlugConfirmed = (slug?: string | null) => (s: AgentStoreState) =>
  !!slug && !!s.agentSlugIdMap[slug] && s.agentSlugIdReplica.entries[slug]?.source === 'server';

export const agentSelectors = {
  currentAgentAvatar,
  currentAgentBackgroundColor,
  currentAgentConfig,
  currentAgentModel,
  currentAgentPlugins,
  currentAgentSystemRole,
  currentAgentDisplayName,
  currentAgentVisibility,
  displayableAgentPlugins,
  getAgentConfigById,
  getAgentIdBySlug,
  isAgentSlugConfirmed,
  getAgentMetaById,
  getAgentSlugById,
  isCurrentAgentHeterogeneous,
};
