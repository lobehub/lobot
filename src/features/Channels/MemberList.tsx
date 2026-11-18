import type { DropdownItem } from '@lobehub/ui';
import { ActionIcon, DropdownMenu, Flexbox, Icon, Popover, Text, toast } from '@lobehub/ui';
import type { ChannelDetail, ChannelPublicMember } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { AtSign, BellRing, ExternalLink, FolderCog, MoreHorizontal, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
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
import { browseThreads, ThreadCard } from './ThreadBrowser';
import { useMentionedThreadIds, useUnreadThreadIds } from './threadReads';
import { useRemoveMember } from './useMemberActions';
import { getVisibleStatusMembers, groupMembersByActor } from './visibleMembers';

interface MemberEntry {
  /** Where a member working in several conversations at once is busy: `null` is the main one. */
  conversations?: (string | null)[];
  label: string;
  member: ChannelPublicMember;
  name: string;
  tone: ChannelStatusTone;
}

export const StatusAvatar = ({
  entry,
  showIdle,
  size,
}: {
  entry: MemberEntry;
  /** The roster gives every Agent a dot, idle ones grey; the compact header keeps idle bare. */
  showIdle?: boolean;
  size: number;
}) => (
  <span {...stylex.props(statusStyles.memberAvatar)}>
    <MemberAvatar member={entry.member} size={size} />
    {entry.member.actorType === 'agent' && (showIdle || entry.tone !== 'quiet') && (
      <span
        aria-hidden
        {...stylex.props(
          statusStyles.state,
          statusStyles.memberDot,
          entry.tone === 'working'
            ? statusStyles.memberWorking
            : entry.tone === 'quiet'
              ? statusStyles.memberIdle
              : toneStyles[entry.tone],
        )}
      >
        <span {...stylex.props(statusStyles.dot)} />
      </span>
    )}
  </span>
);

export function useMemberEntries(detail: ChannelDetail) {
  const { t } = useTranslation('channel');
  const { channel, jobs = [], members: allMembers = [] } = detail;
  const entries: MemberEntry[] = getVisibleStatusMembers(allMembers, channel.workspaceId).map(
    (member) => {
      const job = member.actorType === 'agent' ? memberCurrentJob(jobs, member.id) : undefined;
      // Working in two or more conversations at once (the main one and its Threads) says how many.
      const working = job ? workingConversations(jobs, member.id) : [];
      const parallel = working.length;
      return {
        conversations: parallel > 1 ? working : undefined,
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
 * The conversations a member works in at once, as the thread browser's cards: a click on a
 * Thread opens it. The main conversation, when among them, leads as a plain card.
 */
const WorkingConversations = ({
  detail,
  entry,
  onOpenThread,
}: {
  detail: ChannelDetail;
  entry: MemberEntry;
  onOpenThread?: (threadId: string) => void;
}) => {
  const { t } = useTranslation('channel');
  const ids = entry.conversations ?? [];
  const unreadIds = useUnreadThreadIds(detail.threads);
  const mentionedIds = useMentionedThreadIds(
    useChannelStore(channelSelectors.listed(detail.channel.id))?.threadMentions,
  );
  const threads = browseThreads(detail, {
    activeId: null,
    fallbackTitle: () => t('thread'),
    mentionedIds,
    query: '',
    unreadIds,
  }).filter((item) => ids.includes(item.thread.id));
  return (
    <div {...stylex.props(statusStyles.workingPopover)}>
      <div {...stylex.props(statusStyles.workingHeading)}>{entry.label}</div>
      {ids.includes(null) && <div {...stylex.props(statusStyles.workingMain)}>{t('main')}</div>}
      {threads.map((item) => (
        <ThreadCard
          detail={detail}
          entry={item}
          key={item.thread.id}
          onOpen={() => onOpenThread?.(item.thread.id)}
        />
      ))}
    </div>
  );
};

/**
 * A working member reads amber, like a running Agent in the sidebar. The avatar's dot already
 * shows the state, so the line carries no icon of its own.
 */
const MemberState = ({
  detail,
  entry,
  onOpenThread,
}: {
  detail: ChannelDetail;
  entry: MemberEntry;
  onOpenThread?: (threadId: string) => void;
}) => {
  const { t } = useTranslation('channel');
  const [open, setOpen] = useState(false);
  // An idle muted Agent says why it stays quiet; a reply it was @mentioned into still shows.
  if (!entry.label)
    return entry.member.muted ? (
      <span {...stylex.props(statusStyles.memberState, statusStyles.memberMuted)}>
        <Icon icon={AtSign} size={12} />
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
  // "Working on N things" lists them on hover as Thread cards, each one a way into its Thread.
  return entry.conversations ? (
    <Popover
      open={open}
      placement="left"
      trigger="hover"
      content={
        <WorkingConversations
          detail={detail}
          entry={entry}
          onOpenThread={
            onOpenThread &&
            ((threadId) => {
              setOpen(false);
              onOpenThread(threadId);
            })
          }
        />
      }
      onOpenChange={setOpen}
    >
      {state}
    </Popover>
  ) : (
    state
  );
};

interface MemberRowProps {
  detail: ChannelDetail;
  entry: MemberEntry;
  manageable: boolean;
  /** A group Channel's admin can mute its Agents; a direct conversation's Agent never is. */
  mutable: boolean;
  onAction?: () => void;
  onOpenThread?: (threadId: string) => void;
  onRemove: () => void;
  removable: boolean;
  showDescription?: boolean;
}

const MemberRow = ({
  detail,
  entry,
  manageable,
  mutable,
  onAction,
  onOpenThread,
  onRemove,
  removable,
  showDescription,
}: MemberRowProps) => {
  const { t } = useTranslation('channel');
  const navigate = useWorkspaceAwareNavigate();
  const isAgent = entry.member.actorType === 'agent';
  const { agentId } = entry.member;
  const channelId = detail.channel.id;
  const openThread =
    onOpenThread &&
    ((threadId: string) => {
      onAction?.();
      onOpenThread(threadId);
    });
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
      icon: <Icon icon={muted ? BellRing : AtSign} />,
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
      <div {...stylex.props(styles.memberIdentity)}>
        {/* Hovering the avatar shows the member's card, like an avatar in the conversation. */}
        <MemberProfilePopup member={entry.member} placement={'left'}>
          <span {...stylex.props(styles.memberAvatarTrigger)}>
            <StatusAvatar showIdle entry={entry} size={28} />
          </span>
        </MemberProfilePopup>
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
              <MemberState detail={detail} entry={entry} onOpenThread={openThread} />
            ))}
        </Flexbox>
      </div>
      {showDescription && isAgent && (
        <MemberState detail={detail} entry={entry} onOpenThread={openThread} />
      )}
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
  onOpenThread,
  showDescription,
}: {
  detail: ChannelDetail;
  onAction?: () => void;
  /** Opens a Thread from a busy member's list of the conversations it works in. */
  onOpenThread?: (threadId: string) => void;
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
      detail={detail}
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
      onOpenThread={onOpenThread}
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
