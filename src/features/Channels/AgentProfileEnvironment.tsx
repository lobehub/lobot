import { isDesktop } from '@lobechat/const';
import { ActionIcon, CopyButton, Flexbox, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ChannelPublicMember } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import dayjs from 'dayjs';
import { FolderCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getDeviceIcon } from '@/features/DeviceManager/getDeviceIcon';
import { resolveExecutionTarget } from '@/helpers/executionTarget';
import { useIsGatewayModeEnabled } from '@/helpers/gatewayMode';
import { useEffectiveAgencyConfig } from '@/hooks/useEffectiveAgencyConfig';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { deviceSelectors, useDeviceStore } from '@/store/device';
import { useDeviceList } from '@/store/device/useDeviceList';

import { openChannelAgentEnvironment } from './AgentEnvironment';
import { blockedDeviceState } from './blockedDeviceState';
import { deviceLabel } from './CreateChannel/EnvironmentFields';
import { memberName } from './memberName';
import { profileEnvironment } from './profileEnvironment';

const REFRESH_INTERVAL = 15_000;

const styles = stylex.create({
  label: {
    fontSize: '12px',
    color: cssVar.colorTextTertiary,
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

interface ChannelChoice {
  deviceId?: string;
  workingDirectory?: string;
}

function EnvironmentRows({ agentId, channel }: { agentId: string; channel?: ChannelChoice }) {
  const { t } = useTranslation(['channel', 'chat']);
  useDeviceStore((s) => s.useFetchAgentDeviceBinding)(agentId, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const binding = useDeviceStore(deviceSelectors.agentDeviceBinding(agentId));
  const devices = useDeviceList({ refreshInterval: REFRESH_INTERVAL });
  const { agencyConfig, workspaceScoped } = useEffectiveAgencyConfig(agentId, { topicId: null });
  const deviceRoutingAvailable = useIsGatewayModeEnabled(agentId);
  const isHetero = useAgentStore(agentByIdSelectors.isAgentHeterogeneousById(agentId));

  // The server's binding is still on its way and the Channel picked nothing: no guess yet.
  const resolving = binding === undefined && !channel?.deviceId;
  const { deviceId, directory } = profileEnvironment({
    agencyConfig,
    bindingDeviceId: binding?.deviceId,
    channel,
    devices: devices.data,
  });

  let device;
  if (resolving) device = <Text type="secondary">{t('environment.checkingDevice')}</Text>;
  else if (deviceId) {
    const state = blockedDeviceState(deviceId, devices.data, devices.isConfirmed);
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
      <Flexbox gap={2} style={{ minWidth: 0 }}>
        <Flexbox horizontal align="center" gap={6} style={{ minWidth: 0 }}>
          <span aria-hidden style={{ display: 'inline-flex', flexShrink: 0 }}>
            {getDeviceIcon('device' in state ? state.device.platform : null, 14)}
          </span>
          <span title={name} {...stylex.props(styles.value)}>
            {name}
          </span>
        </Flexbox>
        <Text fontSize={12} role="status" type={state.kind === 'online' ? 'success' : 'secondary'}>
          {presence}
        </Text>
      </Flexbox>
    );
  } else {
    // No machine: say where it runs instead, in the chat input's words.
    const target = resolveExecutionTarget(agencyConfig, {
      clientExecutionAvailable: isDesktop,
      deviceRoutingAvailable,
      isHetero,
      workspaceScoped,
    });
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
    <Flexbox gap={12}>
      <Flexbox horizontal align="center" justify="space-between" style={{ minHeight: 22 }}>
        <span {...stylex.props(styles.label)}>{t('environment.title')}</span>
        {manageable && (
          <ActionIcon
            aria-label={editLabel}
            icon={FolderCog}
            size="small"
            title={editLabel}
            onClick={() => openChannelAgentEnvironment(channelId, member)}
          />
        )}
      </Flexbox>
      {manageable ? (
        <ChannelEnvironmentRows agentId={agentId} channelId={channelId} memberId={member.id} />
      ) : (
        <EnvironmentRows agentId={agentId} />
      )}
    </Flexbox>
  );
}
