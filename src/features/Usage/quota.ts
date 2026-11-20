import type { PersonalSubscription, QuotaRule } from './types';

export interface UsageWindow {
  /** `subscription` namespace key of the row's name. */
  labelKey: UsageLabelKey;
  percentUsed: number;
  resetAt: Date | null;
  rule: string;
}

type UsageLabelKey =
  | 'usage.window.rule.plan5h'
  | 'usage.window.rule.plan7d'
  | 'usage.window.rule.planMonth'
  | 'usage.window.rule.planUltraWeek'
  | 'usageBilling.window.agentRun';

/** Shortest first, as the web usage page lists them. */
const WINDOW_LABEL_KEYS: Partial<Record<QuotaRule, UsageLabelKey>> = {
  'plan.5h': 'usage.window.rule.plan5h',
  'plan.7d': 'usage.window.rule.plan7d',
  'plan.ultra_7d': 'usage.window.rule.planUltraWeek',
  'plan.month': 'usage.window.rule.planMonth',
};
const WINDOW_ORDER = Object.keys(WINDOW_LABEL_KEYS);

/** Plans with nothing above them, which offer no upgrade. */
const TOP_PLANS = new Set(['max']);

const toDate = (value: Date | number | string | null | undefined): Date | null => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const usedOf = (percentLeft: number) => Math.min(100, Math.max(0, Math.round(100 - percentLeft)));

/**
 * Every limit the plan meters, each as the share used: Basic's Agent task allowance, Free's
 * monthly limit, and the capped windows of a rolling plan (Plus / Pro / Max). A legacy plan
 * meters none.
 */
export const usageWindows = (subscription: PersonalSubscription): UsageWindow[] => {
  const { agentRunQuota, freeQuota, quota } = subscription.usage ?? {};
  const rows: UsageWindow[] = [];

  if (agentRunQuota)
    rows.push({
      labelKey: 'usageBilling.window.agentRun',
      percentUsed: usedOf(agentRunQuota.percentLeft),
      resetAt: toDate(agentRunQuota.resetAt),
      rule: 'agentRun',
    });
  if (freeQuota)
    rows.push({
      labelKey: 'usage.window.rule.planMonth',
      percentUsed: usedOf(freeQuota.percentLeft),
      resetAt: toDate(freeQuota.resetAt),
      rule: 'free',
    });

  const windows = (quota?.windows ?? [])
    .filter((window) => WINDOW_LABEL_KEYS[window.rule])
    .sort((a, b) => WINDOW_ORDER.indexOf(a.rule) - WINDOW_ORDER.indexOf(b.rule));
  for (const window of windows)
    rows.push({
      labelKey: WINDOW_LABEL_KEYS[window.rule]!,
      percentUsed: usedOf(window.percentLeft),
      resetAt: toDate(window.resetAt),
      rule: window.rule,
    });

  return rows;
};

export interface HeadlineUsage {
  percentUsed: number;
  period: 'monthly' | 'weekly';
}

/**
 * The one figure the account menu shows: the weekly limit of a rolling plan, else the monthly
 * allowance (Free's limit, Basic's Agent tasks, a monthly window).
 */
export const headlineUsage = (subscription: PersonalSubscription): HeadlineUsage | undefined => {
  const rows = usageWindows(subscription);
  const weekly = rows.find((row) => row.rule === 'plan.7d');
  if (weekly) return { percentUsed: weekly.percentUsed, period: 'weekly' };

  const monthly = rows.find((row) => ['agentRun', 'free', 'plan.month'].includes(row.rule));
  return monthly ? { percentUsed: monthly.percentUsed, period: 'monthly' } : undefined;
};

/** When the plan's usage next starts over: the billing period's end, else Free's own reset. */
export const planResetAt = (subscription: PersonalSubscription): Date | null =>
  toDate(subscription.billingCycleEnd) ??
  toDate(subscription.usage?.freeQuota?.resetAt) ??
  toDate(subscription.usage?.agentRunQuota?.resetAt);

export const canUpgrade = (subscription: PersonalSubscription) => !TOP_PLANS.has(subscription.plan);

/** How long until `resetAt`, in whole hours under a day and whole days beyond. */
export const resetDistance = (
  resetAt: Date,
  now = Date.now(),
): { count: number; unit: 'days' | 'hours' } => {
  const hours = Math.max(1, Math.ceil((resetAt.getTime() - now) / 3_600_000));
  return hours < 24
    ? { count: hours, unit: 'hours' }
    : { count: Math.round(hours / 24), unit: 'days' };
};
