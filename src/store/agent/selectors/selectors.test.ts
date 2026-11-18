import { DEFAULT_INBOX_AVATAR, DEFAULT_MODEL, INBOX_SESSION_ID } from '@lobechat/const';
import { describe, expect, it } from 'vitest';

import { type AgentStoreState } from '@/store/agent/initialState';
import { initialAgentSliceState } from '@/store/agent/slices/agent/initialState';
import { initialBuiltinAgentSliceState } from '@/store/agent/slices/builtin';

import { agentSelectors, currentAgentConfig } from './selectors';

const createState = (overrides: Partial<AgentStoreState> = {}): AgentStoreState => ({
  ...initialAgentSliceState,
  ...initialBuiltinAgentSliceState,
  ...overrides,
});

const mixedPluginsInput = (): Partial<AgentStoreState> => ({
  activeAgentId: 'agent-1',
  agentMap: {
    'agent-1': {
      plugins: [
        'plugin-1',
        { identifier: 'plugin-2', mode: 'disabled' },
        { identifier: 'plugin-3', mode: 'pinned' },
      ],
    } as any,
  },
});

describe('agentSelectors', () => {
  describe('currentAgentConfig', () => {
    it('should return agent config from agentMap', () => {
      const state = createState({
        activeAgentId: 'agent-1',
        agentMap: {
          'agent-1': { model: 'gpt-4', systemRole: 'Test role' } as any,
        },
      });

      const config = currentAgentConfig(state);

      expect(config.model).toBe('gpt-4');
      expect(config.systemRole).toBe('Test role');
    });

    it('should return undefined when no agent config exists', () => {
      const state = createState({
        activeAgentId: 'non-existent',
        agentMap: {},
      });

      const config = currentAgentConfig(state);

      expect(config).toBeUndefined();
    });
  });

  describe('currentAgentModel', () => {
    it('should return model from current agent config', () => {
      const state = createState({
        activeAgentId: 'agent-1',
        agentMap: { 'agent-1': { model: 'gpt-4o' } },
      });

      expect(agentSelectors.currentAgentModel(state)).toBe('gpt-4o');
    });

    it('should return default model when not specified', () => {
      const state = createState({
        activeAgentId: 'agent-1',
        agentMap: { 'agent-1': {} },
      });

      expect(agentSelectors.currentAgentModel(state)).toBe(DEFAULT_MODEL);
    });
  });

  describe('getAgentMetaById', () => {
    it('should return meta for specified agent', () => {
      const state = createState({
        agentMap: {
          'agent-1': { title: 'Agent 1' },
          'agent-2': { title: 'Agent 2' },
        },
      });

      const meta = agentSelectors.getAgentMetaById('agent-2')(state);

      expect(meta.title).toBe('Agent 2');
    });

    it('should return empty object for non-existent agent', () => {
      const state = createState({
        agentMap: {},
      });

      const meta = agentSelectors.getAgentMetaById('non-existent')(state);

      expect(meta).toEqual({});
    });

    it('should return inbox avatar fallback for inbox agent with no custom avatar', () => {
      const state = createState({
        agentMap: { 'inbox-agent': {} },
        builtinAgentIdMap: { [INBOX_SESSION_ID]: 'inbox-agent' },
      });

      const meta = agentSelectors.getAgentMetaById('inbox-agent')(state);

      expect(meta.avatar).toBe(DEFAULT_INBOX_AVATAR);
    });
  });

  describe('currentAgentPlugins', () => {
    it('should return plugins array', () => {
      const state = createState({
        activeAgentId: 'agent-1',
        agentMap: { 'agent-1': { plugins: ['plugin-1', 'plugin-2'] } },
      });

      expect(agentSelectors.currentAgentPlugins(state)).toEqual(['plugin-1', 'plugin-2']);
    });

    it('should return empty array when no plugins', () => {
      const state = createState({
        activeAgentId: 'agent-1',
        agentMap: { 'agent-1': {} },
      });

      expect(agentSelectors.currentAgentPlugins(state)).toEqual([]);
    });

    it('should exclude disabled entries in a mixed-shape plugins array', () => {
      const state = createState(mixedPluginsInput());

      expect(agentSelectors.currentAgentPlugins(state)).toEqual(['plugin-1', 'plugin-3']);
    });
  });

  describe('displayableAgentPlugins', () => {
    it('should return filtered plugins', () => {
      const state = createState({
        activeAgentId: 'agent-1',
        agentMap: {
          'agent-1': {
            plugins: ['plugin-1', 'plugin-2'],
          },
        },
      });

      // The filterToolIds function will filter out platform-specific tools
      const result = agentSelectors.displayableAgentPlugins(state);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
