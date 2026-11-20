import { ActionIcon, Flexbox, Text } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import type { StyleXStyles } from '@stylexjs/stylex';
import * as stylex from '@stylexjs/stylex';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import NavHeader from '@/features/NavHeader';
import RightPanel from '@/features/RightPanel';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';

import { InviteMembersButton } from './InviteMembersButton';
import { MemberList, useMemberEntries } from './MemberList';
import { styles } from './styles';

export const MEMBER_PANEL_WIDTH = 256;
export const MEMBER_FLOAT_BREAKPOINT = 640;
const MEMBER_PANEL_MAX_WIDTH = 480;
/** Room the conversation keeps beside a widened side panel. */
const MEMBER_PANEL_CONVERSATION_MIN = 360;

/** Resize bounds for the side panel: floats full-width when narrow, otherwise drags within room left by the feed. */
export function channelSidePanelSize(
  availableWidth: number,
  preferredWidth: number,
  minimumWidth = MEMBER_PANEL_WIDTH,
) {
  if (availableWidth < MEMBER_FLOAT_BREAKPOINT)
    return {
      maxWidth: availableWidth,
      minWidth: availableWidth,
      mode: 'float' as const,
      width: availableWidth,
    };

  const minWidth = Math.min(availableWidth, Math.max(MEMBER_PANEL_WIDTH, minimumWidth));
  const maxWidth = Math.max(
    minWidth,
    Math.min(MEMBER_PANEL_MAX_WIDTH, availableWidth - MEMBER_PANEL_CONVERSATION_MIN),
  );
  return {
    maxWidth,
    minWidth,
    mode: 'fixed' as const,
    width: Math.min(Math.max(preferredWidth, minWidth), maxWidth),
  };
}

/** The Channel's right column: floats over a narrow conversation, sits beside a wide one. */
export function ChannelSidePanel({
  actions,
  availableWidth = 1000,
  children,
  centeredTitle = false,
  closeLabel,
  id,
  label,
  minWidth: minimumWidth,
  onClose,
  title,
  xstyle,
}: {
  /** Header actions, before the close button. */
  actions?: ReactNode;
  availableWidth?: number;
  children: ReactNode;
  centeredTitle?: boolean;
  closeLabel: string;
  id: string;
  label: string;
  /** Optional lower bound for this panel only; remembered widths are clamped to it. */
  minWidth?: number;
  onClose: () => void;
  title?: string;
  xstyle?: StyleXStyles;
}) {
  const [preferredWidth, updateSystemStatus] = useGlobalStore((s) => [
    systemStatusSelectors.channelSidePanelWidth(s),
    s.updateSystemStatus,
  ]);
  const { maxWidth, minWidth, mode, width } = channelSidePanelSize(
    availableWidth,
    preferredWidth,
    minimumWidth,
  );

  return (
    <RightPanel
      expand
      expandFollowsSelection
      className={stylex.props(styles.threadPanel).className}
      classNames={{ content: stylex.props(styles.threadContent).className }}
      maxWidth={maxWidth}
      minWidth={minWidth}
      mode={mode}
      showHandleWhenCollapsed={false}
      showHandleWideArea={false}
      width={width}
      onExpandChange={(open) => {
        if (!open) onClose();
      }}
      onSizeChange={(size) => {
        if (mode === 'float') return;
        const next = Number.parseFloat(String(size?.width));
        if (Number.isFinite(next)) updateSystemStatus({ channelSidePanelWidth: Math.round(next) });
      }}
    >
      <Flexbox
        aria-label={label}
        id={id}
        role="complementary"
        {...stylex.props(styles.body, xstyle)}
      >
        <NavHeader
          paddingBlock={6}
          paddingInline={12}
          showTogglePanelButton={false}
          left={
            centeredTitle ? (
              <span aria-hidden style={{ width: 24 }} />
            ) : title ? (
              <Text fontSize={12} type="secondary" weight={500}>
                {title}
              </Text>
            ) : undefined
          }
          right={
            <Flexbox horizontal align="center" gap={4}>
              {actions}
              <ActionIcon
                aria-label={closeLabel}
                icon={X}
                size="small"
                title={closeLabel}
                onClick={onClose}
              />
            </Flexbox>
          }
        >
          {centeredTitle && (
            <Text style={{ textAlign: 'center' }} weight={500}>
              {title}
            </Text>
          )}
        </NavHeader>
        {children}
      </Flexbox>
    </RightPanel>
  );
}

/** The Channel roster: a single list, without online/offline groups. */
export function MemberPanel({
  availableWidth,
  detail,
  id,
  onClose,
  onOpenThread,
}: {
  availableWidth?: number;
  detail: ChannelDetail;
  id: string;
  onClose: () => void;
  onOpenThread?: (threadId: string) => void;
}) {
  const { t } = useTranslation('channel');
  const entries = useMemberEntries(detail);

  return (
    <ChannelSidePanel
      actions={<InviteMembersButton detail={detail} />}
      availableWidth={availableWidth}
      closeLabel={t('members.hide')}
      id={id}
      label={t('membersTitle')}
      title={t('membersCount', { count: entries.length })}
      onClose={onClose}
    >
      <Flexbox flex={1} padding={12} paddingBlock={4} style={{ minHeight: 0, overflowY: 'auto' }}>
        <MemberList selectable detail={detail} onOpenThread={onOpenThread} />
      </Flexbox>
    </ChannelSidePanel>
  );
}
