import { describe, expect, it } from 'vitest';

import { channelReadUpTo, threadReadUpTo } from './readUpTo';

describe('channelReadUpTo', () => {
  it('reads up to the listed sequence when the saved page trails the list', () => {
    expect(channelReadUpTo(10, 12)).toBe(12);
  });

  it('reads up to the loaded page when it is ahead of the list', () => {
    expect(channelReadUpTo(14, 12)).toBe(14);
  });

  it('reads up to the list before any page has loaded', () => {
    expect(channelReadUpTo(undefined, 12)).toBe(12);
    expect(channelReadUpTo(9, undefined)).toBe(9);
    expect(channelReadUpTo(undefined, undefined)).toBeUndefined();
  });
});

describe('threadReadUpTo', () => {
  const at = (iso: string) => new Date(iso).getTime();

  it("reads up to the thread list's newer news when the saved replies trail it", () => {
    expect(
      threadReadUpTo('2026-11-20T10:00:00Z', {
        lastNewsAt: new Date('2026-11-20T10:05:00Z'),
        lastReply: { createdAt: new Date('2026-11-20T10:05:00Z') } as never,
      }),
    ).toBe(at('2026-11-20T10:05:00Z'));
  });

  it('reads up to the newest loaded reply when it is the latest', () => {
    expect(
      threadReadUpTo('2026-11-20T10:09:00Z', { lastNewsAt: new Date('2026-11-20T10:05:00Z') }),
    ).toBe(at('2026-11-20T10:09:00Z'));
  });

  it('knows nothing without a loaded reply or a listed one', () => {
    expect(threadReadUpTo(undefined, undefined)).toBeUndefined();
    expect(threadReadUpTo(undefined, { lastNewsAt: null })).toBeUndefined();
  });
});
