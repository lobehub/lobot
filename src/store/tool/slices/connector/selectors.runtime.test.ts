import { describe, expect, it } from 'vitest';

import type { ToolStore } from '@/store/tool/store';

import { connectorSelectors } from './selectors';
import type { ConnectorWithTools } from './types';

const connector = (patch: Partial<ConnectorWithTools>): ConnectorWithTools => ({
  credentials: null,
  id: 'c1',
  identifier: 'oauth-market',
  isEnabled: true,
  mcpConnectionType: 'http',
  mcpServerUrl: 'https://oauth.example/mcp',
  metadata: null,
  name: 'OAuth market',
  sourceType: 'marketplace',
  status: 'connected',
  tools: [
    {
      crudType: 'read',
      description: 'Read tasks',
      displayName: null,
      id: 't1',
      inputSchema: { type: 'object' },
      permission: 'auto',
      toolName: 'read_tasks',
      userConnectorId: 'c1',
    },
  ],
  ...patch,
});

describe('connectorSelectors.connectorByIdentifierForAgent', () => {
  const state = (connectors: ConnectorWithTools[], agentConnectors = {}) =>
    ({ agentConnectors, connectors }) as unknown as ToolStore;
  const mountedBy = (agentId: string) =>
    connector({ id: 'base', metadata: { mountedByAgentId: agentId } });

  it('does not hand one agent a base connector another agent mounted', () => {
    const s = state([mountedBy('agt_b')]);

    expect(connectorSelectors.connectorByIdentifierForAgent('oauth-market', 'agt_a')(s)).toBe(
      undefined,
    );
    // Nor a call that names no agent at all
    expect(connectorSelectors.connectorByIdentifierForAgent('oauth-market')(s)).toBe(undefined);
  });

  it('resolves a base connector that is free or mounted by this agent', () => {
    expect(
      connectorSelectors.connectorByIdentifierForAgent(
        'oauth-market',
        'agt_a',
      )(state([mountedBy('agt_a')]))?.id,
    ).toBe('base');
    expect(
      connectorSelectors.connectorByIdentifierForAgent('oauth-market')(state([connector({})]))?.id,
    ).toBe('c1');
  });
});
