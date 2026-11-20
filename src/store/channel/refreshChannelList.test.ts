import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshChannelList } from './refreshChannelList';

const mocks = vi.hoisted(() => ({ refreshList: vi.fn() }));

vi.mock('@/store/channel', () => ({ channelActions: { refreshList: mocks.refreshList } }));

describe('refreshChannelList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Channels are always on: no server flag holds the refetch back.
  it('refetches the Channel list', async () => {
    mocks.refreshList.mockResolvedValue(undefined);
    refreshChannelList();
    await waitFor(() => expect(mocks.refreshList).toHaveBeenCalledTimes(1));
  });

  it('logs a failed refetch instead of throwing into the caller', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.refreshList.mockRejectedValue(new Error('offline'));
    expect(() => refreshChannelList()).not.toThrow();
    await waitFor(() => expect(error).toHaveBeenCalledWith(expect.any(String), expect.any(Error)));
    error.mockRestore();
  });
});
