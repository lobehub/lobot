interface McpAppToolState {
  /**
   * The desktop whose local MCP process (stdio, localhost / LAN) produced the
   * result. Its view and the view's calls run in that process, so only that
   * desktop can serve them.
   */
  deviceId?: string;
  resourceUri: string;
  /**
   * The MCP server that produced the result (`getMcpServerFingerprint`). The
   * view is only read from that server: the identifier may resolve to another
   * one now, which must not get this result's arguments and data.
   */
  server?: string;
}

const isUiUri = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('ui://');

/**
 * The raw MCP tool result state. Server AgentRuntime calls persist the whole
 * processed result (`{ content, state, success }`) as the plugin state, so the
 * MCP result (with `mcpApp`) sits one level deeper there than on client calls.
 *
 * Only that host envelope is unwrapped, recognized by its text `content` and
 * boolean `success`. A client call's state is the server's own result, whose
 * `content` is an array, and the SDK keeps any extra field it returns: a
 * `state` it nests there is the server's, not ours, and is never unwrapped.
 */
export const unwrapMcpToolState = <T = any>(state: T): T => {
  const envelope = state as
    { content?: unknown; state?: { content?: unknown }; success?: unknown } | undefined;
  const inner = envelope?.state;
  const isHostEnvelope =
    typeof envelope?.content === 'string' && typeof envelope?.success === 'boolean';

  return isHostEnvelope && inner && typeof inner === 'object' && Array.isArray(inner.content)
    ? (inner as T)
    : state;
};

/** Read the MCP App reference a tool call stored on its result state. */
export const getMcpAppFromState = (state: unknown): McpAppToolState | undefined => {
  const mcpApp = (
    unwrapMcpToolState(state) as
      { mcpApp?: { deviceId?: unknown; resourceUri?: unknown; server?: unknown } } | undefined
  )?.mcpApp;
  if (!isUiUri(mcpApp?.resourceUri)) return;

  return {
    ...(typeof mcpApp.deviceId === 'string' && { deviceId: mcpApp.deviceId }),
    resourceUri: mcpApp.resourceUri,
    ...(typeof mcpApp.server === 'string' && { server: mcpApp.server }),
  };
};
