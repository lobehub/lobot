import { CHANNEL_URL } from '@lobechat/const';
import type { ChannelDetail, ChannelPublicMember } from '@lobot/types';
import { Button, Flexbox, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { Hash, Settings, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { canInviteMembers } from './channelAccess';
import { openInviteMembers } from './CreateChannel';
import { MemberAvatar } from './MemberAvatar';
import { isCurrentUserMember, memberName } from './memberName';
import { channelTitle } from './peerTitle';
import { getVisibleStatusMembers } from './visibleMembers';

const styles = stylex.create({
  root: {
    paddingBlock: 32,
    paddingInline: 4,
  },
  hash: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: '50%',
    color: cssVar.colorTextSecondary,
    backgroundColor: cssVar.colorFillSecondary,
  },
  title: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.3,
    color: cssVar.colorText,
  },
  member: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: cssVar.colorTextSecondary,
  },
});

/** The other side of a one-to-one conversation: its Agent, or the other person. */
export const welcomeCounterpart = (
  detail: Pick<ChannelDetail, 'channel' | 'members'>,
  viewerId: string | undefined,
): ChannelPublicMember | undefined => {
  const { channel, members } = detail;
  if (channel.agentId) return members.find((member) => member.agentId === channel.agentId);
  if (channel.peerUserId)
    return members.find(
      (member) => member.actorType === 'user' && !isCurrentUserMember(member, viewerId),
    );
  return undefined;
};

interface ChannelWelcomeProps {
  detail: ChannelDetail;
  /** Sends a first greeting; absent where the viewer cannot post. */
  onGreet?: (content: string) => void;
}

/**
 * The top of a conversation's history, like Discord: who or what this is, and the first thing to do.
 * It stays above the first message once there is one.
 */
export function ChannelWelcome({ detail, onGreet }: ChannelWelcomeProps) {
  const { t } = useTranslation('channel');
  const navigate = useWorkspaceAwareNavigate();
  const userId = useUserStore(userProfileSelectors.userId);
  const { channel } = detail;
  const name = channelTitle(detail, userId);
  const counterpart = welcomeCounterpart(detail, userId);

  if (channel.agentId || channel.peerUserId) {
    const subtitle = channel.agentId
      ? counterpart?.description
      : counterpart?.username && `@${counterpart.username}`;
    return (
      <Flexbox gap={12} {...stylex.props(styles.root)}>
        {counterpart && <MemberAvatar member={counterpart} size={80} />}
        <h2 {...stylex.props(styles.title)}>{name}</h2>
        {subtitle && <Text type="secondary">{subtitle}</Text>}
        <Text type="secondary">{t('welcome.direct', { name })}</Text>
        {onGreet && (
          <div>
            <Button onClick={() => onGreet(t('welcome.greeting'))}>
              {t('welcome.greet', { name })}
            </Button>
          </div>
        )}
      </Flexbox>
    );
  }

  const members = getVisibleStatusMembers(detail.members, channel.workspaceId);
  const admin = canInviteMembers(channel);
  return (
    <Flexbox gap={12} {...stylex.props(styles.root)}>
      <span {...stylex.props(styles.hash)}>
        <Hash size={36} />
      </span>
      <h2 {...stylex.props(styles.title)}>{t('welcome.groupTitle', { name })}</h2>
      <Text type="secondary">{t('welcome.group', { name })}</Text>
      {admin && (
        <Flexbox horizontal gap={8}>
          <Button
            icon={UserPlus}
            onClick={() =>
              openInviteMembers({
                agentIds: detail.members.flatMap((member) =>
                  member.status === 'active' && member.agentId ? [member.agentId] : [],
                ),
                id: channel.id,
                peopleCount: detail.members.filter(
                  (member) => member.status === 'active' && member.actorType === 'user',
                ).length,
                workspaceId: channel.workspaceId,
              })
            }
          >
            {t('welcome.addMembers')}
          </Button>
          <Button icon={Settings} onClick={() => navigate(`${CHANNEL_URL(channel.id)}/settings`)}>
            {t('welcome.editChannel')}
          </Button>
        </Flexbox>
      )}
      {members.length > 0 && (
        <Flexbox horizontal gap={12} wrap="wrap">
          {members.map((member) => (
            <span key={member.id} {...stylex.props(styles.member)}>
              <MemberAvatar member={member} size={24} />
              {memberName(member, t('deletedMember'))}
            </span>
          ))}
        </Flexbox>
      )}
    </Flexbox>
  );
}
