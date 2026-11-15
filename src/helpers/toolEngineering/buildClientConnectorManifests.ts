import { isSyncedMcpToolVisibleTo } from '@lobechat/const/mcpApp';
import { type ToolManifest } from '@lobechat/types';

import type { ConnectorWithTools } from '@/store/tool/slices/connector/types';

/**
 * What the model reads for a tool the user switched off: it stays listed so
 * the model can explain why it cannot act, but it must not be called.
 */
const disabledToolDescription = (toolName: string): string =>
  `[TOOL DISABLED] The user has disabled this tool and it cannot be executed. ` +
  `Do NOT call this tool. If the user asks to perform this action, inform them ` +
  `that they have manually disabled "${toolName}" and can re-enable it in Settings > Connectors.`;

/**
 * A connector's tools as one MCP manifest: every synced tool the model may see
 * is listed (disabled ones with the blocking description), permissions become
 * `humanIntervention`. Returns nothing for a disabled connector or one with no
 * tools for the model.
 */
const buildConnectorManifest = (connector: ConnectorWithTools): ToolManifest | undefined => {
  if (!connector.isEnabled) return undefined;

  const modelTools = (connector.tools ?? []).filter((tool) =>
    isSyncedMcpToolVisibleTo(tool, 'model'),
  );
  if (modelTools.length === 0) return undefined;

  const api = modelTools.map((tool) => {
    const parameters = (tool.inputSchema ?? { properties: {}, type: 'object' }) as Record<
      string,
      unknown
    >;
    if (tool.permission === 'disabled') {
      return {
        description: disabledToolDescription(tool.toolName),
        humanIntervention: 'required' as const,
        name: tool.toolName,
        parameters,
      };
    }
    return {
      description: tool.description ?? '',
      humanIntervention: tool.permission === 'needs_approval' ? ('required' as const) : undefined,
      name: tool.toolName,
      parameters,
    };
  });

  return {
    api,
    identifier: connector.identifier,
    meta: {
      avatar: 'MCP_AVATAR',
      description: `${connector.name} connector with ${api.length} tools`,
      title: connector.name,
    },
    type: 'mcp',
  } as ToolManifest;
};

/**
 * Convert connector store rows into ToolManifest entries. The manifest carries
 * no `mcpParams`/auth — connector tool calls are executed server-side via
 * `connector.callTool`, which decrypts the stored credentials.
 */
export const buildClientConnectorManifests = (connectors: ConnectorWithTools[]): ToolManifest[] =>
  connectors.map(buildConnectorManifest).filter((manifest): manifest is ToolManifest => !!manifest);
