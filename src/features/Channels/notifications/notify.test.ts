import type { ChannelListItem, ChannelPublicMessage } from '@lobechat/types';
import { describe, expect, it, vi } from 'vitest';

vi.mock('i18next', () => ({
  t: (key: string, options?: Record<string, string>) =>
    options
      ? `${key}(${Object.entries(options)
          .filter(([name]) => name !== 'ns')
          .map(([name, value]) => `${name}=${value}`)
          .join(',')})`
      : key,
}));
vi.mock('@/services/channel', () => ({ channelService: {} }));
vi.mock('@/services/electron/completionSound', () => ({ completionSoundService: {} }));
vi.mock('@/services/electron/desktopNotification', () => ({ desktopNotificationService: {} }));
vi.mock('@/store/user', () => ({ getUserStoreState: () => ({}) }));
vi.mock('@/store/chat/utils/desktopNotification', () => ({
  buildNotificationBody: (content: string | undefined, fallback: string) => content || fallback,
  buildNotificationSender: vi.fn(),
}));
vi.mock('@/store/chat/utils/notificationAvatar', () => ({
  renderAvatarToDataUrl: vi.fn(
    async (_key: string, meta: { avatar: string }) => `png:${meta.avatar}`,
  ),
}));

const { buildChannelBanner, buildDirectSender, buildGroupSender } = await import('./notify');
const { buildNotificationSender } = await import('@/store/chat/utils/desktopNotification');

const channel = (extra: Partial<ChannelListItem> = {}) =>
  ({
    agentId: null,
    id: 'chn_1',
    lastMessage: { content: 'preview', createdAt: new Date() },
    projectId: null,
    title: 'Marketing',
    ...extra,
  }) as ChannelListItem;

const message = (name: string | null, content = 'ship it') =>
  ({ author: { avatar: null, id: 'u2', name, type: 'user' }, content }) as Pick<
    ChannelPublicMessage,
    'author' | 'content'
  >;

describe('buildChannelBanner', () => {
  it('shows "sender: message" under a group Channel title', () => {
    expect(buildChannelBanner({ channel: channel(), kind: 'message' }, message('Ann'))).toEqual({
      body: 'Ann: ship it',
      title: 'Marketing',
    });
  });

  it('titles a direct conversation by its Agent and shows only the message', () => {
    expect(
      buildChannelBanner(
        { channel: channel({ agentId: 'agt_1', title: 'Sanjo' }), kind: 'message' },
        message('Sanjo', 'done'),
      ),
    ).toEqual({ body: 'done', title: 'Sanjo' });
  });

  it('says who mentioned the user, and where', () => {
    expect(buildChannelBanner({ channel: channel(), kind: 'mention' }, message('Ann'))).toEqual({
      body: 'ship it',
      title: 'notification.mentionedBy(channel=Marketing,name=Ann)',
    });
  });

  it('falls back to the list preview when the message page could not load', () => {
    expect(buildChannelBanner({ channel: channel(), kind: 'mention' }, undefined)).toEqual({
      body: 'preview',
      title: 'notification.mentioned(channel=Marketing)',
    });
  });
});

describe('buildDirectSender', () => {
  const agentMessage = {
    author: { avatar: 'https://cdn/deck.png', id: 'agt_shared', name: 'Deck Deck', type: 'agent' },
  } as Pick<ChannelPublicMessage, 'author'>;

  it('stays a plain banner for a group Channel', async () => {
    expect(await buildDirectSender(channel(), agentMessage)).toBeUndefined();
  });

  it("uses the agent store for the user's own Agent", async () => {
    vi.mocked(buildNotificationSender).mockResolvedValueOnce({
      avatarDataUrl: 'png:own',
      conversationId: 'agt_1',
      name: 'Sanjo',
    });
    expect(
      await buildDirectSender(channel({ agentId: 'agt_1', title: 'Sanjo' }), undefined),
    ).toEqual({ avatarDataUrl: 'png:own', conversationId: 'chn_1', name: 'Sanjo' });
  });

  it("pictures a shared Agent the agent store doesn't know with the Channel's avatar", async () => {
    vi.mocked(buildNotificationSender).mockResolvedValueOnce(undefined);
    expect(
      await buildDirectSender(
        channel({ agentId: 'agt_shared', sharedAgent: true, title: 'Deck Deck' }),
        agentMessage,
      ),
    ).toEqual({
      avatarDataUrl: 'png:https://cdn/deck.png',
      conversationId: 'chn_1',
      name: 'Deck Deck',
    });
  });

  it('falls back to the list avatar when the message page could not load', async () => {
    vi.mocked(buildNotificationSender).mockResolvedValueOnce(undefined);
    expect(
      await buildDirectSender(
        channel({
          agentId: 'agt_shared',
          memberAvatars: [
            {
              actorType: 'agent',
              avatar: '🦊',
              backgroundColor: '#fff',
              id: 'agt_shared',
              name: 'Deck Deck',
            },
          ],
          title: 'Deck Deck',
        }),
        undefined,
      ),
    ).toEqual({ avatarDataUrl: 'png:🦊', conversationId: 'chn_1', name: 'Deck Deck' });
  });
});

describe('buildGroupSender', () => {
  it('pictures the author and keeps the banner title as the group name', async () => {
    expect(
      await buildGroupSender(
        channel(),
        { author: { avatar: 'https://cdn/ann.png', id: 'u2', name: 'Ann', type: 'user' } },
        'Marketing',
      ),
    ).toEqual({
      avatarDataUrl: 'png:https://cdn/ann.png',
      conversationId: 'chn_1',
      groupName: 'Marketing',
      name: 'Ann',
    });
  });

  it('names the author even without an avatar', async () => {
    expect(await buildGroupSender(channel(), message('Ann'), 'Marketing')).toEqual({
      avatarDataUrl: undefined,
      conversationId: 'chn_1',
      groupName: 'Marketing',
      name: 'Ann',
    });
  });

  it('stays a plain banner when the message page could not load', async () => {
    expect(await buildGroupSender(channel(), undefined, 'Marketing')).toBeUndefined();
  });
});
