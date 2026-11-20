import type { ChannelListItem, ChannelPublicMessage } from '@lobot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
vi.mock('@/store/project', () => ({ projectListItemSelector: vi.fn(), useProjectStore: {} }));
vi.mock('@/store/chat/utils/desktopNotification', () => ({
  buildNotificationBody: (content: string | undefined, fallback: string) => content || fallback,
  buildNotificationSender: vi.fn(),
}));
vi.mock('@/store/chat/utils/notificationAvatar', () => ({
  renderAvatarToDataUrl: vi.fn(
    async (_key: string, meta: { avatar: string }) => `png:${meta.avatar}`,
  ),
}));

const {
  buildChannelBanner,
  buildDirectSender,
  buildGroupSender,
  latestIncoming,
  notifyChannelActivity,
} = await import('./notify');
const { channelService } = await import('@/services/channel');
const { completionSoundService } = await import('@/services/electron/completionSound');
const { desktopNotificationService } = await import('@/services/electron/desktopNotification');
const { buildNotificationSender } = await import('@/store/chat/utils/desktopNotification');
const { projectListItemSelector, useProjectStore } = await import('@/store/project');

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
  it('titles a group message "sender (Channel)" on one line and shows only the message', () => {
    expect(buildChannelBanner({ channel: channel(), kind: 'message' }, message('Ann'))).toEqual({
      body: 'ship it',
      title: 'notification.groupTitle(channel=Marketing,name=Ann)',
    });
  });

  it("adds a project Channel's project after the Channel", () => {
    expect(
      buildChannelBanner(
        { channel: channel({ projectId: 'prj_1' }), kind: 'message' },
        message('Ann'),
        'Launch',
      ),
    ).toEqual({
      body: 'ship it',
      title: 'notification.groupTitleInProject(channel=Marketing,name=Ann,project=Launch)',
    });
  });

  it("names a project's default Channel after the project alone", () => {
    const general = channel({ projectId: 'prj_1', title: 'General' });
    expect(
      buildChannelBanner({ channel: general, kind: 'message' }, message('Ann'), 'Launch'),
    ).toEqual({ body: 'ship it', title: 'notification.groupTitle(channel=Launch,name=Ann)' });
    expect(
      buildChannelBanner({ channel: general, kind: 'mention' }, message('Ann'), 'Launch'),
    ).toEqual({ body: 'ship it', title: 'notification.mentionedBy(channel=Launch,name=Ann)' });
  });

  it('keeps the Channel title when no sender is known', () => {
    expect(buildChannelBanner({ channel: channel(), kind: 'message' }, undefined)).toEqual({
      body: 'preview',
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

  it('titles a conversation between two people by the other person alone', () => {
    const peer = channel({ peerUserId: 'u2', title: 'Arvin Xu' });
    expect(
      buildChannelBanner({ channel: peer, kind: 'message' }, message('LiJian', 'Get')),
    ).toEqual({ body: 'Get', title: 'LiJian' });
    expect(buildChannelBanner({ channel: peer, kind: 'mention' }, message('LiJian'))).toEqual({
      body: 'ship it',
      title: 'LiJian',
    });
  });

  it('says which Agent relayed a message between two people', () => {
    const peer = channel({ peerUserId: 'u2', title: 'Arvin Xu' });
    const relayed = {
      ...message('LiJian', 'Report is ready'),
      via: { agentId: 'agt_1', avatar: null, name: 'Lobe AI' },
    };
    expect(buildChannelBanner({ channel: peer, kind: 'message' }, relayed)).toEqual({
      body: 'Report is ready',
      title: 'notification.relayedTitle(agent=Lobe AI,name=LiJian)',
    });
  });

  it('names the other person from the list when the message page could not load', () => {
    const peer = channel({
      memberAvatars: [
        { actorType: 'user', avatar: null, backgroundColor: null, id: 'u2', name: 'LiJian' },
      ],
      peerUserId: 'u2',
      title: 'Arvin Xu',
    });
    expect(buildChannelBanner({ channel: peer, kind: 'message' }, undefined)).toEqual({
      body: 'preview',
      title: 'LiJian',
    });
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
  it('pictures the author and names it by the one-line banner title, not as a group', async () => {
    expect(
      await buildGroupSender(
        channel(),
        { author: { avatar: 'https://cdn/ann.png', id: 'u2', name: 'Ann', type: 'user' } },
        'Ann (Marketing)',
      ),
    ).toEqual({
      avatarDataUrl: 'png:https://cdn/ann.png',
      conversationId: 'chn_1',
      name: 'Ann (Marketing)',
    });
  });

  it('names the author even without an avatar', async () => {
    expect(await buildGroupSender(channel(), message('Ann'), 'Ann (Marketing)')).toEqual({
      avatarDataUrl: undefined,
      conversationId: 'chn_1',
      name: 'Ann (Marketing)',
    });
  });

  it('stays a plain banner when the message page could not load', async () => {
    expect(await buildGroupSender(channel(), undefined, 'Marketing')).toBeUndefined();
  });
});

describe('latestIncoming', () => {
  const at = (minutes: number) => new Date(Date.UTC(2026, 10, 18, 10, minutes));
  const posted = (content: string, minutes: number) =>
    ({ ...message('Arvin', content), createdAt: at(minutes) }) as ChannelPublicMessage;

  it('reads the Thread the preview comes from, not the main conversation', async () => {
    const detail = vi.fn(async () => ({ messages: [posted('in thread', 5)] }));
    Object.assign(channelService, { detail });

    const result = await latestIncoming({
      id: 'chn_1',
      lastMessage: { content: 'in thread', createdAt: at(5), thread: { id: 'thd_1', title: null } },
    });

    expect(detail).toHaveBeenCalledWith({ channelId: 'chn_1', threadId: 'thd_1' });
    expect(result?.content).toBe('in thread');
  });

  // Regression: activity the page did not show announced the main conversation's old message.
  it('drops a message older than the preview so the banner does not replay it', async () => {
    Object.assign(channelService, { detail: async () => ({ messages: [posted('old', 1)] }) });

    const result = await latestIncoming({
      id: 'chn_1',
      lastMessage: { content: 'newer', createdAt: at(6), thread: null },
    });

    expect(result).toBeUndefined();
  });
});

describe('notifyChannelActivity', () => {
  const at = new Date('2026-11-20T03:00:00Z');
  const showNotification = vi.fn(async () => ({ skipped: false, success: true }));
  const posted = (threadId: string | null) =>
    ({
      author: { avatar: null, id: 'u2', name: 'Ann', type: 'user' },
      content: 'ship it',
      createdAt: at,
      id: 'msg_9',
      sequence: 12,
      threadId,
    }) as ChannelPublicMessage;

  beforeEach(() => {
    showNotification.mockClear();
    Object.assign(desktopNotificationService, { showNotification });
    Object.assign(completionSoundService, {
      getNotificationSoundFile: async () => undefined,
      play: async () => undefined,
    });
    Object.assign(useProjectStore, { getState: () => ({}) });
    vi.mocked(projectListItemSelector).mockReturnValue(() => undefined);
  });

  it('opens the main conversation on the message the banner is about', async () => {
    Object.assign(channelService, { detail: async () => ({ messages: [posted(null)] }) });

    await notifyChannelActivity({
      channel: channel({ lastMessage: { content: 'ship it', createdAt: at, thread: null } }),
      kind: 'message',
    });

    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        navigate: { path: '/channels/chn_1?message=msg_9&sequence=12', workspaceId: undefined },
      }),
    );
  });

  it('opens the thread on that message when it was posted in one', async () => {
    Object.assign(channelService, { detail: async () => ({ messages: [posted('thd_1')] }) });

    await notifyChannelActivity({
      channel: channel({
        lastMessage: { content: 'ship it', createdAt: at, thread: { id: 'thd_1', title: null } },
      }),
      kind: 'message',
    });

    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        navigate: {
          path: '/channels/chn_1?thread=thd_1&view=page&message=msg_9&sequence=12',
          workspaceId: undefined,
        },
      }),
    );
  });

  // The list preview still knows which thread the activity was in when its page cannot load.
  it('still opens the thread when the message page cannot load', async () => {
    Object.assign(channelService, {
      detail: async () => {
        throw new Error('offline');
      },
    });

    await notifyChannelActivity({
      channel: channel({
        lastMessage: { content: 'ship it', createdAt: at, thread: { id: 'thd_1', title: null } },
      }),
      kind: 'message',
    });

    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        navigate: { path: '/channels/chn_1?thread=thd_1&view=page', workspaceId: undefined },
      }),
    );
  });
});
