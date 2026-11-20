import { describe, expect, it } from 'vitest';

import { canUpgrade, headlineUsage, planResetAt, resetDistance, usageWindows } from './quota';
import type { PersonalSubscription } from './types';

const rolling = (windows: { percentLeft: number; rule: string }[]): PersonalSubscription => ({
  billingCycleEnd: Date.UTC(2026, 10, 25),
  plan: 'pro',
  usage: {
    quota: {
      overflow: { enabled: false, limit: null, resetAt: null, spend: 0 },
      windows: windows.map((window) => ({ ...window, resetAt: '2026-11-26T00:00:00.000Z' })),
    },
  },
});

describe('usageWindows', () => {
  it('lists a rolling plan shortest window first, as the share used', () => {
    const rows = usageWindows(
      rolling([
        { percentLeft: 90, rule: 'plan.ultra_7d' },
        { percentLeft: 60, rule: 'plan.7d' },
        { percentLeft: 100, rule: 'plan.5h' },
      ]),
    );

    expect(rows.map((row) => [row.rule, row.percentUsed])).toEqual([
      ['plan.5h', 0],
      ['plan.7d', 40],
      ['plan.ultra_7d', 10],
    ]);
    expect(rows[1].resetAt?.toISOString()).toBe('2026-11-26T00:00:00.000Z');
  });

  it('leaves out a window it has no name for', () => {
    expect(usageWindows(rolling([{ percentLeft: 50, rule: 'overflow.month' }]))).toEqual([]);
  });

  it('meters Free by its monthly limit and Basic by its Agent task allowance', () => {
    const free = usageWindows({
      plan: 'free',
      usage: { freeQuota: { percentLeft: 75, resetAt: null } },
    });
    const basic = usageWindows({
      plan: 'basic',
      usage: { agentRunQuota: { percentLeft: 20, resetAt: null } },
    });

    expect(free).toMatchObject([{ percentUsed: 25, rule: 'free' }]);
    expect(basic).toMatchObject([{ labelKey: 'usageBilling.window.agentRun', percentUsed: 80 }]);
  });

  it('meters nothing on a legacy plan', () => {
    expect(usageWindows({ plan: 'premium', usage: {} })).toEqual([]);
  });
});

describe('headlineUsage', () => {
  it('reads the weekly limit of a rolling plan', () => {
    expect(
      headlineUsage(
        rolling([
          { percentLeft: 10, rule: 'plan.5h' },
          { percentLeft: 60, rule: 'plan.7d' },
        ]),
      ),
    ).toEqual({ percentUsed: 40, period: 'weekly' });
  });

  it('falls back to the monthly allowance', () => {
    expect(
      headlineUsage({ plan: 'free', usage: { freeQuota: { percentLeft: 30, resetAt: null } } }),
    ).toEqual({ percentUsed: 70, period: 'monthly' });
  });

  it('has nothing to show for a legacy plan', () => {
    expect(headlineUsage({ plan: 'premium', usage: {} })).toBeUndefined();
  });
});

describe('planResetAt', () => {
  it('prefers the billing period end, else Free’s own reset', () => {
    expect(planResetAt(rolling([]))?.toISOString()).toBe('2026-11-25T00:00:00.000Z');
    expect(
      planResetAt({
        plan: 'free',
        usage: { freeQuota: { percentLeft: 1, resetAt: '2026-12-03T00:00:00.000Z' } },
      })?.toISOString(),
    ).toBe('2026-12-03T00:00:00.000Z');
  });
});

describe('canUpgrade', () => {
  it('offers no upgrade from Max', () => {
    expect(canUpgrade({ plan: 'max', usage: {} })).toBe(false);
    expect(canUpgrade({ plan: 'free', usage: {} })).toBe(true);
  });
});

describe('resetDistance', () => {
  const now = Date.UTC(2026, 10, 21, 12);

  it('counts hours under a day and days beyond', () => {
    expect(resetDistance(new Date(now + 90 * 60_000), now)).toEqual({ count: 2, unit: 'hours' });
    expect(resetDistance(new Date(now + 5 * 86_400_000), now)).toEqual({ count: 5, unit: 'days' });
  });

  it('never counts below an hour', () => {
    expect(resetDistance(new Date(now - 1000), now)).toEqual({ count: 1, unit: 'hours' });
  });
});
