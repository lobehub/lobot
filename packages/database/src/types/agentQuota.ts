// ─────────────────────────────────────────────────────────────────────────────
// Shared enums (stored as text columns + const maps, per repo convention)
// ─────────────────────────────────────────────────────────────────────────────

/** Which external agent tool the account/quota belongs to. */
const QuotaProvider = {
  claudeCode: 'claude-code',
  codex: 'codex',
} as const;
type QuotaProvider = (typeof QuotaProvider)[keyof typeof QuotaProvider];

/**
 * How the account's credential is held.
 * - `referenced`: we never store the token; we read the CLI's own login
 *   (Keychain / `~/.claude` / `~/.codex/auth.json`) at spawn time and never
 *   refresh it. Coexists with the user's local CLI, but cannot power cloud runs.
 * - `managed`: we store the OAuth token (encrypted) and own its refresh. Powers
 *   cloud scheduling + cross-device load balancing. MUST be a dedicated account,
 *   because refreshing here rotates the refresh-token and would log out any
 *   local CLI logged into the same account.
 */
export const QuotaCredentialMode = {
  managed: 'managed',
  referenced: 'referenced',
} as const;
export type QuotaCredentialMode = (typeof QuotaCredentialMode)[keyof typeof QuotaCredentialMode];

export const QuotaAccountStatus = {
  active: 'active',
  disabled: 'disabled',
  error: 'error',
  expired: 'expired',
  rateLimited: 'rate_limited',
} as const;
export type QuotaAccountStatus = (typeof QuotaAccountStatus)[keyof typeof QuotaAccountStatus];

/**
 * How an account participates in an agent's run.
 * - `pinned`: user manually locked this account; disables load balancing.
 * - `pool`: eligible for load-balanced selection.
 * - `disabled`: kept in the list but never selected.
 */
export const QuotaBindingRole = {
  disabled: 'disabled',
  pinned: 'pinned',
  pool: 'pool',
} as const;
export type QuotaBindingRole = (typeof QuotaBindingRole)[keyof typeof QuotaBindingRole];

/** Whether the ledger cost came from the provider or was computed by us. */
const QuotaCostSource = {
  computed: 'computed',
  providerReported: 'provider_reported',
} as const;
type QuotaCostSource = (typeof QuotaCostSource)[keyof typeof QuotaCostSource];

/** Plaintext pointer used in `referenced` mode — no secret material. */
export interface QuotaAccountCredentialRef {
  /** Custom CLI profile dir (CLAUDE_CONFIG_DIR / CODEX_HOME) if any. */
  configDir?: string;
  origin: 'keychain' | 'config-dir' | 'default-file';
}
