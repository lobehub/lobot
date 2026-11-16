import type { ChannelPublicMember } from '@lobechat/types';
import { Button, Flexbox, Text, usePopoverContext } from '@lobehub/ui';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { getDeviceIcon } from '@/features/DeviceManager/getDeviceIcon';
import { channelActions } from '@/store/channel';
import { useDeviceList } from '@/store/device/useDeviceList';

import { openChannelAgentEnvironment } from './AgentEnvironment';
import { blockedDeviceState } from './blockedDeviceState';
import { deviceLabel } from './CreateChannel/EnvironmentFields';

/**
 * A waiting reply shows the device right under its name row, so it lines up under the name:
 * avatar (24) plus the row gap (8). A failed one shows it under the failure reason, which
 * starts at the card's edge, so it starts there too.
 */
const INDENT = 32;

function Hint() {
  const { t } = useTranslation('channel');
  return (
    <Text fontSize={12} style={{ paddingInlineStart: INDENT }} type="secondary">
      {t('blockedDevice.hint')}
    </Text>
  );
}

/**
 * A device, what the device gateway sees of it now, and a way to move the Agent elsewhere.
 * Only a waiting reply starts once its device is online; a failed one never does.
 */
function DeviceRow({
  deviceId,
  onChange,
  retry,
  waiting,
}: {
  deviceId: string;
  onChange?: () => void;
  retry?: ReactNode;
  waiting?: boolean;
}) {
  const { t } = useTranslation('channel');
  const devices = useDeviceList({ refreshInterval: 15_000 });
  const state = blockedDeviceState(deviceId, devices.data, devices.isConfirmed);
  const name = 'device' in state ? deviceLabel(state.device) : t('environment.unavailableDevice');
  const presence =
    state.kind === 'online'
      ? t(waiting ? 'blockedDevice.online' : 'blockedDevice.connected')
      : state.kind === 'offline'
        ? t('blockedDevice.offline', { time: dayjs(state.device.lastSeen).fromNow() })
        : state.kind === 'missing'
          ? t('blockedDevice.missing')
          : t('environment.checkingDevice');

  return (
    <Flexbox horizontal align="center" gap={8} style={{ paddingInlineStart: waiting ? INDENT : 0 }}>
      <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
        <Flexbox horizontal align="center" gap={6} style={{ minWidth: 0 }}>
          <span aria-hidden style={{ display: 'inline-flex', flexShrink: 0 }}>
            {getDeviceIcon('device' in state ? state.device.platform : null, 12)}
          </span>
          <Text ellipsis fontSize={12} title={name}>
            {name}
          </Text>
        </Flexbox>
        <Text fontSize={12} role="status" type={state.kind === 'online' ? 'success' : 'secondary'}>
          {presence}
        </Text>
      </Flexbox>
      {retry}
      {onChange && (
        <Button size="small" style={{ flexShrink: 0 }} onClick={onChange}>
          {t('blockedDevice.change')}
        </Button>
      )}
    </Flexbox>
  );
}

/** The device set for the Agent in this Channel, which only Channel admins may read. */
function ChannelEnvironmentDevice({
  channelId,
  fallback,
  member,
  onChange,
  retry,
  waiting,
}: {
  channelId: string;
  fallback: ReactNode;
  member: ChannelPublicMember;
  onChange: () => void;
  retry?: ReactNode;
  waiting?: boolean;
}) {
  const environment = channelActions.useFetchAgentEnvironment(channelId, member.id);
  const deviceId = environment.data?.deviceId;
  return deviceId ? (
    <DeviceRow deviceId={deviceId} retry={retry} waiting={waiting} onChange={onChange} />
  ) : (
    fallback
  );
}

/**
 * The device a reply waits for or failed to reach, under the reply's row. The job names the
 * device when the server knows it; otherwise an admin's view reads the Channel's own setting.
 * `waiting` replies that name no device say they start once the device connects; a failed one
 * offers `retry` beside the device, or on its own when no device can be shown.
 */
export function BlockedDevice({
  channelId,
  deviceId,
  manageable,
  member,
  retry,
  waiting,
}: {
  channelId: string;
  deviceId?: string | null;
  manageable?: boolean;
  member?: ChannelPublicMember;
  retry?: ReactNode;
  waiting?: boolean;
}) {
  const { close } = usePopoverContext();
  const change =
    manageable && member
      ? () => {
          close();
          openChannelAgentEnvironment(channelId, member);
        }
      : undefined;
  const fallback = waiting ? (
    <Hint />
  ) : retry ? (
    <Flexbox horizontal justify="flex-end">
      {retry}
    </Flexbox>
  ) : null;

  if (deviceId)
    return <DeviceRow deviceId={deviceId} retry={retry} waiting={waiting} onChange={change} />;
  if (change && member)
    return (
      <ChannelEnvironmentDevice
        channelId={channelId}
        fallback={fallback}
        member={member}
        retry={retry}
        waiting={waiting}
        onChange={change}
      />
    );
  return fallback;
}
