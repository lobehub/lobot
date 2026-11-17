import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { consumeChannelJump, requestChannelJump, useChannelJump } from './messageJump';

describe('channel message jump', () => {
  it('reaches only the addressed conversation until it is consumed', () => {
    const main = renderHook(() => useChannelJump('chn_a', null));
    const thread = renderHook(() => useChannelJump('chn_a', 'cht_1'));

    act(() => requestChannelJump({ channelId: 'chn_a', id: 'm1', sequence: 4, threadId: 'cht_1' }));
    expect(main.result.current).toBeNull();
    expect(thread.result.current).toMatchObject({ id: 'm1', sequence: 4 });

    const first = thread.result.current!;
    act(() => requestChannelJump({ channelId: 'chn_a', id: 'm1', sequence: 4, threadId: 'cht_1' }));
    const second = thread.result.current!;
    expect(second.nonce).not.toBe(first.nonce);

    // A stale consumer leaves the newer request in place.
    act(() => consumeChannelJump(first));
    expect(thread.result.current).toBe(second);
    act(() => consumeChannelJump(second));
    expect(thread.result.current).toBeNull();
  });
});
