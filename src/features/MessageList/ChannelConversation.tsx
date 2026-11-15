'use client';

import { CHANNEL_URL } from '@lobechat/const';
import type { ChannelListItem } from '@lobechat/types';
import { Avatar, Icon } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { HashIcon } from 'lucide-react';
import { memo } from 'react';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import { useChannelMenu } from '@/features/Channels/useChannelMenu';
import GroupAvatar from '@/features/GroupAvatar';
import ProjectAvatar from '@/features/Projects/ProjectAvatar';
import { projectListItemSelector, useProjectStore } from '@/store/project';

import ConversationRow from './ConversationRow';
import { channelPreview, directCounterpart } from './conversations';
import { AVATAR_SIZE, styles } from './style';

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
  const menuItems = useChannelMenu();
  // A Channel grouped under a project wears that project's logo; a standalone one pictures
  // its members like a group chat, and keeps "#" until someone else joins.
  const project = useProjectStore(projectListItemSelector(channel.projectId));
  const members = channel.memberAvatars ?? [];
  const channelMark = (
    <span {...stylex.props(styles.channelMark)}>
      <Icon color={cssVar.colorTextSecondary} icon={HashIcon} size={9} />
    </span>
  );

  const counterpart = directCounterpart(channel);

  if (counterpart)
    return (
      <ConversationRow
        closeOnReselect
        active={active}
        activeAt={activeAt}
        contextMenuItems={menuItems(channel)}
        preview={channelPreview(channel)}
        title={counterpart.name || channel.title}
        unread={channel.unreadCount}
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
      closeOnReselect
      active={active}
      activeAt={activeAt}
      contextMenuItems={menuItems(channel)}
      preview={channelPreview(channel)}
      tag={project?.name}
      title={channel.title}
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
