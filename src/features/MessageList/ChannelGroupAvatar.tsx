'use client';

import { Avatar, Icon } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ChannelListItem } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { HashIcon } from 'lucide-react';
import { memo } from 'react';

import GroupAvatar from '@/features/GroupAvatar';
import ProjectAvatar from '@/features/Projects/ProjectAvatar';
import { projectListItemSelector, useProjectStore } from '@/store/project';

import { styles } from './style';

/**
 * A group Channel's avatar as the conversation list draws it: a Channel grouped under a project
 * wears that project's logo; a standalone one pictures its members like a group chat, and keeps
 * "#" until someone else joins. Its parent positions the "#" badge (`position: relative`).
 */
const ChannelGroupAvatar = memo<{
  channel: Pick<ChannelListItem, 'memberAvatars' | 'projectId'>;
  size: number;
}>(({ channel, size }) => {
  const project = useProjectStore(projectListItemSelector(channel.projectId));
  const members = channel.memberAvatars ?? [];
  const channelMark = (
    <span {...stylex.props(styles.channelMark)}>
      <Icon color={cssVar.colorTextSecondary} icon={HashIcon} size={9} />
    </span>
  );

  if (project)
    return (
      <>
        <ProjectAvatar avatar={project.avatar} id={project.id} name={project.name} size={size} />
        {channelMark}
      </>
    );
  if (members.length)
    return (
      <>
        <GroupAvatar
          avatarShape={'circle'}
          size={size}
          avatars={members.map((member) => ({
            avatar: member.avatar || (member.actorType === 'user' ? member.name : null),
            background: member.backgroundColor ?? undefined,
            seed: member.id,
            title: member.name ?? undefined,
          }))}
        />
        {channelMark}
      </>
    );
  return (
    <Avatar
      avatar={<Icon color={cssVar.colorTextSecondary} icon={HashIcon} size={16} />}
      background={cssVar.colorFillSecondary}
      shape={'square'}
      size={size}
    />
  );
});

ChannelGroupAvatar.displayName = 'ChannelGroupAvatar';

export default ChannelGroupAvatar;
