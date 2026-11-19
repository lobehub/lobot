import { ActionIcon, Button, DropdownMenu, Flexbox, Popover, Text } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { MoreHorizontal, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCloseOnNavigate } from '@/hooks/useCloseOnNavigate';
import { sx } from '@/styles/sx';

import { FailureIndicator } from './FailureIndicator';
import { InviteMembersButton } from './InviteMembersButton';
import { MemberList, StatusAvatar, useMemberEntries } from './MemberList';
import { statusStyles, styles } from './styles';
import { useChannelHeaderMenuItems } from './useChannelHeaderMenu';

/** Header avatars before the rest fold into a count; the list shows everyone. */
const MAX_VISIBLE = 5;

/**
 * The Channel's own actions, beside its title: in a direct conversation the Agent's, in a group
 * its settings. The title itself reuses these items for a right-click menu.
 */
export function ChannelMenu({
  detail,
  onToggleAgentPanel,
}: {
  detail: ChannelDetail;
  onToggleAgentPanel?: () => void;
}) {
  const { t } = useTranslation(['channel', 'channelHeader']);
  const items = useChannelHeaderMenuItems(detail, onToggleAgentPanel);

  return (
    <DropdownMenu items={items}>
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
      {!direct &&
        (memberPanel ? (
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
        ))}
      {/* A direct conversation has no roster, so starting a group with its Agent stays here. */}
      {direct && <InviteMembersButton detail={detail} />}
    </Flexbox>
  );
}
