import type { DropdownItem } from '@lobehub/ui';
import { ActionIcon, DropdownMenu, Flexbox, Icon, Text, toast, Tooltip } from '@lobehub/ui';
import type { ChannelDetail, ChannelPublicMember } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import {
  BellOff,
  BellRing,
  ExternalLink,
  FolderCog,
  MoreHorizontal,
  UserMinus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { channelActions } from '@/store/channel';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { openChannelAgentEnvironment } from './AgentEnvironment';
import { ChannelStatus } from './ChannelStatus';
import type { ChannelStatusTone } from './jobStatus';
import {
  channelJobTone,
  memberCurrentJob,
  memberJobStatus,
  workingConversations,
} from './jobStatus';
import { MemberAvatar } from './MemberAvatar';
import { callerMemberRole, canRemoveMember } from './memberManagement';
import { isCurrentUserMember, memberName } from './memberName';
import { MemberProfilePopup } from './MemberProfilePopup';
import { statusStyles, styles, toneStyles } from './styles';
import { threadTitle } from './threadTitle';
import { useRemoveMember } from './useMemberActions';
import { getVisibleStatusMembers, groupMembersByActor } from './visibleMembers';

interface MemberEntry {
  /** Where a member working in several conversations at once is busy, by name. */
  conversations?: string[];
  label: string;
  member: ChannelPublicMember;
  name: string;
  tone: ChannelStatusTone;
}

export const StatusAvatar = ({ entry, size }: { entry: MemberEntry; size: number }) => (
  <span {...stylex.props(statusStyles.memberAvatar)}>
    <MemberAvatar member={entry.member} size={size} />
    {/* Idle is the default; only a reply in progress, waiting or failed earns a dot. */}
    {entry.member.actorType === 'agent' && entry.tone !== 'quiet' && (
      <span
        aria-hidden
        {...stylex.props(
          statusStyles.state,
          statusStyles.memberDot,
          entry.tone === 'working' ? statusStyles.memberWorking : toneStyles[entry.tone],
        )}
      >
        <span {...stylex.props(statusStyles.dot)} />
      </span>
    )}
  </span>
);

export function useMemberEntries(detail: ChannelDetail) {
  const { t } = useTranslation('channel');
  const { channel, jobs = [], members: allMembers = [], messages = [], threads = [] } = detail;
  const conversationName = (threadId: string | null) => {
    if (!threadId) return t('main');
    const thread = threads.find((item) => item.id === threadId);
    const root = thread && messages.find((message) => message.id === thread.rootMessageId);
    return threadTitle(root, thread) || t('thread');
  };
  const entries: MemberEntry[] = getVisibleStatusMembers(allMembers, channel.workspaceId).map(
    (member) => {
      const job = member.actorType === 'agent' ? memberCurrentJob(jobs, member.id) : undefined;
      // Working in two or more conversations at once (the main one and its Threads) says how many.
      const working = job ? workingConversations(jobs, member.id) : [];
      const parallel = working.length;
      return {
        conversations: parallel > 1 ? working.map(conversationName) : undefined,
        // Idle is the default and goes unlabelled; only a reply in progress or needing attention says so.
        label:
          member.actorType === 'agent' && job
            ? parallel > 1
              ? t('activity.parallel', { count: parallel })
              : t(memberJobStatus(job))
            : '',
        member,
        name: memberName(member, t('deletedMember')),
        tone: job ? channelJobTone(job) : 'quiet',
      };
    },
  );
  return entries;
}

/**
 * A working member reads amber, like a running Agent in the sidebar. The avatar's dot already
 * shows the state, so the line carries no icon of its own.
 */
const MemberState = ({ entry }: { entry: MemberEntry }) => {
  const { t } = useTranslation('channel');
  // An idle muted Agent says why it stays quiet; a reply it was @mentioned into still shows.
  if (!entry.label)
    return entry.member.muted ? (
      <span {...stylex.props(statusStyles.memberState, statusStyles.memberMuted)}>
        <Icon icon={BellOff} size={12} />
        {t('member.muted')}
      </span>
    ) : null;
  const state = (
    <span {...stylex.props(statusStyles.memberState)}>
      {entry.tone === 'working' ? (
        <span {...stylex.props(statusStyles.memberWorking)}>{entry.label}</span>
      ) : (
        <ChannelStatus hideDot label={entry.label} tone={entry.tone} />
      )}
    </span>
  );
  // "Working on N things" names them on hover: the main conversation and each Thread.
  return entry.conversations ? (
    <Tooltip
      placement="left"
      title={
        <Flexbox gap={2}>
          {entry.conversations.map((name, index) => (
            <Text ellipsis fontSize={12} key={index} style={{ color: 'inherit', maxWidth: 240 }}>
              {name}
            </Text>
          ))}
        </Flexbox>
      }
    >
      {state}
    </Tooltip>
  ) : (
    state
  );
};

interface MemberRowProps {
  channelId: string;
  entry: MemberEntry;
  manageable: boolean;
  /** A group Channel's admin can mute its Agents; a direct conversation's Agent never is. */
  mutable: boolean;
  onAction?: () => void;
  onRemove: () => void;
  removable: boolean;
  showDescription?: boolean;
}

const MemberRow = ({
  channelId,
  entry,
  manageable,
  mutable,
  onAction,
  onRemove,
  removable,
  showDescription,
}: MemberRowProps) => {
  const { t } = useTranslation('channel');
  const navigate = useWorkspaceAwareNavigate();
  const isAgent = entry.member.actorType === 'agent';
  const { agentId } = entry.member;
  const menuItems: DropdownItem[] = [];
  if (agentId && entry.member.status === 'active' && manageable)
    menuItems.push({
      icon: <Icon icon={FolderCog} />,
      key: 'environment',
      label: t('environment.title'),
      onClick: () => {
        onAction?.();
        openChannelAgentEnvironment(channelId, entry.member);
      },
    });
  if (agentId && entry.member.status === 'active' && mutable) {
    const muted = !!entry.member.muted;
    menuItems.push({
      icon: <Icon icon={muted ? BellRing : BellOff} />,
      key: 'mute',
      label: t(muted ? 'member.unmute' : 'member.mute'),
      onClick: () => {
        onAction?.();
        channelActions.setMemberMuted(channelId, entry.member.id, !muted).catch((error) => {
          console.error('Failed to update a Channel member mute', error);
          toast.error(t('member.muteFailed', { name: entry.name }));
        });
      },
    });
  }
  if (agentId)
    menuItems.push({
      icon: <Icon icon={ExternalLink} />,
      key: 'open',
      label: t('openAgent'),
      onClick: () => {
        onAction?.();
        navigate(`/agent/${agentId}`);
      },
    });
  if (removable)
    menuItems.push({
      danger: true,
      icon: <Icon icon={UserMinus} />,
      key: 'remove',
      label: t('member.remove'),
      onClick: () => {
        onAction?.();
        onRemove();
      },
    });

  return (
    <Flexbox
      horizontal
      align="center"
      gap={8}
      paddingBlock={6}
      {...stylex.props(stylex.defaultMarker())}
    >
      {/* Hovering who a member is shows their card, like an avatar or mention in the conversation. */}
      <MemberProfilePopup member={entry.member} placement={'left'}>
        <div {...stylex.props(styles.memberIdentity)}>
          <StatusAvatar entry={entry} size={28} />
          <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
            <Text ellipsis weight={500}>
              {entry.name}
            </Text>
            {isAgent &&
              (showDescription ? (
                entry.member.description && (
                  <Text ellipsis fontSize={12} type="secondary">
                    {entry.member.description}
                  </Text>
                )
              ) : (
                <MemberState entry={entry} />
              ))}
          </Flexbox>
        </div>
      </MemberProfilePopup>
      {showDescription && isAgent && <MemberState entry={entry} />}
      {menuItems.length > 0 && (
        <span {...stylex.props(styles.memberActions)}>
          <DropdownMenu items={menuItems}>
            <ActionIcon
              aria-label={t('memberActionsNamed', { name: entry.name })}
              icon={MoreHorizontal}
              size="small"
              title={t('more', { ns: 'common' })}
            />
          </DropdownMenu>
        </span>
      )}
    </Flexbox>
  );
};

/**
 * The same roster and member actions in the personal popover and workspace sidebar.
 * People come first; Agents follow under their own heading when both are present.
 */
export function MemberList({
  detail,
  onAction,
  showDescription,
}: {
  detail: ChannelDetail;
  onAction?: () => void;
  /** Roomy layouts: who each member is under the name, with the status moved to the row's end. */
  showDescription?: boolean;
}) {
  const { t } = useTranslation('channel');
  const entries = useMemberEntries(detail);
  const { channel } = detail;
  const manageable = channel.canDelete && channel.status !== 'archived';
  const userId = useUserStore(userProfileSelectors.userId);
  const selfRole = callerMemberRole(detail.members, userId);
  const removeMember = useRemoveMember();
  const { agents, people } = groupMembersByActor(entries);
  const renderRow = (entry: MemberEntry) => (
    <MemberRow
      channelId={channel.id}
      entry={entry}
      key={entry.member.id}
      manageable={manageable}
      mutable={manageable && !channel.agentId}
      showDescription={showDescription}
      removable={canRemoveMember(channel, entry.member, {
        isSelf: isCurrentUserMember(entry.member, userId),
        selfRole,
      })}
      onAction={onAction}
      onRemove={() => removeMember(channel, entry.member, entry.name)}
    />
  );

  return (
    <Flexbox gap={4}>
      {people.map(renderRow)}
      {agents.length > 0 && people.length > 0 && (
        <Text
          as="h3"
          fontSize={12}
          style={{ margin: 0, paddingBlock: '12px 2px' }}
          type="secondary"
          weight={500}
        >
          {t('members.agents', { count: agents.length })}
        </Text>
      )}
      {agents.map(renderRow)}
    </Flexbox>
  );
}
