import { describe, expect, it } from 'vitest';

import { initialState } from '../../initialState';
import { type ToolStore } from '../../store';
import { lobehubSkillStoreSelectors } from './selectors';
import { type LobehubSkillServer } from './types';
import { LobehubSkillStatus } from './types';

const createConnectedLinearServer = (): LobehubSkillServer => ({
  identifier: 'linear',
  name: 'Linear',
  isConnected: true,
  status: LobehubSkillStatus.CONNECTED,
});

const createDisconnectedGitHubServer = (): LobehubSkillServer => ({
  identifier: 'github',
  name: 'GitHub',
  isConnected: false,
  status: LobehubSkillStatus.NOT_CONNECTED,
});

describe('lobehubSkillStoreSelectors', () => {
  describe('getServers', () => {
    it('should return empty array when no servers exist', () => {
      const state = { ...initialState } as ToolStore;
      const result = lobehubSkillStoreSelectors.getServers(state);
      expect(result).toEqual([]);
    });

    it('should return all servers', () => {
      const servers: LobehubSkillServer[] = [
        createConnectedLinearServer(),
        createDisconnectedGitHubServer(),
      ];
      const state = { ...initialState, lobehubSkillServers: servers } as ToolStore;
      const result = lobehubSkillStoreSelectors.getServers(state);
      expect(result).toEqual(servers);
    });
  });

  describe('metaList', () => {
    it('should return metadata for connected servers', () => {
      const servers: LobehubSkillServer[] = [
        {
          identifier: 'linear',
          name: 'Linear',
          icon: 'linear-icon',
          isConnected: true,
          status: LobehubSkillStatus.CONNECTED,
        },
        {
          identifier: 'github',
          name: 'GitHub',
          icon: 'github-icon',
          isConnected: false,
          status: LobehubSkillStatus.NOT_CONNECTED,
        },
      ];
      const state = { ...initialState, lobehubSkillServers: servers } as ToolStore;
      const result = lobehubSkillStoreSelectors.metaList(state);

      expect(result).toHaveLength(1);
      expect(result[0].identifier).toBe('linear');
      expect(result[0].meta.title).toBe('Linear');
      expect(result[0].meta.avatar).toBe('linear-icon');
      expect(result[0].meta.description).toBe('LobeHub Skill: Linear');
    });

    it('should return empty array when no connected servers', () => {
      const servers: LobehubSkillServer[] = [
        {
          identifier: 'linear',
          name: 'Linear',
          isConnected: false,
          status: LobehubSkillStatus.NOT_CONNECTED,
        },
      ];
      const state = { ...initialState, lobehubSkillServers: servers } as ToolStore;
      const result = lobehubSkillStoreSelectors.metaList(state);
      expect(result).toEqual([]);
    });

    it('should return empty array when no servers exist', () => {
      const state = { ...initialState } as ToolStore;
      const result = lobehubSkillStoreSelectors.metaList(state);
      expect(result).toEqual([]);
    });

    it('should use default avatar when icon is not provided', () => {
      const servers: LobehubSkillServer[] = [createConnectedLinearServer()];
      const state = { ...initialState, lobehubSkillServers: servers } as ToolStore;
      const result = lobehubSkillStoreSelectors.metaList(state);

      expect(result[0].meta.avatar).toBe('🔗');
    });

    it('should return metadata for multiple connected servers', () => {
      const servers: LobehubSkillServer[] = [
        {
          identifier: 'linear',
          name: 'Linear',
          icon: 'linear-icon',
          isConnected: true,
          status: LobehubSkillStatus.CONNECTED,
        },
        {
          identifier: 'github',
          name: 'GitHub',
          icon: 'github-icon',
          isConnected: true,
          status: LobehubSkillStatus.CONNECTED,
        },
        {
          identifier: 'slack',
          name: 'Slack',
          icon: 'slack-icon',
          isConnected: true,
          status: LobehubSkillStatus.CONNECTED,
        },
      ];
      const state = { ...initialState, lobehubSkillServers: servers } as ToolStore;
      const result = lobehubSkillStoreSelectors.metaList(state);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.identifier)).toEqual(['linear', 'github', 'slack']);
    });
  });
});
