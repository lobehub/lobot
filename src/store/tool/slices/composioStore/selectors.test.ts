import { describe, expect, it } from 'vitest';

import { initialState } from '../../initialState';
import { type ToolStore } from '../../store';
import { composioStoreSelectors } from './selectors';
import { ComposioServerStatus } from './types';

const makeServer = (overrides = {}) => ({
  appSlug: 'GMAIL',
  authConfigId: 'ac_test',
  connectedAccountId: 'ca_test',
  createdAt: 0,
  identifier: 'gmail',
  label: 'Gmail',
  status: ComposioServerStatus.ACTIVE,
  ...overrides,
});

describe('composioStoreSelectors', () => {
  describe('getServers', () => {
    it('returns empty array when no servers exist', () => {
      const state = { ...initialState } as ToolStore;
      expect(composioStoreSelectors.getServers(state)).toEqual([]);
    });

    it('returns all servers', () => {
      const servers = [makeServer(), makeServer({ identifier: 'slack', label: 'Slack' })];
      const state = { ...initialState, composioServers: servers } as ToolStore;
      expect(composioStoreSelectors.getServers(state)).toEqual(servers);
    });
  });
});
