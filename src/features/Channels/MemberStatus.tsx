import { CHANNEL_URL } from '@lobechat/const';
import { ActionIcon, Button, DropdownMenu, Flexbox, Popover, Text } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { Bot, CircleUserRound, FolderCog, MoreHorizontal, Settings, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useCloseOnNavigate } from '@/hooks/useCloseOnNavigate';
import { sx } from '@/styles/sx';

import { openChannelAgentEnvironment } from './AgentEnvironment';
import { FailureIndicator } from './FailureIndicator';
import { InviteMembersButton } from './InviteMembersButton';
import { MemberList, StatusAvatar, useMemberEntries } from './MemberList';
import { statusStyles, styles } from './styles';
import { useChannelMenu } from './useChannelMenu';
import { useOpenDirectAgent } from './useOpenDirectAgent';

/** Header avatars before the rest fold into a count; the list shows everyone. */
const MAX_VISIBLE = 5;

/**
 * Channel actions a direct conversation keeps. It is the chat with one Agent, so it cannot be
 * renamed, archived or trashed; `unarchive` only frees one that was archived earlier.
 */
const DIRECT_MENU_KEYS = new Set(['copyId', 'unarchive']);

/**
 * The Channel's own actions, beside its title: in a direct conversation the Agent's, in a group
 * its settings.
 */
export function ChannelMenu({ detail }: { detail: ChannelDetail }) {
  const { t } = useTranslation('channel');
  const navigate = useWorkspaceAwareNavigate();
  const { channel } = detail;
  const entries = useMemberEntries(detail);
  const directAgent = channel.agentId
    ? entries.find((entry) => entry.member.agentId === channel.agentId)
    : undefined;
  const openAgent = useOpenDirectAgent(channel.id, channel.agentId ?? '');
  const channelMenu = useChannelMenu();
  const direct = !!channel.agentId;
  // A direct conversation is a chat with one Agent: no roster to show, only its actions, like an
  // IM header. Its title is the Agent's name, so it cannot be renamed here.
  const directMenu = () => [
    ...(directAgent
      ? [
          ...(openAgent
            ? [
                {
                  icon: Bot,
                  key: 'openAgent',
                  label: t('openAgentNamed', { name: directAgent.name }),
                  onClick: () => openAgent(),
                },
              ]
            : []),
          // The member list is hidden here, so its device and directory setup lives in this menu.
          ...(directAgent.member.status === 'active' &&
          channel.canDelete &&
          channel.status !== 'archived'
            ? [
                {
                  icon: FolderCog,
                  key: 'environment',
                  label: t('environment.title'),
                  onClick: () => openChannelAgentEnvironment(channel.id, directAgent.member),
                },
              ]
            : []),
          { type: 'divider' as const },
        ]
      : []),
    // Keyed items only: the menu's own dividers separate actions a direct conversation does not have.
    ...channelMenu(channel).filter(
      (item) => 'key' in item && DIRECT_MENU_KEYS.has(String(item.key)),
    ),
  ];

  // A conversation between two people has no settings to manage, only the private chat's actions.
  const peerMenu = () => channelMenu(channel);

  // Managing a group lives on its settings page; deleting it is not one click from the header.
  const groupMenu = () => [
    ...channelMenu(channel).filter((item) => 'key' in item && item.key === 'copyId'),
    ...(channel.canDelete
      ? [
          { type: 'divider' as const },
          {
            icon: Settings,
            key: 'settings',
            label: t('settings.title'),
            onClick: () => navigate(`${CHANNEL_URL(channel.id)}/settings`),
          },
        ]
      : []),
  ];

  return (
    <DropdownMenu items={direct ? directMenu() : channel.peerUserId ? peerMenu() : groupMenu()}>
      <ActionIcon
        aria-label={t('more', { ns: 'common' })}
        icon={MoreHorizontal}
        size="small"
        title={t('more', { ns: 'common' })}
      />
    </DropdownMenu>
  );
}

/**
 * Members as avatars with live status dots. One click lists everyone by name, because
 * Agents often share the default avatar and a long roster would not fit the header.
 */
export function MemberStatus({
  detail,
  memberPanel,
  onOpenThread,
}: {
  detail: ChannelDetail;
  memberPanel?: { id: string; open: boolean; onToggle: () => void };
  onOpenThread?: (threadId: string) => void;
}) {
  const { t } = useTranslation('channel');
  const [open, setOpen] = useState(false);
  const popoverKey = useCloseOnNavigate(open, () => setOpen(false));
  const { channel } = detail;
  const entries = useMemberEntries(detail);
  const overflow = entries.length - MAX_VISIBLE;
  const title = t('membersCount', { count: entries.length });
  const direct = !!channel.agentId;

  return (
    <Flexbox horizontal align="center" gap={4}>
      <FailureIndicator detail={detail} />
      {direct ? (
        memberPanel && (
          <ActionIcon
            active={memberPanel.open}
            aria-controls={memberPanel.open ? memberPanel.id : undefined}
            aria-expanded={memberPanel.open}
            aria-label={t(memberPanel.open ? 'profile.hide' : 'profile.show')}
            icon={CircleUserRound}
            size="small"
            title={t(memberPanel.open ? 'profile.hide' : 'profile.show')}
            onClick={memberPanel.onToggle}
          />
        )
      ) : memberPanel ? (
        <ActionIcon
          active={memberPanel.open}
          aria-controls={memberPanel.open ? memberPanel.id : undefined}
          aria-expanded={memberPanel.open}
          aria-label={t(memberPanel.open ? 'members.hide' : 'members.show')}
          icon={Users}
          size="small"
          title={t(memberPanel.open ? 'members.hide' : 'members.show')}
          onClick={memberPanel.onToggle}
        />
      ) : (
        <Popover
          key={popoverKey}
          open={open}
          placement="bottomRight"
          trigger="click"
          content={
            <Flexbox gap={4} {...stylex.props(statusStyles.popover, statusStyles.memberList)}>
              <Flexbox horizontal align="center" justify="space-between">
                <Text fontSize={12} type="secondary" weight={500}>
                  {title}
                </Text>
                <InviteMembersButton detail={detail} />
              </Flexbox>
              <MemberList
                detail={detail}
                onAction={() => setOpen(false)}
                onOpenThread={onOpenThread}
              />
            </Flexbox>
          }
          onOpenChange={setOpen}
        >
          <Button
            aria-label={title}
            size="small"
            type="text"
            {...stylex.props(statusStyles.memberButton)}
          >
            <span {...stylex.props(statusStyles.memberStack)}>
              {entries.slice(0, MAX_VISIBLE).map((entry, index) => (
                // Earlier avatars sit on top, or each one would cover the previous status dot.
                <span
                  key={entry.member.id}
                  {...sx(statusStyles.memberStackItem, { zIndex: MAX_VISIBLE - index })}
                >
                  <StatusAvatar entry={entry} size={20} />
                </span>
              ))}
            </span>
            {overflow > 0 && <span {...stylex.props(styles.muted)}>+{overflow}</span>}
          </Button>
        </Popover>
      )}
      {/* A direct conversation has no roster, so starting a group with its Agent stays here. */}
      {direct && <InviteMembersButton detail={detail} />}
    </Flexbox>
  );
}
