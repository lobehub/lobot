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

const view = { channelId: 'alpha', threadId: null };

describe('warmView', () => {
  beforeEach(() => {
    const scope = crypto.randomUUID();
    vi.spyOn(cacheScope, 'get').mockReturnValue(scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(false);
    vi.spyOn(cacheScope, 'canHydrate').mockReturnValue(false);
    channelActions.reset();
    vi.mocked(channelService.detail).mockImplementation(async ({ channelId }) =>
      detail(channelId, 1),
    );
  });

  afterEach(() => {
    channelActions.reset();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // Opening a conversation waited until its page mounted, so the saved messages
  // never made the first frame.
  it('reads a conversation that is not in memory yet', async () => {
    await channelActions.warmView('alpha');

    expect(channelService.detail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(channelService.detail).mock.calls[0][0]).toEqual(view);
  });

  it('joins a second request for the same conversation into the one already running', async () => {
    let release: (() => void) | undefined;
    vi.mocked(channelService.detail).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(detail('alpha', 1));
        }),
    );

    const first = channelActions.warmView('alpha');
    const second = channelActions.warmView('alpha');
    release?.();
    await Promise.all([first, second]);

    expect(channelService.detail).toHaveBeenCalledTimes(1);
  });

  it('leaves a page that is already as new as the list', async () => {
    useChannelStore.setState({
      detailMap: { [channelViewKey(view)]: detail('alpha', 4) },
      listMap: { all: [channel('alpha', 4)] },
    });

    await channelActions.warmView('alpha');

    expect(channelService.detail).not.toHaveBeenCalled();
  });

  it('refreshes a page the list shows has a newer message', async () => {
    useChannelStore.setState({
      detailMap: { [channelViewKey(view)]: detail('alpha', 2) },
      listMap: { all: [channel('alpha', 4)] },
    });

    await channelActions.warmView('alpha');

    expect(channelService.detail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(channelService.detail).mock.calls[0][0]).toEqual(view);
  });
});
