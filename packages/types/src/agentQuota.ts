/**
 * The Claude Code account an agent uses on one device. A login only exists on
 * the machine it was signed in on, so the Manual pick is made per device;
 * `accountId: null` means that device runs in Auto mode.
 */
export interface QuotaDeviceAccount {
  accountId: string | null;
}

/**
 * Whether an agent would find quota where it runs, as the server's
 * `agentQuota.resolveAgentAvailability` judges it: on the accounts the
 * dispatcher would route a run there to, not the whole pool.
 *
 * - `available`: at least one of those accounts has headroom;
 * - `exhausted`: every one of them is spent;
 * - `untracked`: none of the agent's accounts is routed there, so its quota
 *   is not judged.
 */
export interface QuotaAgentAvailability {
  accountIds: string[];
  mode?: 'balanced' | 'pinned';
  /** When `exhausted`: the earliest moment one account comes back (ms epoch), when known. */
  resetsAt?: number;
  status: 'available' | 'exhausted' | 'untracked';
}
