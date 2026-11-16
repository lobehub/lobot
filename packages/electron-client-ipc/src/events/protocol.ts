import type { McpInstallSchema } from '../types';

/**
 * Protocol installation related Broadcast events (main process -> renderer process)
 */
export interface ProtocolBroadcastEvents {
  /**
   * MCP plugin installation request event
   * Sent to frontend after main process parses protocol URL
   */
  mcpInstallRequest: (data: {
    /** Market source ID */
    marketId?: string;
    /** Plugin ID */
    pluginId: string;
    /** MCP Schema object */
    schema: McpInstallSchema;
  }) => void;

  /**
   * A `lobot://channel/open-shared` link arrived; the renderer takes it with
   * `sharedAgentLink.takePending`, so a link that came before it listened still opens.
   */
  sharedAgentLinkReceived: () => void;
}
