import type { ChannelListItem } from '@lobechat/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { channelActions } from './action';
import { useChannelStore } from './store';

vi.mock('@/services/channel', () => ({
  channelService: { list: vi.fn(), openShared: vi.fn() },
}));

const { channelService } = await import('@/services/channel');

const share = { agentId: 'agt_shared', shareId: 'share-1' };

describe('channelActions.openShared', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    channelActions.reset();
    vi.mocked(channelService.list).mockResolvedValue([]);
  });

  it('reuses the listed conversation with the shared Agent', async () => {
    useChannelStore.setState({
      listMap: {
        all: [
          {
            agentId: 'agt_shared',
            id: 'chn_000000000001',
            projectId: null,
            sharedAgent: true,
          } as ChannelListItem,
        ],
      },
    });

    await expect(channelActions.openShared(share)).resolves.toBe('chn_000000000001');
    expect(channelService.openShared).not.toHaveBeenCalled();
  });

  it('opens one from the share alone, then refreshes the list', async () => {
    vi.mocked(channelService.openShared).mockResolvedValue('chn_000000000002');

    await expect(channelActions.openShared(share)).resolves.toBe('chn_000000000002');
    expect(channelService.openShared).toHaveBeenCalledExactlyOnceWith('share-1');
    expect(channelService.list).toHaveBeenCalled();
  });

  it('reports no conversation when the share cannot be opened', async () => {
    vi.mocked(channelService.openShared).mockResolvedValue(null);

    await expect(channelActions.openShared(share)).resolves.toBeUndefined();
    expect(channelService.list).not.toHaveBeenCalled();
  });
});
