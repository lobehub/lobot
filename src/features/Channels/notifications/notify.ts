import { CHANNEL_URL } from '@lobechat/const';
import type { DesktopNotificationSender } from '@lobechat/electron-client-ipc';
import type { ChannelListItem, ChannelPublicMessage } from '@lobot/types';
import { t } from 'i18next';

import { localizeCardFallback } from '@/features/ContactCardShare/cardText';
import { channelService } from '@/services/channel';
import { completionSoundService } from '@/services/electron/completionSound';
import { desktopNotificationService } from '@/services/electron/desktopNotification';
import {
  buildNotificationBody,
  buildNotificationSender,
} from '@/store/chat/utils/desktopNotification';
import { renderAvatarToDataUrl } from '@/store/chat/utils/notificationAvatar';
import { projectListItemSelector, useProjectStore } from '@/store/project';
import { getUserStoreState } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { groupChannelName, isProjectDefaultChannel } from '../channelName';
import { isCurrentUserAuthor } from '../memberName';
import type { ChannelActivityEvent } from './activity';

/**
 * The newest message someone else posted where the Channel's latest activity is: its Thread when
 * the list preview comes from one, else the main conversation. A message older than the preview
 * is not the news (it is in a part of the Channel the page does not show), so it is dropped and
 * the banner falls back on the preview instead of replaying an old message.
 */
export const latestIncoming = async (
  channel: Pick<ChannelListItem, 'id' | 'lastMessage'>,
  workspaceId?: string | null,
): Promise<ChannelPublicMessage | undefined> => {
  const { lastMessage } = channel;
  const params = { channelId: channel.id, threadId: lastMessage?.thread?.id };
  const detail =
    workspaceId === undefined
      ? await channelService.detail(params)
      : await channelService.detailInScope(workspaceId, params);
  const userId = userProfileSelectors.userId(getUserStoreState());
  const message = detail.messages.findLast((item) => !isCurrentUserAuthor(item.author, userId));
  if (!message) return undefined;
  if (lastMessage && new Date(message.createdAt) < new Date(lastMessage.createdAt))
    return undefined;
  return message;
};

interface ChannelBanner {
  body: string;
  title: string;
}

/**
 * Banner wording, the way chat apps word it:
 * - a direct conversation is titled by its Agent and shows the message;
 * - a conversation between two people is titled by the other person, like a DM; when an Agent
 *   wrote it for them (`lobe-channel.messagePerson`), the title says which Agent relayed it;
 * - a group is titled on one line "sender (Channel · project)" and shows the message;
 * - an @mention says who mentioned the user, and where.
 */
export const buildChannelBanner = (
  { channel, kind }: ChannelActivityEvent,
  message: Pick<ChannelPublicMessage, 'author' | 'content' | 'receipt' | 'via'> | undefined,
  projectName?: string,
): ChannelBanner => {
  const sender = message?.author.name || '';
  const stored = message?.content ?? channel.lastMessage?.content;
  const text = buildNotificationBody(
    stored && localizeCardFallback(stored),
    t('notification.newMessage', { ns: 'channel' }),
  );

  // The stored title is not the viewer's name for the other person, so it never shows here.
  if (channel.peerUserId) {
    const peer = channel.memberAvatars?.find((item) => item.id === channel.peerUserId);
    const name = sender || peer?.name || channel.title;
    const relay = message?.via && !message.receipt ? message.via.name : undefined;
    return {
      body: text,
      title: relay ? t('notification.relayedTitle', { agent: relay, name, ns: 'channel' }) : name,
    };
  }

  // A project's default Channel goes by the project's name, so the project is not named twice.
  const channelName = groupChannelName(channel, projectName);
  if (kind === 'mention')
    return {
      body: text,
      title: sender
        ? t('notification.mentionedBy', { channel: channelName, name: sender, ns: 'channel' })
        : t('notification.mentioned', { channel: channelName, ns: 'channel' }),
    };

  const direct = !!channel.agentId && !channel.projectId;
  if (direct || !sender) return { body: text, title: channelName };

  return {
    body: text,
    title:
      projectName && !isProjectDefaultChannel(channel, projectName)
        ? t('notification.groupTitleInProject', {
            channel: channel.title,
            name: sender,
            ns: 'channel',
            project: projectName,
          })
        : t('notification.groupTitle', { channel: channelName, name: sender, ns: 'channel' }),
  };
};

