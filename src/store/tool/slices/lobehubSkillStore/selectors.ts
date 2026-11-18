import { type ToolStoreState } from '../../initialState';
import { type LobehubSkillServer } from './types';
import { LobehubSkillStatus } from './types';

/**
 * LobeHub Skill Store Selectors
 */
export const lobehubSkillStoreSelectors = {
  /**
   * Get all LobeHub Skill servers
   */
  getServers: (s: ToolStoreState): LobehubSkillServer[] => s.lobehubSkillServers || [],

  /**
   * Get metadata list for all connected LobeHub Skill servers
   * Used by toolSelectors.metaList for unified tool metadata resolution
   */
  metaList: (s: ToolStoreState) => {
    const servers = s.lobehubSkillServers || [];

    return servers
      .filter((server) => server.status === LobehubSkillStatus.CONNECTED)
      .map((server) => ({
        identifier: server.identifier,
        meta: {
          avatar: server.icon || '🔗',
          description: `LobeHub Skill: ${server.name}`,
          title: server.name,
        },
      }));
  },
};
