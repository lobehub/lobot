import { Flexbox, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { isPrivateWorkspaceDevice } from '@/features/DeviceManager/deviceVisibility';
import { getDeviceIcon } from '@/features/DeviceManager/getDeviceIcon';

import { deviceLabel } from './CreateChannel/EnvironmentFields';
import { useAgentRunLocation } from './useAgentRunLocation';

const styles = stylex.create({
  line: { color: cssVar.colorTextSecondary, fontSize: 13, minWidth: 0 },
  path: {
    fontFamily: cssVar.fontFamilyCode,
    fontSize: 12,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fixed: { flexShrink: 0 },
  icon: { display: 'inline-flex', flexShrink: 0 },
  separator: { color: cssVar.colorTextQuaternary },
  summary: { minWidth: 0 },
});

const PRESENCE_TONE = {
  checking: 'secondary',
  missing: 'secondary',
  offline: 'warning',
  online: 'success',
} as const;

/**
 * Where the Agent runs when this Channel follows its own settings: the device, whether it is
 * connected, and the folder it starts in. A device that will hold replies back says so, with
 * what to do here.
 */
export function OwnEnvironmentSummary({ agentId, name }: { agentId: string; name: string }) {
  const { t } = useTranslation(['channel', 'chat']);
  const { deviceId, directory, resolving, state, target } = useAgentRunLocation(agentId);

  if (resolving)
    return (
      <Text fontSize={13} type="secondary">
        {t('environment.checkingDevice')}
      </Text>
    );

  if (!deviceId || !state) {
    // No machine: say where it runs instead, in the chat input's words.
    const label =
      target === 'sandbox' || target === 'auto'
        ? t(`heteroAgent.executionTarget.${target}`, { ns: 'chat' })
        : t('heteroAgent.executionTarget.none', { ns: 'chat' });
    return (
      <Text fontSize={13} type="secondary">
        {label}
      </Text>
    );
  }

  const device = 'device' in state ? state.device : undefined;
  const presence =
    state.kind === 'online'
      ? t('blockedDevice.connected')
      : state.kind === 'offline'
        ? t('blockedDevice.offline', { time: dayjs(state.device.lastSeen).fromNow() })
        : state.kind === 'missing'
          ? undefined
          : t('environment.checkingDevice');
  const warning =
    state.kind === 'offline'
      ? t('environment.ownDeviceOffline', { name })
      : state.kind === 'missing'
        ? t('blockedDevice.notShared')
        : device && isPrivateWorkspaceDevice(device)
          ? t('blockedDevice.private')
          : undefined;

  return (
    <Flexbox gap={4} {...stylex.props(styles.summary)}>
      <Flexbox horizontal align="center" gap={6} {...stylex.props(styles.line)}>
        <span aria-hidden {...stylex.props(styles.icon)}>
          {getDeviceIcon(device?.platform ?? null, 14)}
        </span>
        <Text fontSize={13} type="secondary" {...stylex.props(styles.fixed)}>
          {device ? deviceLabel(device) : t('environment.unavailableDevice')}
        </Text>
        {presence && (
          <>
            <span aria-hidden {...stylex.props(styles.separator)}>
              ·
            </span>
            <Text
              fontSize={13}
              role="status"
              type={PRESENCE_TONE[state.kind]}
              {...stylex.props(styles.fixed)}
            >
              {presence}
            </Text>
          </>
        )}
        {directory && (
          <>
            <span aria-hidden {...stylex.props(styles.separator)}>
              ·
            </span>
            <span title={directory} {...stylex.props(styles.path)}>
              {directory}
            </span>
          </>
        )}
      </Flexbox>
      {warning && (
        <Text fontSize={12} type="warning">
          {warning}
        </Text>
      )}
    </Flexbox>
  );
}
