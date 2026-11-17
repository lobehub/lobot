import type { ChannelDetail } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import { channelViewKey } from './projection';
import { channelSelectors } from './selectors';
import type { ChannelState } from './store';

const job = (threadId: string | null) => ({
  blockedCode: null,
  id: `job_${threadId}`,
  memberId: 'mem_1',
  publicationRevoked: false,
  status: 'running',
  threadId,
  writerHeld: true,
});

const stateWith = (params: { channelId: string; threadId: string | null }, jobs: unknown[]) =>
  ({
    detailMap: {
      [channelViewKey(params)]: { jobs, messages: [] } as unknown as ChannelDetail,
    },
  }) as unknown as ChannelState;

describe('channelSelectors.hasPendingWork', () => {
  it('keeps the main conversation live while a thread card shows its work', () => {
    const main = { channelId: 'chn_1', threadId: null };
    expect(channelSelectors.hasPendingWork(main)(stateWith(main, [job('thr_1')]))).toBe(true);
  });

  it('leaves a thread idle while only another thread works', () => {
    const thread = { channelId: 'chn_1', threadId: 'thr_1' };
    expect(channelSelectors.hasPendingWork(thread)(stateWith(thread, [job('thr_2')]))).toBe(false);
    expect(channelSelectors.hasPendingWork(thread)(stateWith(thread, [job('thr_1')]))).toBe(true);
  });
});
