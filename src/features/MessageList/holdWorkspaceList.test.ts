import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  heldWorkspaceList,
  resetWorkspaceListMemory,
  useHeldWorkspaceList,
} from './holdWorkspaceList';

describe('heldWorkspaceList', () => {
  const fallback = { value: 'previous', workspaceId: 'ws-a' };

  it('paints the live list once this workspace is ready', () => {
    expect(heldWorkspaceList('remembered', fallback, 'ws-b', true, false, 'next')).toBe('next');
  });

  it("keeps this workspace's own list while its rows are read back", () => {
    expect(heldWorkspaceList('remembered', fallback, 'ws-b', false, false, 'empty')).toBe(
      'remembered',
    );
  });

  it('keeps the list already shown on a first visit', () => {
    expect(heldWorkspaceList(undefined, fallback, 'ws-b', false, false, 'empty')).toBe('previous');
  });

  it('paints the live list on the first load, before anything was shown', () => {
    expect(heldWorkspaceList(undefined, null, 'ws-a', false, false, 'empty')).toBe('empty');
    expect(heldWorkspaceList(undefined, fallback, 'ws-a', false, false, 'same')).toBe('same');
  });

  it('lets go when the saved rows never arrive', () => {
    expect(heldWorkspaceList('remembered', fallback, 'ws-b', false, true, 'empty')).toBe('empty');
  });
});

describe('useHeldWorkspaceList', () => {
  afterEach(() => {
    resetWorkspaceListMemory();
    vi.useRealTimers();
  });

  it('releases the previous list when the next workspace stays unloaded', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ ready, value, workspaceId }: { ready: boolean; value: string; workspaceId: string }) =>
        useHeldWorkspaceList(workspaceId, ready, value),
      { initialProps: { ready: true, value: 'previous', workspaceId: 'ws-a' } },
    );

    rerender({ ready: false, value: 'empty', workspaceId: 'ws-b' });
    expect(result.current).toBe('previous');

    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe('empty');
  });

  it('paints a visited workspace from memory while its cache is read back', () => {
    const { result, rerender } = renderHook(
      ({ ready, value, workspaceId }: { ready: boolean; value: string; workspaceId: string }) =>
        useHeldWorkspaceList(workspaceId, ready, value),
      { initialProps: { ready: true, value: 'list-a', workspaceId: 'ws-a' } },
    );

    rerender({ ready: true, value: 'list-b', workspaceId: 'ws-b' });
    rerender({ ready: true, value: 'list-b', workspaceId: 'ws-b' });
    rerender({ ready: false, value: 'empty', workspaceId: 'ws-a' });

    expect(result.current).toBe('list-a');
  });

  it('keeps the pinned list when this workspace’s rows drop out before the pins are back', () => {
    const { result, rerender } = renderHook(
      ({ ready, value, workspaceId }: { ready: boolean; value: string; workspaceId: string }) =>
        useHeldWorkspaceList(workspaceId, ready, value),
      { initialProps: { ready: true, value: 'pinned', workspaceId: 'ws-a' } },
    );

    rerender({ ready: false, value: 'unpinned', workspaceId: 'ws-a' });

    expect(result.current).toBe('pinned');
  });
});
