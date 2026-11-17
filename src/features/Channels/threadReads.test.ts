import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';

import {
  markThreadRead,
  useHasUnreadThreadMention,
  useThreadReadStore,
  useUnreadThreadIds,
} from './threadReads';

const at = (iso: string) => new Date(iso);
const reply = (iso: string) => ({ lastReply: { createdAt: at(iso) } }) as never;

const threads = [
  { id: 'thr_old', ...reply('2026-11-01T00:00:00Z') },
  { id: 'thr_new', ...reply('2026-11-18T10:00:00Z') },
  // Its root is off the loaded page, so nothing is known about its replies.
  { id: 'thr_unknown' },
] as never[];

describe('useUnreadThreadIds', () => {
  beforeEach(() => {
    vi.spyOn(cacheScope, 'get').mockReturnValue('personal');
    vi.spyOn(cacheScope, 'use').mockReturnValue('personal');
    useThreadReadStore.setState({ readAt: {}, since: at('2026-11-10T00:00:00Z').getTime() });
  });
  afterEach(() => vi.restoreAllMocks());

  it('marks only threads with replies after tracking began', () => {
    const { result } = renderHook(() => useUnreadThreadIds(threads));

    expect([...result.current]).toEqual(['thr_new']);
  });

  it('clears a thread once its newest reply is read, and again unread on a newer reply', () => {
    const { result, rerender } = renderHook(({ list }) => useUnreadThreadIds(list), {
      initialProps: { list: threads },
    });

    act(() => markThreadRead('thr_new', '2026-11-18T10:00:00Z'));
    expect(result.current.size).toBe(0);

    rerender({ list: [{ id: 'thr_new', ...reply('2026-11-18T11:00:00Z') }] as never[] });
    expect([...result.current]).toEqual(['thr_new']);
  });

  it('never moves a read position backwards', () => {
    markThreadRead('thr_new', '2026-11-18T10:00:00Z');
    markThreadRead('thr_new', '2026-11-18T09:00:00Z');

    expect(useThreadReadStore.getState().readAt['personal:thr_new']).toBe(
      at('2026-11-18T10:00:00Z').getTime(),
    );
  });

  it('keeps reads apart per account and workspace', () => {
    markThreadRead('thr_new', '2026-11-18T10:00:00Z');
    vi.spyOn(cacheScope, 'use').mockReturnValue('other');

    const { result } = renderHook(() => useUnreadThreadIds(threads));

    expect([...result.current]).toEqual(['thr_new']);
  });
});

describe('useHasUnreadThreadMention', () => {
  beforeEach(() => {
    vi.spyOn(cacheScope, 'get').mockReturnValue('personal');
    vi.spyOn(cacheScope, 'use').mockReturnValue('personal');
    useThreadReadStore.setState({ readAt: {}, since: at('2026-11-10T00:00:00Z').getTime() });
  });
  afterEach(() => vi.restoreAllMocks());

  const mention = (threadId: string, iso: string) => ({ createdAt: at(iso), threadId });

  it('holds a Thread mention until its Thread is read past it', () => {
    const mentions = [mention('thr_a', '2026-11-18T00:37:00Z')];
    const { result } = renderHook(() => useHasUnreadThreadMention(mentions));
    expect(result.current).toBe(true);

    act(() => markThreadRead('thr_a', '2026-11-18T01:00:00Z'));
    expect(result.current).toBe(false);
  });

  it('takes mentions from before tracking began as seen', () => {
    const { result } = renderHook(() =>
      useHasUnreadThreadMention([mention('thr_a', '2026-11-01T00:00:00Z')]),
    );
    expect(result.current).toBe(false);
  });

  it('is false without Thread mentions', () => {
    const { result } = renderHook(() => useHasUnreadThreadMention(undefined));
    expect(result.current).toBe(false);
  });
});
