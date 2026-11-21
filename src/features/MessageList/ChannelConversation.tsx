'use client';

import { CHANNEL_URL } from '@lobechat/const';
import type { ChannelListItem } from '@lobot/types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import { isProjectDefaultChannel } from '@/features/Channels/channelName';
import { useClearedThrough } from '@/features/Channels/clearedChannels';
import { withoutChannelMore } from '@/features/Channels/flattenChannelMenu';
import { useHasUnreadThreadMention } from '@/features/Channels/threadReads';
import { useChannelMenu } from '@/features/Channels/useChannelMenu';
import { channelActions } from '@/store/channel';
import { projectListItemSelector, useProjectStore } from '@/store/project';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import ChannelGroupAvatar from './ChannelGroupAvatar';
import ConversationRow from './ConversationRow';
import { channelPreview, channelPreviewThread, directCounterpart } from './conversations';
import { conversationAvatarSize } from './style';

interface Props {
  active: boolean;
  activeAt: Date;
  channel: ChannelListItem;
  /** Large when this is the only pin; compact when several are pinned. */
  tile?: 'solo' | 'pair' | 'compact' | 'dense';
  variant?: 'row' | 'tile';
}

/**
 * A group Channel as one more conversation, ordered with the Agents by its latest message. A
 * conversation with another person, or with someone's shared Agent, wears that counterpart.
 */
const ChannelConversation = memo<Props>(({ active, activeAt, channel, tile, variant }) => {
  const { t } = useTranslation('channel');
  const avatarSize = conversationAvatarSize(variant, tile);
  const channelMenu = useChannelMenu();
  // A row's menu keeps the person's own list settings; managing the Channel is in its header.
  const menuItems = (item: ChannelListItem) => withoutChannelMore(channelMenu(item));
  const project = useProjectStore(projectListItemSelector(channel.projectId));
  // A project's default "General" Channel goes by the project's name. One named on purpose leads
  // with its own name, the project muted after it, so a project's Channels stay apart.
  const projectName = project?.name;
  const defaultChannel = isProjectDefaultChannel(channel, projectName);
  const title = defaultChannel ? projectName : channel.title;
  const tag = defaultChannel ? undefined : projectName;

  const counterpart = directCounterpart(channel);
  const userId = useUserStore(userProfileSelectors.userId);
  // Deleted on this device and nothing new since: a search still finds it, with no old preview.
  const clearedThrough = useClearedThrough(channel.id);
  const cleared = clearedThrough !== undefined && channel.sequence <= clearedThrough;
  // The open Channel is being read; its mentions clear once the read receipt lands. A Thread
  // mention stays until its Thread is opened, even after the main conversation was read.
  const threadMentioned = useHasUnreadThreadMention(channel.threadMentions);
  const mentioned = !active && !cleared && ((channel.mentionCount ?? 0) > 0 || threadMentioned);
  const warm = () => {
    void channelActions.warmView(channel.id);
  };

  if (counterpart)
    return (
      <ConversationRow
        active={active}
        activeAt={activeAt}
        contextMenuItems={menuItems(channel)}
        hideKey={channel.id}
        mentioned={mentioned}
        muted={!!channel.mutedAt}
        preview={cleared ? undefined : channelPreview(channel, { userId })}
        tile={tile}
        title={counterpart.name || channel.title}
        unread={cleared ? 0 : channel.unreadCount}
        url={CHANNEL_URL(channel.id)}
        variant={variant}
        avatar={
          counterpart.actorType === 'agent' ? (
            <AgentAvatar
              agentId={counterpart.id}
              avatar={counterpart.avatar}
              background={counterpart.backgroundColor || undefined}
              name={counterpart.name}
              size={avatarSize}
            />
          ) : (
            <UserAvatar
              avatar={counterpart.avatar}
              name={counterpart.name}
              shape={'circle'}
              size={avatarSize}
            />
          )
        }
        onIntent={warm}
        previewThread={cleared ? undefined : channelPreviewThread(channel)}
        // Someone else's Agent looks like one's own otherwise; the tag says it is theirs.
        tag={channel.sharedAgent ? t('sharedAgent.tag') : undefined}
      />
    );

  return (
    <ConversationRow
      active={active}
      activeAt={activeAt}
      avatar={<ChannelGroupAvatar channel={channel} size={avatarSize} />}
      contextMenuItems={menuItems(channel)}
      hideKey={channel.id}
      mentioned={mentioned}
      previewThread={channelPreviewThread(channel)}
      tag={tag}
      tile={tile}
      title={title}
      unread={channel.unreadCount}
      url={CHANNEL_URL(channel.id)}
      variant={variant}
      onIntent={warm}
      muted={!!channel.mutedAt}
      // A group names who said it; the viewer's own message reads "Me: …".
      preview={channelPreview(channel, { group: true, userId })}
    />
  );
});

ChannelConversation.displayName = 'ChannelConversation';

export default ChannelConversation;
