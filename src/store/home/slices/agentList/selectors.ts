import { type SidebarAgentItem, type SidebarGroup } from '@/database/repositories/home';
import { type HomeStore } from '@/store/home/store';

import { AGENT_LIST_KEY } from './projection';

/**
 * Get all pinned agents
 */
const pinnedAgents = (s: HomeStore): SidebarAgentItem[] => s.pinnedAgents;

/**
 * Get all agent groups (folders)
 */
const agentGroups = (s: HomeStore): SidebarGroup[] => s.agentGroups;

/**
 * Get private agent groups (folders) owned by the current user.
 * Empty array in personal mode.
 */
const privateAgentGroups = (s: HomeStore): SidebarGroup[] => s.privateAgentGroups;

/**
 * Get pinned private agents owned by the current user.
 * Empty array in personal mode.
 */
const privatePinnedAgents = (s: HomeStore): SidebarAgentItem[] => s.privatePinnedAgents;

/**
 * Get all ungrouped agents
 */
const ungroupedAgents = (s: HomeStore): SidebarAgentItem[] => s.ungroupedAgents;

/**
 * Get ungrouped private agents owned by the current user.
 * Empty array in personal mode.
 */
const privateUngroupedAgents = (s: HomeStore): SidebarAgentItem[] => s.privateUngroupedAgents;

/**
 * Whether the current user has any private content in this workspace.
 */
const hasPrivateAgents = (s: HomeStore): boolean =>
  s.privateAgentGroups.length > 0 ||
  s.privatePinnedAgents.length > 0 ||
  s.privateUngroupedAgents.length > 0;

/**
 * Check if agent list is initialized
 */
const isAgentListInit = (s: HomeStore): boolean => s.isAgentListInit;

/**
 * Get all agents (pinned + grouped + ungrouped + private)
 */
const allAgents = (s: HomeStore): SidebarAgentItem[] => {
  const groupedAgents = s.agentGroups.flatMap((g) => g.items);
  const privateGroupedAgents = s.privateAgentGroups.flatMap((g) => g.items);
  return [
    ...s.pinnedAgents,
    ...groupedAgents,
    ...s.ungroupedAgents,
    ...s.privatePinnedAgents,
    ...privateGroupedAgents,
    ...s.privateUngroupedAgents,
  ];
};

/**
 * The current user's own private agents. Empty in personal mode.
 */
const privateAgents = (s: HomeStore): SidebarAgentItem[] => [
  ...s.privatePinnedAgents,
  ...s.privateAgentGroups.flatMap((g) => g.items),
  ...s.privateUngroupedAgents,
];

/**
 * Get agent by id
 */
const getAgentById =
  (id: string) =>
  (s: HomeStore): SidebarAgentItem | undefined => {
    return allAgents(s).find((a) => a.id === id);
  };

export const homeAgentListSelectors = {
  agentGroups,
  allAgents,
  getAgentById,
  hasPrivateAgents,
  isAgentListInit,
  pinnedAgents,
  privateAgents,
  privateAgentGroups,
  privatePinnedAgents,
  privateUngroupedAgents,
  ungroupedAgents,
};
