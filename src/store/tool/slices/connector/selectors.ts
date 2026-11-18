import type { ToolStore } from '../../store';
import type { ConnectorWithTools } from './types';

// By-id lookups span both pools: base connectors (`s.connectors`) and the
// agent-bound aggregate (`s.agentBoundConnectors`). The unified settings page
// reuses ConnectorDetail (keyed by connector id) for agent connectors, so the
// detail panel must resolve either kind. Ids are UUIDs — no collision.
const allById =
  (id: string) =>
  (s: ToolStore): ConnectorWithTools | undefined =>
    (s.connectors ?? []).find((c) => c.id === id) ??
    (s.agentBoundConnectors ?? []).find((c) => c.id === id);

const connectorById =
  (id: string) =>
  (s: ToolStore): ConnectorWithTools | undefined =>
    allById(id)(s);

const connectorByIdentifier =
  (identifier: string) =>
  (s: ToolStore): ConnectorWithTools | undefined =>
    (s.connectors ?? []).find((c) => c.identifier === identifier);

/** User-added custom connectors (sourceType 'custom'), e.g. OAuth MCP servers. */
const customConnectors = (s: ToolStore): ConnectorWithTools[] =>
  (s.connectors ?? []).filter((c) => c.sourceType === 'custom');

/**
 * The connector a conversation of `agentId` resolves `identifier` to, mirroring
 * the server's agent-aware resolution: the agent's own row first (agent-owned
 * over mounted), else the base connector. Agent tools are only known once that
 * agent's list has loaded.
 */
/** Mounted (locked) to an agent other than `agentId`; without one, to any agent. */
const isMountedByAnotherAgent = (connector: ConnectorWithTools, agentId?: string) => {
  const mountedBy = connector.metadata?.mountedByAgentId;

  return typeof mountedBy === 'string' && mountedBy !== '' && mountedBy !== agentId;
};

const connectorByIdentifierForAgent =
  (identifier: string, agentId?: string) =>
  (s: ToolStore): ConnectorWithTools | undefined => {
    const agentRows = agentId
      ? (s.agentConnectors?.[agentId] ?? []).filter((c) => c.identifier === identifier)
      : [];

    return (
      agentRows.find((c) => c.agentId === agentId) ??
      agentRows[0] ??
      // A base connector another agent mounted serves only that agent, as the
      // server's scope rule has it (`ConnectorModel.scopePredicate`)
      (s.connectors ?? []).find(
        (c) => c.identifier === identifier && !isMountedByAnotherAgent(c, agentId),
      )
    );
  };

export const connectorSelectors = {
  connectorById,
  connectorByIdentifier,
  connectorByIdentifierForAgent,
  customConnectors,
};
