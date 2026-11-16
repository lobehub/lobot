/* eslint-disable perfectionist/sort-interfaces */

import type { AgentInfo } from '../../processors/GroupRoleTransform';
import type { GroupMemberInfo } from '../../providers/GroupContextInjector';

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
 * Compatible with SearchMemoryResult from @lobechat/types
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

export { type AgentBuilderContext } from '../../providers/AgentBuilderContextInjector';
