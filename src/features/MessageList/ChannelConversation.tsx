'use client';

import { CHANNEL_URL } from '@lobechat/const';
import type { ChannelListItem } from '@lobechat/types';
import { Avatar, Icon } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { HashIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import { useClearedThrough } from '@/features/Channels/clearedChannels';
import { useChannelMenu } from '@/features/Channels/useChannelMenu';
import GroupAvatar from '@/features/GroupAvatar';
import ProjectAvatar from '@/features/Projects/ProjectAvatar';
import { projectListItemSelector, useProjectStore } from '@/store/project';

import ConversationRow from './ConversationRow';
import { channelPreview, channelPreviewThread, directCounterpart } from './conversations';
import { AVATAR_SIZE, styles } from './style';

/** Title the server gives the Channel a project starts with. */
const DEFAULT_CHANNEL_TITLE = 'General';

interface ChannelConversationProps {
  active: boolean;
  activeAt: Date;
  channel: ChannelListItem;
}

/**
 * A group Channel as one more conversation, ordered with the Agents by its latest message. A
 * conversation with another person, or with someone's shared Agent, wears that counterpart.
 */
const ChannelConversation = memo<ChannelConversationProps>(({ active, activeAt, channel }) => {
  const { t } = useTranslation('channel');
  const menuItems = useChannelMenu();
  // A Channel grouped under a project wears that project's logo; a standalone one pictures
  // its members like a group chat, and keeps "#" until someone else joins.
  const project = useProjectStore(projectListItemSelector(channel.projectId));
  // A project Channel goes by its project's name; one renamed from the default "General" keeps
  // its own name as a tag, so a project's Channels stay apart.
  const title = project?.name || channel.title;
  const tag = project && channel.title !== DEFAULT_CHANNEL_TITLE ? channel.title : undefined;
  const members = channel.memberAvatars ?? [];
  const channelMark = (
    <span {...stylex.props(styles.channelMark)}>
      <Icon color={cssVar.colorTextSecondary} icon={HashIcon} size={9} />
    </span>
  );

  const counterpart = directCounterpart(channel);
  // Deleted on this device and nothing new since: a search still finds it, with no old preview.
  const clearedThrough = useClearedThrough(channel.id);
  const cleared = clearedThrough !== undefined && channel.sequence <= clearedThrough;
  // The open Channel is being read; its mentions clear once the read receipt lands.
  const mentioned = !active && !cleared && (channel.mentionCount ?? 0) > 0;

  if (counterpart)
    return (
      <ConversationRow
        active={active}
        activeAt={activeAt}
        contextMenuItems={menuItems(channel)}
        hideKey={channel.id}
        mentioned={mentioned}
        preview={cleared ? undefined : channelPreview(channel)}
        previewThread={cleared ? undefined : channelPreviewThread(channel)}
        // Someone else's Agent looks like one's own otherwise; the tag says it is theirs.
        tag={channel.sharedAgent ? t('sharedAgent.tag') : undefined}
        title={counterpart.name || channel.title}
        unread={cleared ? 0 : channel.unreadCount}
        url={CHANNEL_URL(channel.id)}
        avatar={
          counterpart.actorType === 'agent' ? (
            <AgentAvatar
              agentId={counterpart.id}
              avatar={counterpart.avatar}
              background={counterpart.backgroundColor || undefined}
              name={counterpart.name}
              size={AVATAR_SIZE}
            />
          ) : (
            <UserAvatar avatar={counterpart.avatar} name={counterpart.name} size={AVATAR_SIZE} />
          )
        }
      />
    );

  return (
    <ConversationRow
      active={active}
      activeAt={activeAt}
      contextMenuItems={menuItems(channel)}
      hideKey={channel.id}
      mentioned={mentioned}
      preview={channelPreview(channel)}
      previewThread={channelPreviewThread(channel)}
      tag={tag}
      title={title}
      unread={channel.unreadCount}
      url={CHANNEL_URL(channel.id)}
      avatar={
        project ? (
          <>
            <ProjectAvatar
              avatar={project.avatar}
              id={project.id}
              name={project.name}
              size={AVATAR_SIZE}
            />
            {channelMark}
          </>
        ) : members.length ? (
          <>
            <GroupAvatar
              size={AVATAR_SIZE}
              avatars={members.map((member) => ({
                avatar: member.avatar || (member.actorType === 'user' ? member.name : null),
                background: member.backgroundColor ?? undefined,
                seed: member.id,
                title: member.name ?? undefined,
              }))}
            />
            {channelMark}
          </>
        ) : (
          <Avatar
            avatar={<Icon color={cssVar.colorTextSecondary} icon={HashIcon} size={16} />}
            background={cssVar.colorFillSecondary}
            shape={'square'}
            size={AVATAR_SIZE}
          />
        )
      }
    />
  );
});

ChannelConversation.displayName = 'ChannelConversation';

export default ChannelConversation;
