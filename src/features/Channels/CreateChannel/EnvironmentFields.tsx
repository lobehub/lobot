import { Button, Flexbox, Select, Text } from '@lobehub/ui';
import type { DeviceListItem } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AsyncError from '@/components/AsyncError';
import {
  isPrivateWorkspaceDevice,
  privateDevicesSettingsUrl,
} from '@/features/DeviceManager/deviceVisibility';
import {
  DeviceSettingsLink,
  PrivateDeviceSettingsLink,
} from '@/features/DeviceManager/PrivateDeviceNotice';
import { openPickWorkingDirModal } from '@/features/WorkingDirectory';
import type { DeviceListResult } from '@/store/device/useDeviceList';

import { channelAgentIssueKey } from './agentEnvironment';
import type { useChannelAgentDraft } from './useChannelAgentDraft';

const styles = stylex.create({
  directory: { maxWidth: '100%', overflow: 'hidden' },
});

export const deviceLabel = (device: DeviceListItem) =>
  device.friendlyName || device.hostname || device.deviceId;

type DraftControls = ReturnType<typeof useChannelAgentDraft>;

/** The option text for a device: why it cannot be picked, or its presence. */
const useDeviceOptionLabel = (isConfirmed: boolean) => {
  const { t } = useTranslation(['channel', 'device']);
  return (device: DeviceListItem) => {
    const suffix = isPrivateWorkspaceDevice(device)
      ? t('visibility.private.badge', { ns: 'device' })
      : !isConfirmed || device.onlineUnknown
        ? t('environment.checkingDevice')
        : device.online
          ? ''
          : t('offline');
    return suffix ? `${deviceLabel(device)} · ${suffix}` : deviceLabel(device);
  };
};

/**
 * Private devices are listed but cannot run a Channel Agent: other members' requests never reach
 * them. Points the owner at where to publish them, the device itself when there is only one.
 */
const PrivateDevicesHint = ({ devices }: { devices: DeviceListItem[] }) => {
  const { t } = useTranslation('channel');
  return (
    <Flexbox horizontal align="center" gap={8}>
      <Text fontSize={12} style={{ flex: 1, minWidth: 0 }} type="secondary">
        {t('environment.privateDevicesHint')}
      </Text>
      {devices.length === 1 ? (
        <PrivateDeviceSettingsLink device={devices[0]} />
      ) : (
        <DeviceSettingsLink href={privateDevicesSettingsUrl()} />
      )}
    </Flexbox>
  );
};

/** Device and working directory for one Agent in one Channel. */
export const EnvironmentFields = ({
  controls: { change, changeDevice, draft },
  devices,
  name,
}: {
  controls: DraftControls;
  devices: DeviceListResult;
  name: string;
}) => {
  const { t } = useTranslation('channel');
  const optionLabel = useDeviceOptionLabel(devices.isConfirmed);
  const privateDevices = (devices.data ?? []).filter(isPrivateWorkspaceDevice);
  const missingDevice =
    draft.deviceId && !devices.data?.some((item) => item.deviceId === draft.deviceId);
  const canChooseDirectory =
    draft.deviceId &&
    devices.isConfirmed &&
    devices.data?.some(
      (item) => item.deviceId === draft.deviceId && item.online && !item.onlineUnknown,
    );

  return (
    <>
      <Select
        aria-describedby={draft.issue ? `channel-agent-${draft.agentId}-issue` : undefined}
        aria-label={t('environment.deviceLabel', { name })}
        placeholder={t('environment.followAgent')}
        popupMatchSelectWidth={false}
        style={{ minWidth: 0, width: '100%' }}
        value={draft.deviceId ?? ''}
        options={[
          // No device is the default: the Agent runs where its own settings say.
          { label: t('environment.followAgent'), value: '' },
          ...(missingDevice
            ? [
                {
                  disabled: true,
                  label: t('environment.unavailableDevice'),
                  value: draft.deviceId!,
                },
              ]
            : []),
          ...(devices.data ?? []).map((device) => ({
            disabled:
              !devices.isConfirmed ||
              !device.online ||
              !!device.onlineUnknown ||
              (device.scope === 'workspace' && device.visibility !== 'public'),
            label: optionLabel(device),
            value: device.deviceId,
          })),
        ]}
        onChange={changeDevice}
      />
      {privateDevices.length > 0 && <PrivateDevicesHint devices={privateDevices} />}
      {draft.deviceId && (
        <Button
          aria-label={t('environment.directoryLabel', { name })}
          disabled={!canChooseDirectory}
          icon={FolderOpen}
          title={draft.workingDirectory || t('chooseDirectory')}
          {...stylex.props(styles.directory)}
          onClick={() =>
            openPickWorkingDirModal({
              defaultPath: draft.workingDirectory,
              deviceId: draft.deviceId,
              onPick: ({ path }) => change({ workingDirectory: path }),
            })
          }
        >
          <Text ellipsis>{draft.workingDirectory || t('chooseDirectory')}</Text>
        </Button>
      )}
    </>
  );
};

/** Why an Agent cannot be saved yet, or that its settings are still loading. */
export const EnvironmentIssue = ({
  controls: { draft, retry, sync },
  inherited,
}: {
  controls: DraftControls;
  /** The Agent's own device and directory apply; there is nothing to pick here. */
  inherited?: boolean;
}) => {
  const { t } = useTranslation('channel');
  if (draft.issue === 'configurationFailed')
    return (
      <AsyncError
        error={sync.error}
        retrying={sync.isValidating}
        title={t('environment.configurationFailed')}
        variant="inline"
        onRetry={() => void retry()}
      />
    );
  if (!draft.issue) return null;
  const checking = draft.issue === 'configurationLoading' || draft.issue === 'devicesLoading';
  return (
    <Text
      fontSize={12}
      id={`channel-agent-${draft.agentId}-issue`}
      role="status"
      type={checking ? 'secondary' : 'danger'}
    >
      {t(channelAgentIssueKey(draft.issue, inherited))}
    </Text>
  );
};
