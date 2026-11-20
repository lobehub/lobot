import { ActionIcon, CopyButton, Flexbox, Text, Tooltip } from '@lobehub/ui';
import { Surface } from '@lobehub/ui/dashboard';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ChannelPublicMember } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import dayjs from 'dayjs';
import { FolderCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import DeviceLoadMeter, { useDeviceLoad } from '@/features/DeviceManager/DeviceLoadMeter';
import { getDeviceIcon } from '@/features/DeviceManager/getDeviceIcon';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';

import { openChannelAgentEnvironment } from './AgentEnvironment';
import { agentProfileStyles } from './agentProfileStyles';
import { deviceLabel } from './CreateChannel/EnvironmentFields';
import { memberName } from './memberName';
import type { ChannelChoice } from './useAgentRunLocation';
import { useAgentRunLocation } from './useAgentRunLocation';

const styles = stylex.create({
  dot: {
    flex: 'none',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: cssVar.colorTextQuaternary,
  },
  dotOnline: {
    backgroundColor: cssVar.colorSuccess,
  },
  label: {
    fontSize: '12px',
    color: cssVar.colorTextTertiary,
  },
  muted: {
    overflow: 'hidden',
    flexShrink: 1,
    fontSize: '12px',
    color: cssVar.colorTextTertiary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  path: {
    overflow: 'hidden',
    fontFamily: cssVar.fontFamilyCode,
    fontSize: '12px',
    color: cssVar.colorTextSecondary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  value: {
    overflow: 'hidden',
    fontSize: '13px',
    color: cssVar.colorText,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

function EnvironmentRows({ agentId, channel }: { agentId: string; channel?: ChannelChoice }) {
  const { t } = useTranslation(['channel', 'chat']);
  const { deviceId, directory, resolving, state, target } = useAgentRunLocation(agentId, channel);
  const load = useDeviceLoad(state?.kind === 'online' ? state.device : undefined);

  let device;
  if (resolving) device = <Text type="secondary">{t('environment.checkingDevice')}</Text>;
  else if (deviceId && state) {
    const name = 'device' in state ? deviceLabel(state.device) : t('environment.unavailableDevice');
    const presence =
      state.kind === 'online'
        ? t('blockedDevice.connected')
        : state.kind === 'offline'
          ? t('blockedDevice.offline', { time: dayjs(state.device.lastSeen).fromNow() })
          : state.kind === 'missing'
            ? t('blockedDevice.notShared')
            : t('environment.checkingDevice');
    device = (
      <Flexbox horizontal align="center" gap={8} style={{ minWidth: 0 }}>
        <span aria-hidden style={{ display: 'inline-flex', flexShrink: 0 }}>
          {getDeviceIcon('device' in state ? state.device.platform : null, 14)}
        </span>
        <span title={name} {...stylex.props(styles.value)}>
          {name}
        </span>
        {state.kind === 'online' ? (
          // Connected is the normal case: a glance-sized signal, with the readings on hover.
          <Tooltip title={load ? `${presence} · ${load.summary}` : presence}>
            <span role="status" style={{ display: 'inline-flex', flexShrink: 0 }}>
              {load ? (
                <DeviceLoadMeter load={load} />
              ) : (
                <span aria-label={presence} {...stylex.props(styles.dot, styles.dotOnline)} />
              )}
            </span>
          </Tooltip>
        ) : (
          <Flexbox horizontal align="center" gap={6} role="status" style={{ minWidth: 0 }}>
            {state.kind === 'offline' && <span aria-hidden {...stylex.props(styles.dot)} />}
            <span title={presence} {...stylex.props(styles.muted)}>
              {presence}
            </span>
          </Flexbox>
        )}
      </Flexbox>
    );
  } else {
    // No machine: say where it runs instead, in the chat input's words.
    const label =
      target === 'sandbox' || target === 'auto'
        ? t(`heteroAgent.executionTarget.${target}`, { ns: 'chat' })
        : t('heteroAgent.executionTarget.none', { ns: 'chat' });
    device = <span {...stylex.props(styles.value)}>{label}</span>;
  }

  return (
    <>
      <Flexbox gap={6}>
        <span {...stylex.props(styles.label)}>{t('profile.device')}</span>
        {device}
      </Flexbox>
      {deviceId && directory && (
        <Flexbox gap={6}>
          <span {...stylex.props(styles.label)}>{t('profile.directory')}</span>
          <Flexbox horizontal align="center" gap={4} style={{ minWidth: 0 }}>
            <span title={directory} {...stylex.props(styles.path)}>
              {directory}
            </span>
            <CopyButton content={directory} size="small" />
          </Flexbox>
        </Flexbox>
      )}
    </>
  );
}

/** A Channel admin also sees the device and directory picked for this conversation. */
function ChannelEnvironmentRows({
  agentId,
  channelId,
  memberId,
}: {
  agentId: string;
  channelId: string;
  memberId: string;
}) {
  channelActions.useFetchAgentEnvironment(channelId, memberId);
  const data = useChannelStore(channelSelectors.agentEnvironment({ channelId, memberId }));
  return <EnvironmentRows agentId={agentId} channel={data} />;
}

/**
 * Where the direct conversation's Agent runs: its device, whether that device is connected,
 * and the folder it starts in. `manageable` viewers may read and change this conversation's own
 * pick; everyone else sees where the Agent's own settings put it.
 */
export function AgentProfileEnvironment({
  agentId,
  channelId,
  manageable,
  member,
}: {
  agentId: string;
  channelId: string;
  manageable?: boolean;
  member: ChannelPublicMember;
}) {
  const { t } = useTranslation('channel');
  const editLabel = t('environment.editNamed', { name: memberName(member, t('deletedMember')) });
  return (
    <Flexbox gap={8} style={{ minWidth: 0 }}>
      <Text fontSize={13} type="secondary" weight={400}>
        {t('environment.title')}
      </Text>
      <Surface
        aria-label={t('environment.title')}
        padded={false}
        role="group"
        {...stylex.props(agentProfileStyles.card, agentProfileStyles.environment)}
      >
        <Flexbox horizontal align="flex-start" gap={8}>
          <Flexbox flex={1} gap={12} style={{ minWidth: 0 }}>
            {manageable ? (
              <ChannelEnvironmentRows
                agentId={agentId}
                channelId={channelId}
                memberId={member.id}
              />
            ) : (
              <EnvironmentRows agentId={agentId} />
            )}
          </Flexbox>
          {manageable && (
            <ActionIcon
              aria-label={editLabel}
              icon={FolderCog}
              size="small"
              style={{ flexShrink: 0 }}
              title={editLabel}
              onClick={() => openChannelAgentEnvironment(channelId, member)}
            />
          )}
        </Flexbox>
      </Surface>
    </Flexbox>
  );
}
