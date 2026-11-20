import type { ChannelListItem } from '@lobot/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import { channelService } from '@/services/channel';

import { channelActions } from './action';
import { useChannelStore } from './store';

vi.mock('@/services/channel', () => ({
  channelService: { list: vi.fn(), moveToSection: vi.fn(), setPinned: vi.fn() },
}));

const channel: ChannelListItem = {
  canDelete: true,
  createdAt: new Date(),
  id: 'chn_000000000001',
  pinnedAt: null,
  sequence: 0,
  status: 'active',
  title: 'Team',
  workspaceId: null,
};
const row = () => useChannelStore.getState().listMap.all?.[0];
const pinnedAt = () => row()?.pinnedAt;

describe('pinning a Channel', () => {
  beforeEach(async () => {
    const scope = crypto.randomUUID();
    vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'use').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(false);
    vi.mocked(channelService.list).mockResolvedValue([channel]);
    channelActions.reset();
    await channelActions.refreshList();
  });
  afterEach(() => {
    channelActions.reset();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('moves the row to the pinned part before the server confirms, then unpins it', async () => {
    const request = Promise.withResolvers<never>();
    vi.mocked(channelService.setPinned).mockReturnValue(request.promise);

    const pinning = channelActions.setPinned(channel.id, true);
    expect(pinnedAt()).toBeInstanceOf(Date);
    request.resolve({ data: new Date(), success: true } as never);
    await pinning;
    expect(channelService.setPinned).toHaveBeenCalledWith(channel.id, true);

    vi.mocked(channelService.setPinned).mockResolvedValue({ data: null, success: true } as never);
    await channelActions.setPinned(channel.id, false);
    expect(pinnedAt()).toBeNull();
  });

  it('restores the row when the pin fails', async () => {
    vi.mocked(channelService.setPinned).mockRejectedValue(new Error('Not found'));

    await expect(channelActions.setPinned(channel.id, true)).rejects.toThrow('Not found');
    expect(pinnedAt()).toBeNull();
  });

  // An open project Channel the person reads without belonging to it: the server joins them.
  it('shows an unjoined Channel as joined once pinned or filed, and unjoined again on failure', async () => {
    vi.mocked(channelService.list).mockResolvedValue([{ ...channel, joined: false }]);
    await channelActions.refreshList();

    vi.mocked(channelService.setPinned).mockRejectedValue(new Error('Not found'));
    await expect(channelActions.setPinned(channel.id, true)).rejects.toThrow('Not found');
    expect(row()?.joined).toBe(false);

    vi.mocked(channelService.moveToSection).mockResolvedValue({
      data: 'sec_1',
      success: true,
    } as never);
    await channelActions.moveToSection(channel.id, 'sec_1');
    expect(row()).toMatchObject({ joined: true, sectionId: 'sec_1' });
  });

  it('marks an unjoined Channel joined when it is pinned', async () => {
    vi.mocked(channelService.list).mockResolvedValue([{ ...channel, joined: false }]);
    await channelActions.refreshList();
    vi.mocked(channelService.setPinned).mockResolvedValue({
      data: new Date(),
      success: true,
    } as never);

    await channelActions.setPinned(channel.id, true);

    expect(row()?.joined).toBe(true);
  });
});
