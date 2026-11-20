import type { DropdownItem } from '@lobehub/ui';
import {
  ActionIcon,
  DropdownMenu,
  Flexbox,
  Icon,
  Popover,
  showContextMenu,
  Text,
  toast,
} from '@lobehub/ui';
import type { ChannelDetail, ChannelPublicMember } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { AtSign, BellRing, ExternalLink, FolderCog, MoreHorizontal, UserMinus } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { presenceDotStyles } from '@/features/ContactList/AgentPresenceBadge';
import { useAgentPresence } from '@/features/ContactList/useAgentPresence';
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
import { WorkingConversations } from './memberWork';
import { statusStyles, styles, toneStyles } from './styles';
import { useRemoveMember } from './useMemberActions';
import { getVisibleStatusMembers, groupMembersByActor } from './visibleMembers';

interface MemberEntry {
  /** Where a working member is busy, shown on hover: `null` is the main one. */
  conversations?: (string | null)[];
  label: string;
  member: ChannelPublicMember;
  name: string;
  tone: ChannelStatusTone;
}

/**
 * An Agent's dot: its presence, as its contact card shows it (online, idle, asleep, waking,
 * working, offline, off duty). A reply running in this Channel says working at once, ahead of
 * the presence poll; until presence loads, only a busy or failed reply earns a dot.
 */
const AgentStatusDot = ({ entry }: { entry: MemberEntry }) => {
  const { t } = useTranslation('common');
  const presence = useAgentPresence(entry.member.agentId ?? undefined);
  const status = entry.tone === 'working' ? 'working' : presence?.status;
  if (!status)
    return entry.tone === 'quiet' ? null : (
      <span
        aria-hidden
        {...stylex.props(statusStyles.state, statusStyles.memberDot, toneStyles[entry.tone])}
      >
        <span {...stylex.props(statusStyles.dot)} />
      </span>
    );
  return (
    <span
      aria-label={t(`contacts.presence.${status}`)}
      role={'img'}
      title={t(`contacts.presence.${status}`)}
      {...stylex.props(statusStyles.state, statusStyles.memberDot, ...presenceDotStyles(status))}
    >
      <span {...stylex.props(statusStyles.dot, status === 'sleeping' && statusStyles.dotHollow)} />
    </span>
  );
};

export const StatusAvatar = ({ entry, size }: { entry: MemberEntry; size: number }) => (
  <span {...stylex.props(statusStyles.memberAvatar)}>
    <MemberAvatar member={entry.member} size={size} />
    {entry.member.actorType === 'agent' && <AgentStatusDot entry={entry} />}
  </span>
);

