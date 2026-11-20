/**
 * The part of LobeHub Cloud's `subscription.getSubscription` answer the usage displays read. Cloud
 * reports every limit as the share left, never as an amount, so these carry no caps.
 */
export type QuotaRule = 'plan.5h' | 'plan.7d' | 'plan.month' | 'plan.ultra_7d' | (string & {});

export interface QuotaWindowUsage {
  /** Whole-number share left, 0–100. */
  percentLeft: number;
  /** `null` while a rolling window has not opened yet (no request since the last one ended). */
  resetAt: Date | string | null;
  rule: QuotaRule;
}

export interface ShareQuotaUsage {
  percentLeft: number;
  resetAt: Date | string | null;
}

export interface OverflowUsage {
  enabled: boolean;
  /** Monthly USD cap; `null` is uncapped. */
  limit: number | null;
  resetAt: Date | string | null;
  /** USD spent this month. */
  spend: number;
}

export interface PersonalSubscription {
  /** Epoch ms of the current billing period's end. */
  billingCycleEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
  /** The effective plan: free, basic, plus, pro, max, or a legacy plan. */
  plan: string;
  usage: {
    /** Basic: the monthly allowance for Agent task fees. */
    agentRunQuota?: ShareQuotaUsage;
    /** Free: the monthly limit. */
    freeQuota?: ShareQuotaUsage;
    /** Plus / Pro / Max: the capped windows and the overflow to credits. */
    quota?: { overflow: OverflowUsage; windows: QuotaWindowUsage[] };
  };
}
