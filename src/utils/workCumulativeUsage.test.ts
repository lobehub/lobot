import { describe, expect, it } from 'vitest';

import { getWorkVersionTotalTokens } from './workCumulativeUsage';

describe('getWorkVersionTotalTokens', () => {
  it('reads the total token count from a cumulative usage snapshot', () => {
    expect(
      getWorkVersionTotalTokens({
        capturedAt: '2026-09-03T00:00:00.000Z',
        usage: { llm: { tokens: { input: 12_000, output: 3456, total: 15_456 } } },
      }),
    ).toBe(15_456);
  });

  it.each([
    undefined,
    null,
    { capturedAt: '2026-09-03T00:00:00.000Z' },
    { capturedAt: '2026-09-03T00:00:00.000Z', usage: { llm: { tokens: { total: 0 } } } },
    { capturedAt: '2026-09-03T00:00:00.000Z', usage: { llm: { tokens: { total: NaN } } } },
  ])('returns null for an unavailable token count', (cumulativeUsage) => {
    expect(getWorkVersionTotalTokens(cumulativeUsage)).toBeNull();
  });
});