/**
 * Who a direct conversation's banner comes from: its Agent, with the Agent's avatar. The user's
 * own Agents resolve from the agent store; another person's shared Agent (or one the store has
 * not loaded) is not there, so the name and avatar the Channel itself carries stand in.
 */
export const buildDirectSender = async (
  channel: Pick<ChannelListItem, 'agentId' | 'id' | 'memberAvatars' | 'title'>,
  message: Pick<ChannelPublicMessage, 'author'> | undefined,
): Promise<DesktopNotificationSender | undefined> => {
  const { agentId } = channel;
  if (!agentId) return undefined;

  const local = await buildNotificationSender({ agentId });
  if (local) return { ...local, conversationId: channel.id };

  const member = channel.memberAvatars?.find((item) => item.id === agentId);
  const author = message?.author.id === agentId ? message.author : undefined;
  const avatar = author?.avatar || member?.avatar;

  return {
    avatarDataUrl: avatar
      ? await renderAvatarToDataUrl(agentId, {
          avatar,
          backgroundColor: member?.backgroundColor ?? undefined,
        })
      : undefined,
    conversationId: channel.id,
    name: author?.name || member?.name || channel.title,
  };
};

/**
 * Who a group Channel's banner comes from: the message author, with their avatar. The sender
 * carries the banner's whole title, since macOS titles a communication banner by its sender; it is
 * not marked as a group, which macOS would split onto a second title line. Without the message
 * there is no one to picture.
 */
export const buildGroupSender = async (
  channel: Pick<ChannelListItem, 'id'>,
  message: Pick<ChannelPublicMessage, 'author'> | undefined,
  title: string,
): Promise<DesktopNotificationSender | undefined> => {
  const author = message?.author;
  if (!author?.name) return undefined;

  return {
    avatarDataUrl: author.avatar
      ? await renderAvatarToDataUrl(author.id ?? channel.id, { avatar: author.avatar })
      : undefined,
    conversationId: channel.id,
    name: title,
  };
};

/**
 * Announce one Channel's new activity: an OS banner that opens that message — its thread, when it
 * was posted in one — carrying the user's notification sound. The main process shows banners only
 * while the window is hidden or unfocused; when it skips one, the in-app chime plays instead so a
 * message in another Channel is still heard.
 *
 * `workspaceId` is the scope the Channel lives in when it is not the active one (`null` is the
 * personal space): its page loads from there, and clicking the banner switches to it.
 */
export const notifyChannelActivity = async (
  event: ChannelActivityEvent,
  workspaceId?: string | null,
): Promise<void> => {
  const { channel } = event;
  try {
    const [message, soundName] = await Promise.all([
      // The list preview is enough to fall back on when the page cannot load.
      latestIncoming(channel, workspaceId).catch(() => undefined),
      completionSoundService.getNotificationSoundFile(),
    ]);
    const projectName = projectListItemSelector(channel.projectId)(
      useProjectStore.getState(),
    )?.name;
    const banner = buildChannelBanner(event, message, projectName);
    // A direct conversation reads as a message from its Agent; a group one from its author.
    const sender =
      channel.agentId && !channel.projectId
        ? await buildDirectSender(channel, message)
        : await buildGroupSender(channel, message, banner.title);

    const result = await desktopNotificationService.showNotification({
      ...banner,
      navigate: {
        path: CHANNEL_URL(
          channel.id,
          message?.threadId ?? channel.lastMessage?.thread?.id,
          message ? { id: message.id, sequence: message.sequence } : null,
        ),
        workspaceId,
      },
      sender,
      soundName,
    });
    if (result?.success && !result.skipped) return;

    await completionSoundService.play();
  } catch (error) {
    console.error('Channel desktop notification failed:', error);
  }
};

/** Mirrors the Messages tab's unread count on the dock / taskbar badge; 0 clears it. */
export const syncChannelBadge = (count: number) =>
  desktopNotificationService
    .setBadgeCount(count)
    .catch((error) => console.error('Badge count update failed:', error));
