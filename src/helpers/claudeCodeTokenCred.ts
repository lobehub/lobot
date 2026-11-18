/**
 * Fixed vault key of the Claude Code OAuth token. The cloud sandbox injects the
 * credential stored under this key; it never reads an agent-level reference.
 */
export const CLAUDE_CODE_TOKEN_CRED_KEY = 'CLAUDE_CODE_OAUTH_TOKEN';

/** A credential as `market.creds.listForContext` returns it. */
export interface ContextCredSummary {
  key: string;
  name: string;
  ownerDisplayName?: string;
  ownerType?: 'organization' | 'user';
}
