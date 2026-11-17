/**
 * Highest wire protocol this bundle speaks to the Agent Gateway and to the run
 * that feeds it. Sent when a run starts (`clientProtocol`) — only when the
 * deployment's gateway serves v2, see `canUseGatewayProtocolV2` — so the run
 * may deliver message revisions (`message_patch`) instead of whole
 * `uiMessages` snapshots. A client that sends nothing is treated as protocol 1
 * and keeps the snapshots.
 *
 * Bump this only together with the client-side handling of whatever the new
 * version lets the server omit — a desktop build lags the server by weeks, and
 * this constant is exactly what tells the two apart.
 */
export const CLIENT_PROTOCOL_VERSION = 2 as const;

// ─── One-shot relay (an LLM call outside any agent run) ───

/**
 * Prefix of a one-shot relay channel id: `llmcall:<userId>:<nonce>`. The tab
 * that makes the call generates the id, subscribes to it on the gateway, and
 * hands it to the server in `LLM_RELAY_CHANNEL_HEADER`; the server opens
 * the channel and dispatches the call's `llm_execute` on it. The user id in the
 * id keeps a caller from making the server open a channel it does not own.
 */
const LLM_RELAY_CHANNEL_PREFIX = 'llmcall:';

export const isLlmRelayChannelId = (operationId: string | undefined): boolean =>
  !!operationId?.startsWith(LLM_RELAY_CHANNEL_PREFIX);
