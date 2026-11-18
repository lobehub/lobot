import type { ToolStoreState } from '../../initialState';
import { AGENT_SKILL_LIST_KEY, type AgentSkillListItem } from './projection';

const getAgentSkills = (s: ToolStoreState): AgentSkillListItem[] =>
  s.agentSkillListMap?.[AGENT_SKILL_LIST_KEY] || [];

/**
 * Whether the installed skills list holds the server's answer. The replica also
 * hydrates from IndexedDB, and that copy can predate a skill installed on
 * another device, so a populated list alone is not proof it is current.
 */
const isAgentSkillListSynced = (s: ToolStoreState): boolean =>
  s.agentSkillListReplica?.entries[AGENT_SKILL_LIST_KEY]?.source === 'server';

const getMarketAgentSkills = (s: ToolStoreState): AgentSkillListItem[] =>
  getAgentSkills(s).filter((skill) => skill.source === 'market');

const getUserAgentSkills = (s: ToolStoreState): AgentSkillListItem[] =>
  getAgentSkills(s).filter((skill) => skill.source === 'user');

export const agentSkillsSelectors = {
  getAgentSkills,
  getMarketAgentSkills,
  getUserAgentSkills,
  isAgentSkillListSynced,
};
