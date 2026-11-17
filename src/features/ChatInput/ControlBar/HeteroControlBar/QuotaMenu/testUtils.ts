import type * as ElectronClientIpcModule from '@lobechat/electron-client-ipc';
import type { KimiCodeQuotaSnapshot } from '@lobechat/heterogeneous-agents/quota';
import { act } from '@testing-library/react';
import { vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import { useAgentQuotaStore } from '@/store/agentQuota';
import { initialState } from '@/store/agentQuota/initialState';

/**
 * Start a case like a first launch: its own identity partition and an empty
 * in-memory replica, so no panel snapshot leaks between cases.
 */
export const isolateQuotaReplica = () => {
  const scope = `quota-menu-${Math.random().toString(36).slice(2)}:personal`;
  vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
  vi.spyOn(cacheScope, 'use').mockImplementation(() => scope);
  act(() => useAgentQuotaStore.setState(initialState, false));
};

export const codexSnapshot = (
  overrides: Partial<ElectronClientIpcModule.CodexQuotaSnapshot> = {},
): ElectronClientIpcModule.CodexQuotaSnapshot => ({
  error: null,
  provider: 'codex',
  rateLimitResetCredits: null,
  session: null,
  status: 'ok',
  updatedAt: Date.now(),
  weekly: null,
  ...overrides,
});

export const kimiCodeSnapshot = (
  overrides: Partial<KimiCodeQuotaSnapshot> = {},
): KimiCodeQuotaSnapshot => ({
  error: null,
  extraUsage: null,
  monthly: null,
  monthlyCode: null,
  provider: 'kimi-code',
  session: null,
  status: 'ok',
  updatedAt: Date.now(),
  weekly: null,
  ...overrides,
});

export const claudeSnapshot = (
  overrides: Partial<ElectronClientIpcModule.ClaudeCodeQuotaSnapshot> = {},
): ElectronClientIpcModule.ClaudeCodeQuotaSnapshot => ({
  error: null,
  provider: 'claude-code',
  scopedWeekly: null,
  session: null,
  status: 'ok',
  updatedAt: Date.now(),
  weekly: null,
  ...overrides,
});
