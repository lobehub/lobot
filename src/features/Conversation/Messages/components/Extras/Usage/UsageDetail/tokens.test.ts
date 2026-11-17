import { describe, expect, it } from 'vitest';

import { getDetailsToken } from './tokens';

describe('getDetailsToken', () => {
  it('splits input into cache hits and misses and derives the cache rate', () => {
    const result = getDetailsToken({
      inputCachedTokens: 300,
      totalInputTokens: 1000,
      totalOutputTokens: 200,
      totalTokens: 1200,
    } as never);

    expect(result.inputCached?.token).toBe(300);
    expect(result.inputCacheMiss?.token).toBe(700);
    expect(result.inputCacheRate).toBeCloseTo(0.3, 10);
    expect(result.totalOutput?.token).toBe(200);
    expect(result.totalTokens?.token).toBe(1200);
  });

  it('leaves out counts that are zero', () => {
    expect(getDetailsToken({ totalTokens: 0 } as never).totalTokens).toBeUndefined();
  });
});
