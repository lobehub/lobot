/**
 * Public constants shared between the producer-side MCP server (Node-only)
 * and the consumer-side adapter / renderer (browser-safe). Kept in a
 * dependency-free module so importers don't accidentally pull node:http
 * etc. into the renderer bundle.
 */

/** MCP server name as it appears in the tool name prefix. */
export const ASK_USER_MCP_SERVER_NAME = 'lobe_cc';

/** MCP tool name (without the `mcp__lobe_cc__` prefix). */
export const ASK_USER_TOOL_NAME = 'ask_user_question';

/**
 * How long the server holds a pending ask-user question before it times out
 * into a `cancelled` answer. This is the **authoritative** clock — the client
 * countdown (`@lobechat/shared-tool-ui/ask-user` `draft.ts`
 * `DEFAULT_COUNTDOWN_MS`) mirrors this value and must be kept in sync (that
 * package has no dep on this one, so it can't import the const directly).
 */
export const DEFAULT_ASK_USER_TIMEOUT_MS = 10 * 60 * 1000;
