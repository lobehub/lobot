/**
 * Pure, dependency-free quota primitives shared by the desktop sampler and the
 * server calibration/projection. No DB, no fs, no network — everything here is
 * a plain function over plain data so it is trivially unit-testable.
 */

/** Provider account identity parsed from local CLI config. */
export interface QuotaAccountIdentity {
  displayName?: string;
  email?: string;
  /** Anthropic accountUuid / Codex account_id. */
  externalAccountId?: string;
  organizationId?: string;
  /** Normalized plan, e.g. `max` / `pro`. */
  planTier?: string;
  rateLimitTier?: string;
}

/** One provider utilization reading for a single limit bucket. */
export interface QuotaLimitReading {
  /** ms epoch when this reading was captured. */
  capturedAt: number;
  isActive?: boolean;
  limitName?: string | null;
  /** Raw `limits[].kind`, e.g. `session` / `weekly_all` / `weekly_scoped`. */
  limitType: string;
  /** True if a real 429 was observed at/around this reading. */
  rateLimited?: boolean;
  /** ms epoch of the window reset, or null if the provider didn't report one. */
  resetsAt: number | null;
  /** Model display name for scoped windows; `''` otherwise. */
  scopeKey: string;
  severity?: string;
  /** Integer percent 0..100. */
  utilization: number;
  /** Provider-reported duration/name, persisted in the snapshot raw payload. */
  windowMinutes?: number;
}

/** A projected concrete window, keyed by (limitType, scopeKey, resetsAt). */
export interface QuotaWindowProjection {
  firstSeenAt: number;
  lastSeenAt: number;
  lastUtilization: number;
  limitType: string;
  peakUtilization: number;
  rateLimitedAt: number | null;
  resetsAt: number;
  scopeKey: string;
  windowSeconds: number;
  windowStartAt: number;
}

/** Window length per limit kind, in seconds. */
export const CLAUDE_SESSION_WINDOW_SECONDS = 5 * 60 * 60;
export const CLAUDE_WEEKLY_WINDOW_SECONDS = 7 * 24 * 60 * 60;

/**
 * Resolve the window length for a Claude limit kind. Anything starting with
 * `weekly` is the 7-day window; everything else is the 5-hour session window.
 */
export const windowSecondsForKind = (limitType: string): number =>
  limitType.startsWith('weekly') ? CLAUDE_WEEKLY_WINDOW_SECONDS : CLAUDE_SESSION_WINDOW_SECONDS;