export function useMemberEntries(detail: ChannelDetail) {
  const { t } = useTranslation('channel');
  const { jobs = [], members: allMembers = [] } = detail;
  const entries: MemberEntry[] = getVisibleStatusMembers(allMembers).map((member) => {
    const job = member.actorType === 'agent' ? memberCurrentJob(jobs, member.id) : undefined;
    // Working in two or more conversations at once (the main one and its Threads) says how many.
    const working = job ? workingConversations(jobs, member.id) : [];
    const parallel = working.length;
    return {
      conversations: parallel > 0 ? working : undefined,
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
  });
  return entries;
}

/**
 * A working member's line reads as plain secondary text, like a description. The avatar's dot
 * already shows the state, so the line carries no icon of its own.
 */
const MemberState = ({
  detail,
  entry,
  onOpenThread,
  plain,
}: {
  detail: ChannelDetail;
  entry: MemberEntry;
  onOpenThread?: (threadId: string) => void;
  /** The roster card already lists the work, so the line stays text. */
  plain?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  if (!entry.label) return null;
  const state = (
    <span {...stylex.props(statusStyles.memberState)}>
      {entry.tone === 'working' ? (
        <span {...stylex.props(statusStyles.memberWorking)}>{entry.label}</span>
      ) : (
        <ChannelStatus hideIcon label={entry.label} tone={entry.tone} />
      )}
    </span>
  );
  // A working line lists where the work is on hover as Thread cards, each one a way into its Thread.
  // The roster puts that list in the profile card, so the line is not a second click target.
  return !plain && entry.conversations ? (
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
  /** Clears the roster selection, for example when a right-click menu takes over. */
  onDismiss?: () => void;
  onOpenThread?: (threadId: string) => void;
  onRemove: () => void;
  /** `open` selects this row; `false` clears it only when it is the one selected. */
  onSelect?: (open: boolean) => void;
  removable: boolean;
  /** The roster: a click selects the row and opens its card. A feed list stays hover-only. */
  selectable?: boolean;
  selected?: boolean;
  showDescription?: boolean;
}

const MemberRow = ({
  detail,
  entry,
  manageable,
  mutable,
  onAction,
  onDismiss,
  onOpenThread,
  onRemove,
  onSelect,
  removable,
  selectable,
  selected,
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

  const openCard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.currentTarget.click();
  };
  const avatar = (
    <span {...stylex.props(styles.memberAvatarTrigger)}>
      <StatusAvatar entry={entry} size={28} />
    </span>
  );
  const details = (
    <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
      {/* Muted is a standing setting, not a passing state: it sits right after the name. */}
      <span {...stylex.props(statusStyles.memberNameLine)}>
        <Text ellipsis weight={500}>
          {entry.name}
        </Text>
        {isAgent && entry.member.muted && (
          <span {...stylex.props(statusStyles.memberMuted)}>{t('member.muted')}</span>
        )}
      </span>
      {isAgent &&
        (showDescription ? (
          entry.member.description && (
            <Text ellipsis fontSize={12} type="secondary">
              {entry.member.description}
            </Text>
          )
        ) : (
          <MemberState detail={detail} entry={entry} plain={selectable} onOpenThread={openThread} />
        ))}
    </Flexbox>
  );
  // The menu button stays outside the selection hit target, so opening it does not toggle the card.
  const actions = menuItems.length > 0 && (
    <span
      {...stylex.props(styles.memberActions)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu items={menuItems}>
        <ActionIcon
          aria-label={t('memberActionsNamed', { name: entry.name })}
          icon={MoreHorizontal}
          size="small"
          title={t('more', { ns: 'common' })}
        />
      </DropdownMenu>
    </span>
  );
  const row = (
    <Flexbox
      horizontal
      align="center"
      gap={8}
      paddingBlock={6}
      {...stylex.props(
        stylex.defaultMarker(),
        selectable && styles.memberRow,
        selected && styles.memberRowSelected,
      )}
      onContextMenu={
        selectable && menuItems.length > 0
          ? (event) => {
              event.preventDefault();
              // The card and the action menu occupy the same side of the row; the menu wins.
              onDismiss?.();
              showContextMenu(menuItems);
            }
          : undefined
      }
    >
      {selectable ? (
        <MemberProfilePopup
          highlightTrigger={false}
          member={entry.member}
          open={selected}
          placement={'left'}
          trigger={'click'}
          extra={
            entry.conversations && (
              <WorkingConversations
                embedded
                detail={detail}
                entry={entry}
                onOpenThread={
                  openThread &&
                  ((threadId) => {
                    onSelect?.(false);
                    openThread(threadId);
                  })
                }
              />
            )
          }
          onOpenChange={(open) => onSelect?.(open)}
        >
          <div
            aria-pressed={selected}
            role={'button'}
            tabIndex={0}
            {...stylex.props(styles.memberIdentity, styles.memberSelect)}
            onKeyDown={openCard}
          >
            {avatar}
            {details}
          </div>
        </MemberProfilePopup>
      ) : (
        <div {...stylex.props(styles.memberIdentity)}>
          <MemberProfilePopup member={entry.member} placement={'left'} trigger={'click'}>
            {avatar}
          </MemberProfilePopup>
          {details}
        </div>
      )}
      {showDescription && isAgent && (
        <MemberState detail={detail} entry={entry} plain={selectable} onOpenThread={openThread} />
      )}
      {actions}
    </Flexbox>
  );
  return row;
};

/**
 * The roster and member actions of the Channel's member panel.
 * People come first; Agents follow under their own heading when both are present.
 */
export function MemberList({
  detail,
  onAction,
  onOpenThread,
  selectable,
  showDescription,
}: {
  detail: ChannelDetail;
  onAction?: () => void;
  /** Opens a Thread from a busy member's list of the conversations it works in. */
  onOpenThread?: (threadId: string) => void;
  /** Click a row to select it and open its card; right-click opens the row menu. */
  selectable?: boolean;
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
  // One card at a time. Closing a row leaves a newer selection alone when the two updates meet.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const renderRow = (entry: MemberEntry) => (
    <MemberRow
      detail={detail}
      entry={entry}
      key={entry.member.id}
      manageable={manageable}
      mutable={manageable && !channel.agentId}
      selectable={selectable}
      selected={selectable && selectedId === entry.member.id}
      showDescription={showDescription}
      removable={canRemoveMember(channel, entry.member, {
        isSelf: isCurrentUserMember(entry.member, userId),
        selfRole,
      })}
      onAction={onAction}
      onDismiss={() => setSelectedId(null)}
      onOpenThread={onOpenThread}
      onRemove={() => removeMember(channel, entry.member, entry.name)}
      onSelect={(open) =>
        setSelectedId((current) =>
          open ? entry.member.id : current === entry.member.id ? null : current,
        )
      }
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
