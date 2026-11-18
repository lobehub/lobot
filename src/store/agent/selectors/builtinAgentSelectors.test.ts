import { INBOX_SESSION_ID } from '@lobechat/const';
import { describe, expect, it } from 'vitest';

import { type AgentStoreState } from '@/store/agent/initialState';
import { initialAgentSliceState } from '@/store/agent/slices/agent/initialState';
import { initialBuiltinAgentSliceState } from '@/store/agent/slices/builtin';

import { builtinAgentSelectors } from './builtinAgentSelectors';

const createState = (overrides: Partial<AgentStoreState> = {}): AgentStoreState => ({
  ...initialAgentSliceState,
  ...initialBuiltinAgentSliceState,
  ...overrides,
});

describe('builtinAgentSelectors', () => {
  describe('getBuiltinAgentId', () => {
    it('should return agent id for a given slug', () => {
      const state = createState({
        builtinAgentIdMap: { 'page-agent': 'page-agent-123' },
      });

      expect(builtinAgentSelectors.getBuiltinAgentId('page-agent')(state)).toBe('page-agent-123');
    });

    it('should return undefined for non-existent slug', () => {
      const state = createState({
        builtinAgentIdMap: {},
      });

      expect(builtinAgentSelectors.getBuiltinAgentId('page-agent')(state)).toBeUndefined();
    });
  });

  describe('inboxAgentId', () => {
    it('should return inbox agent id from builtinAgentIdMap', () => {
      const state = createState({
        builtinAgentIdMap: { [INBOX_SESSION_ID]: 'inbox-agent-123' },
      });

      expect(builtinAgentSelectors.inboxAgentId(state)).toBe('inbox-agent-123');
    });

    it('should return undefined when inbox agent is not initialized', () => {
      const state = createState({
        builtinAgentIdMap: {},
      });

      expect(builtinAgentSelectors.inboxAgentId(state)).toBeUndefined();
    });
  });

  describe('isInboxAgent', () => {
    it('should return true when activeAgentId matches inbox agent in builtinAgentIdMap', () => {
      const state = createState({
        activeAgentId: 'inbox-agent',
        builtinAgentIdMap: { [INBOX_SESSION_ID]: 'inbox-agent' },
      });

      expect(builtinAgentSelectors.isInboxAgent(state)).toBe(true);
    });

    it('should return false when activeAgentId does not match inbox agent', () => {
      const state = createState({
        activeAgentId: 'other-agent',
        builtinAgentIdMap: { [INBOX_SESSION_ID]: 'inbox-agent' },
      });

      expect(builtinAgentSelectors.isInboxAgent(state)).toBe(false);
    });

    it('should return false when inbox agent is not initialized', () => {
      const state = createState({
        activeAgentId: 'some-agent',
        builtinAgentIdMap: {},
      });

      expect(builtinAgentSelectors.isInboxAgent(state)).toBe(false);
    });
  });
});
