import { afterEach, describe, expect, it, vi } from 'vitest';

import { globalAgentContextManager } from '@/helpers/GlobalAgentContextManager';
import { type AgentStoreState } from '@/store/agent/initialState';
import { initialAgentSliceState } from '@/store/agent/slices/agent/initialState';
import { initialBuiltinAgentSliceState } from '@/store/agent/slices/builtin/initialState';

import { agentByIdSelectors } from './agentByIdSelectors';

// getAgentWorkingDirectoryById is desktop-only; force the desktop branch on.
vi.mock('@lobechat/const', async (importOriginal) => ({
  ...(await importOriginal()),
  isDesktop: true,
}));

const createState = (overrides: Partial<AgentStoreState> = {}): AgentStoreState => ({
  ...initialAgentSliceState,
  ...initialBuiltinAgentSliceState,
  ...overrides,
});

describe('agentByIdSelectors', () => {
  describe('getAgentWorkingDirectoryById', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const stateWith = (config: Record<string, any>, localMap: Record<string, string> = {}) =>
      createState({
        agentMap: { 'agent-1': config },
        localAgentWorkingDirectoryMap: localMap,
      });

    it('reads the per-device choice for the current (local) device', () => {
      vi.spyOn(globalAgentContextManager, 'getContext').mockReturnValue({ homePath: '/home/me' });
      const state = stateWith({
        agencyConfig: { workingDirByDevice: { 'device-A': '/repos/agent-gateway' } },
      });

      expect(agentByIdSelectors.getAgentWorkingDirectoryById('agent-1', 'device-A')(state)).toBe(
        '/repos/agent-gateway',
      );
    });

    it('reads the bound device choice when the agent targets a device', () => {
      vi.spyOn(globalAgentContextManager, 'getContext').mockReturnValue({ homePath: '/home/me' });
      const state = stateWith({
        agencyConfig: {
          boundDeviceId: 'device-B',
          executionTarget: 'device',
          workingDirByDevice: { 'device-A': '/repos/local', 'device-B': '/repos/remote' },
        },
      });

      // currentDeviceId is the local machine, but executionTarget=device → device-B wins
      expect(agentByIdSelectors.getAgentWorkingDirectoryById('agent-1', 'device-A')(state)).toBe(
        '/repos/remote',
      );
    });

    it('falls back to the legacy per-agent value when no device choice exists', () => {
      vi.spyOn(globalAgentContextManager, 'getContext').mockReturnValue({ homePath: '/home/me' });
      const state = stateWith({ agencyConfig: {} }, { 'agent-1': '/repos/legacy' });

      expect(agentByIdSelectors.getAgentWorkingDirectoryById('agent-1', 'device-A')(state)).toBe(
        '/repos/legacy',
      );
    });

    it('falls back to desktop/home path when nothing is set', () => {
      vi.spyOn(globalAgentContextManager, 'getContext').mockReturnValue({
        desktopPath: '/home/me/Desktop',
        homePath: '/home/me',
      });
      const state = stateWith({ agencyConfig: {} });

      expect(agentByIdSelectors.getAgentWorkingDirectoryById('agent-1', 'device-A')(state)).toBe(
        '/home/me/Desktop',
      );
    });
  });

  describe('hasAgentConfigInScope', () => {
    it('only treats a cached config as renderable in the scope that wrote it', () => {
      const state = createState({
        agentConfigReplica: { entries: {}, scope: 'user-1:workspace-a' },
        agentMap: { 'agent-1': { title: 'From workspace A' } },
      });

      expect(agentByIdSelectors.hasAgentConfigInScope('agent-1', 'user-1:workspace-a')(state)).toBe(
        true,
      );
      // After a workspace switch the entry is still in `agentMap`, but it
      // belongs to the previous scope.
      expect(agentByIdSelectors.hasAgentConfigInScope('agent-1', 'user-1:workspace-b')(state)).toBe(
        false,
      );
      expect(agentByIdSelectors.hasAgentConfigInScope('', 'user-1:workspace-a')(state)).toBe(false);
    });
  });

  describe('isAgentNotFoundById', () => {
    it('returns true only for agents flagged in agentNotFoundMap', () => {
      const state = createState({ agentNotFoundMap: { 'agent-gone': true } });

      expect(agentByIdSelectors.isAgentNotFoundById('agent-gone')(state)).toBe(true);
      expect(agentByIdSelectors.isAgentNotFoundById('agent-1')(state)).toBe(false);
      expect(agentByIdSelectors.isAgentNotFoundById('')(state)).toBe(false);
    });
  });

  describe('isAgentConfigLoadingById', () => {
    it('reports loading while the config is absent from agentMap', () => {
      const state = createState({ agentMap: {} });

      expect(agentByIdSelectors.isAgentConfigLoadingById('agent-1')(state)).toBe(true);
    });

    it('settles once the config lands in agentMap', () => {
      const state = createState({ agentMap: { 'agent-1': { id: 'agent-1' } } });

      expect(agentByIdSelectors.isAgentConfigLoadingById('agent-1')(state)).toBe(false);
    });

    it('settles when the agent is marked not-found (no access / deleted)', () => {
      const state = createState({ agentMap: {}, agentNotFoundMap: { 'agent-gone': true } });

      expect(agentByIdSelectors.isAgentConfigLoadingById('agent-gone')(state)).toBe(false);
    });
  });
});
