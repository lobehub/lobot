import { DEFAULT_AGENT_CHAT_CONFIG } from '@lobechat/const';
import { describe, expect, it } from 'vitest';

import { type AgentStoreState } from '@/store/agent/initialState';
import { initialAgentSliceState } from '@/store/agent/slices/agent/initialState';
import { initialBuiltinAgentSliceState } from '@/store/agent/slices/builtin/initialState';

import { chatConfigByIdSelectors } from './chatConfigByIdSelectors';

// Mock model runtime functions
// isDesktop defaults to false in test environment (no __ELECTRON__)

const createState = (overrides: Partial<AgentStoreState> = {}): AgentStoreState => ({
  ...initialAgentSliceState,
  ...initialBuiltinAgentSliceState,
  ...overrides,
});

describe('chatConfigByIdSelectors', () => {
  describe('getChatConfigById', () => {
    it('should return chatConfig for specified agent', () => {
      const state = createState({
        agentMap: {
          'agent-1': { chatConfig: { historyCount: 10 } },
          'agent-2': { chatConfig: { historyCount: 20 } },
        },
      });

      expect(chatConfigByIdSelectors.getChatConfigById('agent-1')(state)).toMatchObject({
        historyCount: 10,
      });
      expect(chatConfigByIdSelectors.getChatConfigById('agent-2')(state)).toMatchObject({
        historyCount: 20,
      });
    });

    it('should return empty chatConfig when agent has no chatConfig', () => {
      const state = createState({
        agentMap: { 'agent-1': {} },
      });

      // Returns empty object when no chatConfig exists
      // Individual selectors (like getHistoryCountById) apply defaults via ?? operator
      expect(chatConfigByIdSelectors.getChatConfigById('agent-1')(state)).toEqual({});
    });

    it('should return empty chatConfig for non-existent agent', () => {
      const state = createState({
        agentMap: {},
      });

      // Returns empty object for non-existent agent
      // Individual selectors (like getHistoryCountById) apply defaults via ?? operator
      expect(chatConfigByIdSelectors.getChatConfigById('non-existent')(state)).toEqual({});
    });

    it('should return stored chat config without model-specific overrides', () => {
      const state = createState({
        agentMap: {
          'agent-1': {
            chatConfig: { enableAgentMode: true, historyCount: 10 },
            model: 'claude-opus-4-8',
            provider: 'lobehub',
          },
        },
      });

      expect(chatConfigByIdSelectors.getChatConfigById('agent-1')(state)).toMatchObject({
        enableAgentMode: true,
        historyCount: 10,
      });
    });
  });

  describe('getEnableHistoryCountById', () => {
    it('should return enableHistoryCount value even when context caching is enabled', () => {
      const state = createState({
        agentMap: {
          'agent-1': {
            chatConfig: { disableContextCaching: false, enableHistoryCount: true },
            model: 'claude-3-5-sonnet',
          },
        },
      });

      expect(chatConfigByIdSelectors.getEnableHistoryCountById('agent-1')(state)).toBe(true);
    });

    it('should return enableHistoryCount value even when search is enabled', () => {
      const state = createState({
        agentMap: {
          'agent-1': {
            chatConfig: {
              disableContextCaching: true,
              enableHistoryCount: true,
              searchMode: 'auto',
            },
            model: 'claude-3-7-sonnet',
          } as any,
        },
      });

      expect(chatConfigByIdSelectors.getEnableHistoryCountById('agent-1')(state)).toBe(true);
    });

    it('should return enableHistoryCount value directly from config', () => {
      const state = createState({
        agentMap: {
          'agent-1': {
            chatConfig: {
              disableContextCaching: true,
              enableHistoryCount: true,
              searchMode: 'off',
            },
            model: 'gpt-4',
          },
        },
      });

      expect(chatConfigByIdSelectors.getEnableHistoryCountById('agent-1')(state)).toBe(true);
    });

    it('should work with different agents independently', () => {
      const state = createState({
        agentMap: {
          'agent-1': {
            chatConfig: { disableContextCaching: true, enableHistoryCount: true },
            model: 'gpt-4',
          },
          'agent-2': {
            chatConfig: { disableContextCaching: false, enableHistoryCount: false },
            model: 'claude-3-5-sonnet',
          },
        },
      });

      expect(chatConfigByIdSelectors.getEnableHistoryCountById('agent-1')(state)).toBe(true);
      expect(chatConfigByIdSelectors.getEnableHistoryCountById('agent-2')(state)).toBe(false);
    });
  });

  describe('getHistoryCountById', () => {
    it('should return historyCount for specified agent', () => {
      const state = createState({
        agentMap: {
          'agent-1': { chatConfig: { historyCount: 5 } },
          'agent-2': { chatConfig: { historyCount: 10 } },
        },
      });

      expect(chatConfigByIdSelectors.getHistoryCountById('agent-1')(state)).toBe(5);
      expect(chatConfigByIdSelectors.getHistoryCountById('agent-2')(state)).toBe(10);
    });

    it('should return 0 when historyCount is 0', () => {
      const state = createState({
        agentMap: {
          'agent-1': { chatConfig: { historyCount: 0 } },
        },
      });

      expect(chatConfigByIdSelectors.getHistoryCountById('agent-1')(state)).toBe(0);
    });

    it('should return default when not specified', () => {
      const state = createState({
        agentMap: { 'agent-1': {} },
      });

      expect(chatConfigByIdSelectors.getHistoryCountById('agent-1')(state)).toBe(
        DEFAULT_AGENT_CHAT_CONFIG.historyCount,
      );
    });

    it('should return default for non-existent agent', () => {
      const state = createState({
        agentMap: {},
      });

      expect(chatConfigByIdSelectors.getHistoryCountById('non-existent')(state)).toBe(
        DEFAULT_AGENT_CHAT_CONFIG.historyCount,
      );
    });
  });

  // In test environment, isDesktop is false (no __ELECTRON__), so the
  // unified executionTarget resolves with web semantics.
  describe('getRuntimeModeById (web platform)', () => {
    it('should derive cloud from executionTarget=sandbox', () => {
      const state = createState({
        agentMap: {
          'agent-1': { agencyConfig: { executionTarget: 'sandbox' } },
        },
      });

      expect(chatConfigByIdSelectors.getRuntimeModeById('agent-1')(state)).toBe('cloud');
    });

    it('should default to "none" on web when not set', () => {
      const state = createState({
        agentMap: { 'agent-1': {} },
      });

      expect(chatConfigByIdSelectors.getRuntimeModeById('agent-1')(state)).toBe('none');
    });

    it('should default to "none" for non-existent agent', () => {
      const state = createState({ agentMap: {} });

      expect(chatConfigByIdSelectors.getRuntimeModeById('non-existent')(state)).toBe('none');
    });

    it('should coerce executionTarget=local to cloud on web (no local filesystem)', () => {
      const state = createState({
        agentMap: {
          'agent-1': { agencyConfig: { executionTarget: 'local' } },
        },
      });

      expect(chatConfigByIdSelectors.getRuntimeModeById('agent-1')(state)).toBe('cloud');
    });

    it('should gate device target to "none" (device tools are routed separately)', () => {
      const state = createState({
        agentMap: {
          'agent-1': { agencyConfig: { boundDeviceId: 'device-a', executionTarget: 'device' } },
        },
      });

      expect(chatConfigByIdSelectors.getRuntimeModeById('agent-1')(state)).toBe('none');
    });

    it('should work with different agents independently', () => {
      const state = createState({
        agentMap: {
          'agent-1': { agencyConfig: { executionTarget: 'sandbox' } },
          'agent-2': { agencyConfig: { executionTarget: 'none' } },
          'agent-3': { chatConfig: {} },
        },
      });

      expect(chatConfigByIdSelectors.getRuntimeModeById('agent-1')(state)).toBe('cloud');
      expect(chatConfigByIdSelectors.getRuntimeModeById('agent-2')(state)).toBe('none');
      expect(chatConfigByIdSelectors.getRuntimeModeById('agent-3')(state)).toBe('none');
    });
  });

  describe('isLocalSystemEnabledById', () => {
    it('should return false on web even with executionTarget=local (coerced to sandbox)', () => {
      const state = createState({
        agentMap: {
          'agent-1': { agencyConfig: { executionTarget: 'local' } },
        },
      });

      expect(chatConfigByIdSelectors.isLocalSystemEnabledById('agent-1')(state)).toBe(false);
    });

    it('should return false when not set (web defaults to none)', () => {
      const state = createState({
        agentMap: { 'agent-1': {} },
      });

      expect(chatConfigByIdSelectors.isLocalSystemEnabledById('agent-1')(state)).toBe(false);
    });
  });
});
