import type { AcceptanceStatus } from '@lobot/types';

// ============================================
// Status rollup — the aggregate's user-facing lifecycle state, derived from the
// current (highest) round. `accepted` is terminal and user-owned: recompute
// never overwrites it. `rejected` holds until a newer round re-opens the loop.
// ============================================

/**
 * Acceptance states that retiring the task's goal node closes. A retired node's
 * outcome is discarded, so nothing it is still waiting for — a sign-off, a
 * first round, or rework after a reject — will come. A round still `verifying`
 * / `repairing` is left to land; settling then closes it (recomputeStatus).
 */
const ACCEPTANCE_STATUSES_CLOSED_BY_RETIREMENT = [
  'pending',
  'planned',
  'delivered',
  'errored',
  'rejected',
] as const satisfies readonly AcceptanceStatus[];

export const isClosedByRetirement = (status: string): boolean =>
  (ACCEPTANCE_STATUSES_CLOSED_BY_RETIREMENT as readonly string[]).includes(status);
