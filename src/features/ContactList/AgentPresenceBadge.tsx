'use client';

import { Tooltip } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { AgentPresence, AgentPresenceStatus } from './agentPresence';

const pulse = stylex.keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.35 },
});

const styles = stylex.create({
  label: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingInline: '8px',
    borderRadius: '999px',
    fontSize: '12px',
    lineHeight: '22px',
    whiteSpace: 'nowrap',
    cursor: 'default',
    backgroundColor: cssVar.colorFillTertiary,
  },
  dot: {
    flex: 'none',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'currentcolor',
  },
  // Pinned to the avatar's lower-right edge, ringed in the card colour like an IM presence dot.
  avatarDot: {
    position: 'absolute',
    insetBlockEnd: '4px',
    insetInlineEnd: '4px',
    width: '18px',
    height: '18px',
    borderWidth: '3px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBgContainer,
    borderRadius: '50%',
    backgroundColor: 'currentcolor',
  },
  working: {
    animationName: pulse,
    animationDuration: '1.6s',
    animationIterationCount: 'infinite',
  },
});

const tones = stylex.create({
  idle: { color: cssVar.colorSuccess },
  offDuty: { color: cssVar.colorError },
  offline: { color: cssVar.colorTextQuaternary },
  online: { color: cssVar.colorSuccess },
  working: { color: cssVar.colorInfo },
});

const formatReset = (resetsAt: number) =>
  new Date(resetsAt).toLocaleString(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
  });

const usePresenceTip = ({ resetsAt, status }: AgentPresence) => {
  const { t } = useTranslation('common');
  if (status === 'offDuty' && resetsAt)
    return t('contacts.presence.offDuty.resetsAt', { time: formatReset(resetsAt) });
  return t(`contacts.presence.${status}.tip`);
};

/** The status chip beside an Agent's role: a dot and what it is doing, explained on hover. */
export const AgentPresenceLabel = memo<{ presence: AgentPresence }>(({ presence }) => {
  const { t } = useTranslation('common');
  const tip = usePresenceTip(presence);
  const status: AgentPresenceStatus = presence.status;

  return (
    <Tooltip title={tip}>
      <span data-status={status} {...stylex.props(styles.label, tones[status])}>
        <span aria-hidden {...stylex.props(styles.dot, status === 'working' && styles.working)} />
        {t(`contacts.presence.${status}`)}
      </span>
    </Tooltip>
  );
});

AgentPresenceLabel.displayName = 'AgentPresenceLabel';

/** The same status as a dot on the avatar, for a glance before reading the chip. */
export const AgentPresenceDot = memo<{ presence: AgentPresence }>(({ presence }) => {
  const { t } = useTranslation('common');
  const status = presence.status;

  return (
    <span
      aria-label={t(`contacts.presence.${status}`)}
      role={'img'}
      {...stylex.props(styles.avatarDot, tones[status], status === 'working' && styles.working)}
    />
  );
});

AgentPresenceDot.displayName = 'AgentPresenceDot';
