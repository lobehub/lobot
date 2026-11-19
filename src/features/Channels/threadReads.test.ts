import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import {
  markThreadRead,
  useHasUnreadThreadMention,
  useMentionedThreadIds,
  useThreadReadStore,
  useUnreadThreadIds,
} from './threadReads';

const at = (iso: string) => new Date(iso);
const reply = (iso: string) =>
  ({ followerMemberIds: ['mem_me'], lastReply: { createdAt: at(iso) } }) as never;

const members = [
  { actorType: 'user', id: 'mem_me', userId: 'user_me' },
  { actorType: 'user', id: 'mem_other', userId: 'user_other' },
] as never[];

const threads = [
  { id: 'thr_old', ...reply('2026-11-01T00:00:00Z') },
  { id: 'thr_new', ...reply('2026-11-18T10:00:00Z') },
  // Its root is off the loaded page, so nothing is known about its replies.
  { followerMemberIds: ['mem_me'], id: 'thr_unknown' },
] as never[];

describe('useUnreadThreadIds', () => {
  beforeEach(() => {
    vi.spyOn(cacheScope, 'get').mockReturnValue('personal');
    vi.spyOn(cacheScope, 'use').mockReturnValue('personal');
    vi.spyOn(userProfileSelectors, 'userId').mockReturnValue('user_me');
    useUserStore.setState({});
    useThreadReadStore.setState({ readAt: {}, since: at('2026-11-10T00:00:00Z').getTime() });
  });
  afterEach(() => vi.restoreAllMocks());

  it('marks only threads with replies after tracking began', () => {
    const { result } = renderHook(() => useUnreadThreadIds(threads, members));

    expect([...result.current]).toEqual(['thr_new']);
  });

  it('clears a thread once its newest reply is read, and again unread on a newer reply', () => {
    const { result, rerender } = renderHook(({ list }) => useUnreadThreadIds(list, members), {
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

    const { result } = renderHook(() => useUnreadThreadIds(threads, members));

    expect([...result.current]).toEqual(['thr_new']);
  });

  it('leaves out threads the person does not follow', () => {
    const list = [
      { id: 'thr_mine', ...reply('2026-11-18T10:00:00Z') },
      {
        followerMemberIds: ['mem_other'],
        id: 'thr_others',
        lastReply: { createdAt: at('2026-11-18T10:00:00Z') },
      },
    ] as never[];

    const { result } = renderHook(() => useUnreadThreadIds(list, members));

    expect([...result.current]).toEqual(['thr_mine']);
  });

  it("does not count an Agent's acknowledgement before its run as unread", () => {
    const acked = (news: string | null) =>
      ({
        followerMemberIds: ['mem_me'],
        lastNewsAt: news && at(news),
        lastReply: { createdAt: at('2026-11-18T12:00:00Z') },
      }) as never;
    const list = [
      // Only the acknowledgement since tracking began.
      { id: 'thr_ack_only', ...acked(null) },
      { id: 'thr_ack_after_read', ...acked('2026-11-01T00:00:00Z') },
      // A reply the person has not seen, followed by an acknowledgement, stays unread.
      { id: 'thr_ack_after_news', ...acked('2026-11-18T11:00:00Z') },
    ] as never[];

    const { result } = renderHook(() => useUnreadThreadIds(list, members));

    expect([...result.current]).toEqual(['thr_ack_after_news']);
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

describe('useMentionedThreadIds', () => {
  beforeEach(() => {
    vi.spyOn(cacheScope, 'get').mockReturnValue('personal');
    vi.spyOn(cacheScope, 'use').mockReturnValue('personal');
    useThreadReadStore.setState({ readAt: {}, since: at('2026-11-10T00:00:00Z').getTime() });
  });
  afterEach(() => vi.restoreAllMocks());

  it('lists the Threads whose mention came after what was read there', () => {
    const mentions = [
      { createdAt: at('2026-11-18T00:37:00Z'), threadId: 'thr_a' },
      { createdAt: at('2026-11-18T00:40:00Z'), threadId: 'thr_b' },
      { createdAt: at('2026-11-01T00:00:00Z'), threadId: 'thr_old' },
    ];
    const { result } = renderHook(() => useMentionedThreadIds(mentions));
    expect([...result.current]).toEqual(['thr_a', 'thr_b']);

    act(() => markThreadRead('thr_a', '2026-11-18T01:00:00Z'));
    expect([...result.current]).toEqual(['thr_b']);
  });
});
