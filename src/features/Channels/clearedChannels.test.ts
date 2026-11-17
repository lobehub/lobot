import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';

import { clearChannelLocally, useAfterCleared, useClearedChannelStore } from './clearedChannels';

const messages = [{ sequence: 3 }, { sequence: 5 }, { sequence: 8 }];

describe('useAfterCleared', () => {
  beforeEach(() => {
    vi.spyOn(cacheScope, 'get').mockReturnValue('personal');
    vi.spyOn(cacheScope, 'use').mockReturnValue('personal');
    useClearedChannelStore.setState({ clearedThrough: {} });
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps every message of a conversation never deleted', () => {
    const { result } = renderHook(() => useAfterCleared('chn_a', messages));

    expect(result.current).toEqual({ cleared: false, messages });
  });

  it('keeps only what came after the deletion', () => {
    clearChannelLocally('chn_a', 5);

    const { result } = renderHook(() => useAfterCleared('chn_a', messages));

    expect(result.current).toEqual({ cleared: true, messages: [{ sequence: 8 }] });
  });

  it('belongs to the identity that deleted it', () => {
    clearChannelLocally('chn_a', 5);
    vi.mocked(cacheScope.use).mockReturnValue('workspace:other');

    const { result } = renderHook(() => useAfterCleared('chn_a', messages));

    expect(result.current.cleared).toBe(false);
  });
});
