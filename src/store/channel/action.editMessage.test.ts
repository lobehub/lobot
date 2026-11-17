import type { ChannelDetail, ChannelListItem, ChannelPublicMessage } from '@lobot/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import { channelService } from '@/services/channel';

import { channelActions } from './action';
import { channelViewKey } from './projection';
import { useChannelStore } from './store';

vi.mock('@/services/channel', () => ({
  channelService: { detail: vi.fn(), editMessage: vi.fn(), list: vi.fn() },
}));

const channel: ChannelListItem = {
  canDelete: true,
  createdAt: new Date(),
  id: 'chn_000000000001',
  sequence: 1,
  status: 'active',
  title: 'Edits',
  workspaceId: null,
};
const message = {
  author: { avatar: null, id: 'user-self', name: 'Me', type: 'user' },
  content: 'Helo',
  createdAt: new Date(),
  editedAt: null,
  fileIds: [],
  id: 'msg_1',
  mentions: [],
  routingStatus: 'routed',
  sequence: 1,
  threadId: 'thr_1',
} as unknown as ChannelPublicMessage;
const main = { channelId: channel.id };
const thread = { channelId: channel.id, threadId: 'thr_1' };
const detail = (rootMessage: ChannelPublicMessage | null): ChannelDetail => ({
  attachments: [],
  channel,
  hasMore: false,
  jobs: [],
  members: [],
  messages: rootMessage ? [] : [message],
  rootMessage,
  threads: [],
});
const shown = () => {
  const state = useChannelStore.getState().detailMap;
  return {
    main: state[channelViewKey(main)]?.messages[0],
    root: state[channelViewKey(thread)]?.rootMessage,
  };
};

describe('editing a Channel message', () => {
  beforeEach(async () => {
    const scope = crypto.randomUUID();
    vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'use').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(false);
    vi.mocked(channelService.list).mockResolvedValue([channel]);
    vi.mocked(channelService.detail).mockImplementation(async (params) =>
      detail(params.threadId ? message : null),
    );
    channelActions.reset();
    await channelActions.refreshDetail(main);
    await channelActions.refreshDetail(thread);
  });
  afterEach(() => {
    channelActions.reset();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows the new text as edited in every view before the server confirms', async () => {
    const request = Promise.withResolvers<never>();
    vi.mocked(channelService.editMessage).mockReturnValue(request.promise);

    const editing = channelActions.editMessage(channel.id, message.id, 'Hello');

    const { main: inMain, root } = shown();
    expect(inMain).toMatchObject({ content: 'Hello', editedAt: expect.any(Date) });
    expect(root).toMatchObject({ content: 'Hello', editedAt: expect.any(Date) });
    request.resolve(undefined as never);
    await editing;
    expect(shown().main?.content).toBe('Hello');
  });

  it('puts the original text back when the server refuses', async () => {
    vi.mocked(channelService.editMessage).mockRejectedValue(new Error('FORBIDDEN'));

    await expect(channelActions.editMessage(channel.id, message.id, 'Hello')).rejects.toThrow();

    expect(shown().main).toMatchObject({ content: 'Helo', editedAt: null });
    expect(shown().root).toMatchObject({ content: 'Helo', editedAt: null });
  });
});
