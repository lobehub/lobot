import type { ChannelDetail, ChannelListItem } from '@lobot/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import { channelService } from '@/services/channel';

import { channelActions } from './action';
import { channelViewKey } from './projection';
import { useChannelStore } from './store';

vi.mock('@/services/channel', () => ({
  channelService: { detail: vi.fn(), list: vi.fn() },
}));

const channel = (id: string, sequence: number): ChannelListItem => ({
  canDelete: true,
  createdAt: new Date(),
  id,
  sequence,
  status: 'active',
  title: id,
  workspaceId: null,
});
const detail = (id: string, sequence: number): ChannelDetail => ({
  attachments: [],
  channel: channel(id, sequence),
  hasMore: false,
  jobs: [],
  members: [],
  messages: [],
  rootMessage: null,
  threads: [],
});
const loaded = (id: string) =>
  useChannelStore.getState().detailMap[channelViewKey({ channelId: id })];

describe('Channel list refreshing loaded conversations', () => {
  let sequences: Record<string, number>;
  beforeEach(() => {
    const scope = crypto.randomUUID();
    vi.spyOn(cacheScope, 'get').mockReturnValue(scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(false);
    vi.spyOn(cacheScope, 'canHydrate').mockReturnValue(false);
    channelActions.reset();
    sequences = { alpha: 1, beta: 1 };
    vi.mocked(channelService.detail).mockImplementation(async ({ channelId }) =>
      detail(channelId, sequences[channelId]),
    );
    vi.mocked(channelService.list).mockImplementation(async () =>
      Object.entries(sequences).map(([id, sequence]) => channel(id, sequence)),
    );
  });
  afterEach(() => {
    channelActions.reset();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // Opening a conversation that changed while it was closed showed the cached messages until its
  // own read returned, although the list had already been told about the change.
  it('refreshes a loaded conversation the list shows has newer messages', async () => {
    await channelActions.refreshDetail({ channelId: 'alpha' });
    await channelActions.refreshDetail({ channelId: 'beta' });
    vi.mocked(channelService.detail).mockClear();

    sequences.alpha = 3;
    await channelActions.refreshList();

    await vi.waitFor(() => expect(loaded('alpha')?.channel.sequence).toBe(3));
    expect(channelService.detail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(channelService.detail).mock.calls[0][0]).toEqual({ channelId: 'alpha' });
  });

  it('leaves conversations that were never opened to load when opened', async () => {
    sequences.alpha = 3;
    await channelActions.refreshList();

    expect(channelService.detail).not.toHaveBeenCalled();
    expect(loaded('alpha')).toBeUndefined();
  });
});
