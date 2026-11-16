import { Button, Flexbox, Text, usePopoverContext } from '@lobehub/ui';
import type { ChannelPublicMember } from '@lobot/types';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { isPrivateWorkspaceDevice } from '@/features/DeviceManager/deviceVisibility';
import { getDeviceIcon } from '@/features/DeviceManager/getDeviceIcon';
import { PrivateDeviceSettingsLink } from '@/features/DeviceManager/PrivateDeviceNotice';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
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

interface DeviceRowProps {
  deviceId: string;
  onChange?: () => void;
  /**
   * Show the device only when the viewer's list explains why the Agent cannot use it: the
   * viewer's own private device, or one not shared with them. For a reply blocked for a reason
   * other than its device being offline, presence alone would not say why.
   */
  restrictedOnly?: boolean;
  retry?: ReactNode;
  waiting?: boolean;
}

/**
 * A device, what the device gateway sees of it now, and a way to move the Agent elsewhere.
 * Only a waiting reply starts once its device is online; a failed one never does.
 *
 * A private workspace device runs only its enroller's requests. Its owner sees it online while
 * other members' replies on it wait or fail, so the row says why and links to the device's
 * page in LobeHub, where it can be published to the workspace.
 */
function DeviceRow({ deviceId, onChange, restrictedOnly, retry, waiting }: DeviceRowProps) {
  const { t } = useTranslation('channel');
  const devices = useDeviceList({ refreshInterval: 15_000 });
  const state = blockedDeviceState(deviceId, devices.data, devices.isConfirmed);
  const privateDevice =
    'device' in state && isPrivateWorkspaceDevice(state.device) ? state.device : undefined;
  if (restrictedOnly && !privateDevice && state.kind !== 'missing') return null;

  const name = 'device' in state ? deviceLabel(state.device) : t('environment.unavailableDevice');
  const presence =
    state.kind === 'online'
      ? // Only the owner's own replies start on a private device; others' never will.
        t(
          waiting && !privateDevice && !restrictedOnly
            ? 'blockedDevice.online'
            : 'blockedDevice.connected',
        )
      : state.kind === 'offline'
        ? t('blockedDevice.offline', { time: dayjs(state.device.lastSeen).fromNow() })
        : state.kind === 'missing'
          ? t('blockedDevice.notShared')
          : t('environment.checkingDevice');

  return (
    <Flexbox gap={6} style={{ paddingInlineStart: waiting ? INDENT : 0 }}>
      <Flexbox horizontal align="center" gap={8}>
        <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
          <Flexbox horizontal align="center" gap={6} style={{ minWidth: 0 }}>
            <span aria-hidden style={{ display: 'inline-flex', flexShrink: 0 }}>
              {getDeviceIcon('device' in state ? state.device.platform : null, 12)}
            </span>
            <Text ellipsis fontSize={12} title={name}>
              {name}
            </Text>
          </Flexbox>
          <Text
            fontSize={12}
            role="status"
            type={state.kind === 'online' ? 'success' : 'secondary'}
          >
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
      {privateDevice && (
        <Flexbox horizontal align="center" gap={8}>
          <Text fontSize={12} style={{ flex: 1, minWidth: 0 }} type="warning">
            {t('blockedDevice.private')}
          </Text>
          <PrivateDeviceSettingsLink device={privateDevice} />
        </Flexbox>
      )}
    </Flexbox>
  );
}

/** The device set for the Agent in this Channel, which only Channel admins may read. */
function ChannelEnvironmentDevice({
  channelId,
  fallback,
  member,
  ...row
}: Omit<DeviceRowProps, 'deviceId'> & {
  channelId: string;
  fallback: ReactNode;
  member: ChannelPublicMember;
}) {
  channelActions.useFetchAgentEnvironment(channelId, member.id);
  const deviceId = useChannelStore(
    (s) => channelSelectors.agentEnvironment({ channelId, memberId: member.id })(s)?.deviceId,
  );
  return deviceId ? <DeviceRow deviceId={deviceId} {...row} /> : fallback;
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
  restrictedOnly,
  retry,
  waiting,
}: Pick<DeviceRowProps, 'restrictedOnly' | 'retry' | 'waiting'> & {
  channelId: string;
  deviceId?: string | null;
  manageable?: boolean;
  member?: ChannelPublicMember;
}) {
  const { close } = usePopoverContext();
  const change =
    manageable && member
      ? () => {
          close();
          openChannelAgentEnvironment(channelId, member);
        }
      : undefined;
  // A reply blocked for another reason must not promise it starts once the device connects.
  const fallback = restrictedOnly ? null : waiting ? (
    <Hint />
  ) : retry ? (
    <Flexbox horizontal justify="flex-end">
      {retry}
    </Flexbox>
  ) : null;

  const row = { onChange: change, restrictedOnly, retry, waiting };
  if (deviceId) return <DeviceRow deviceId={deviceId} {...row} />;
  if (change && member)
    return (
      <ChannelEnvironmentDevice
        channelId={channelId}
        fallback={fallback}
        member={member}
        {...row}
      />
    );
  return fallback;
}
