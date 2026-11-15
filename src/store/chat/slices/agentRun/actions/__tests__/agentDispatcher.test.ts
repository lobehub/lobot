import { HETEROGENEOUS_PROVIDER_BINDING_PERSONAL_ONLY_ERROR } from '@lobechat/heterogeneous-agents';
import { describe, expect, it } from 'vitest';

import { selectRuntimeType } from '../dispatch/agentDispatcher';

describe('selectRuntimeType', () => {
  it('routes every run through the Gateway', () => {
    expect(selectRuntimeType({ isGatewayMode: false })).toBe('gateway');
    expect(selectRuntimeType({ isGatewayMode: true })).toBe('gateway');
  });

  it('routes local CLI agents through the Gateway so the server dispatches them to a device', () => {
    expect(
      selectRuntimeType({
        executionTarget: 'local',
        heterogeneousProvider: { type: 'claude-code' },
        isGatewayMode: false,
      }),
    ).toBe('gateway');
  });

  it('rejects a workspace agent bound to a personal API provider', () => {
    expect(() =>
      selectRuntimeType({
        heterogeneousProvider: {
          apiConfig: { providerId: 'anthropic', source: 'provider' },
          authMode: 'api',
          type: 'claude-code',
        } as any,
        isGatewayMode: true,
        isWorkspaceAgent: true,
      }),
    ).toThrow(HETEROGENEOUS_PROVIDER_BINDING_PERSONAL_ONLY_ERROR);
  });

  it('keeps the deployment-default API source for a workspace agent', () => {
    expect(
      selectRuntimeType({
        heterogeneousProvider: {
          apiConfig: { source: 'server-default' },
          authMode: 'api',
          type: 'claude-code',
        } as any,
        isGatewayMode: true,
        isWorkspaceAgent: true,
      }),
    ).toBe('gateway');
  });
});
