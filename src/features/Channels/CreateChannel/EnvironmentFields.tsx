import type { SelectOptions } from '@lobehub/ui';
import { Button, Select, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { DeviceListItem } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AsyncError from '@/components/AsyncError';
import {
  deviceSettingsUrl,
  isPrivateWorkspaceDevice,
  privateDevicesSettingsUrl,
} from '@/features/DeviceManager/deviceVisibility';
import { openPickWorkingDirModal } from '@/features/WorkingDirectory';
import type { DeviceListResult } from '@/store/device/useDeviceList';

import { channelAgentIssueKey } from './agentEnvironment';
import type { useChannelAgentDraft } from './useChannelAgentDraft';

const styles = stylex.create({
  directory: { justifyContent: 'flex-start', maxWidth: '100%', overflow: 'hidden' },
  fields: {
    alignItems: 'center',
    columnGap: 12,
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    rowGap: 8,
  },
  label: { color: cssVar.colorTextSecondary, fontSize: 13 },
  link: { color: cssVar.colorInfo, whiteSpace: 'nowrap' },
  note: { gridColumn: 2 },
});

export const deviceLabel = (device: DeviceListItem) =>
  device.friendlyName || device.hostname || device.deviceId;

type DraftControls = ReturnType<typeof useChannelAgentDraft>;

/** The option text for a device that can run here: its name, or why it cannot be picked now. */
const useDeviceOptionLabel = (isConfirmed: boolean) => {
  const { t } = useTranslation('channel');
  return (device: DeviceListItem) => {
    const suffix =
      !isConfirmed || device.onlineUnknown
        ? t('environment.checkingDevice')
        : device.online
          ? ''
          : t('offline');
    return suffix ? `${deviceLabel(device)} · ${suffix}` : deviceLabel(device);
  };
};

/**
 * Private devices are listed, in their own group, but cannot run a Channel Agent: other members'
 * requests never reach them. One quiet line under the field says where to publish them.
 */
const PrivateDevicesNote = ({ devices }: { devices: DeviceListItem[] }) => {
  const { t } = useTranslation(['channel', 'device']);
  return (
    <Text fontSize={12} type="secondary" {...stylex.props(styles.note)}>
      {t('environment.privateDevicesHint')}{' '}
      <a
        href={devices.length === 1 ? deviceSettingsUrl(devices[0]) : privateDevicesSettingsUrl()}
        rel="noopener noreferrer"
        target="_blank"
        {...stylex.props(styles.link)}
      >
        {t('visibility.private.openSettings', { ns: 'device' })}
      </a>
    </Text>
  );
};

/**
 * The device and working directory picked for one Agent in one Channel. There is no empty
 * choice here: following the Agent's own settings is a separate option outside these fields.
 */
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
  const all = devices.data ?? [];
  const privateDevices = all.filter(isPrivateWorkspaceDevice);
  // Private rows are the viewer's own devices; they get their own group below.
  const runnable = all.filter((device) => !isPrivateWorkspaceDevice(device));
  const missingDevice = draft.deviceId && !all.some((item) => item.deviceId === draft.deviceId);
  const canChooseDirectory =
    draft.deviceId &&
    devices.isConfirmed &&
    all.some((item) => item.deviceId === draft.deviceId && item.online && !item.onlineUnknown);

  const options: SelectOptions = [
    ...(missingDevice
      ? [{ disabled: true, label: t('environment.unavailableDevice'), value: draft.deviceId! }]
      : []),
    ...runnable.map((device) => ({
      disabled:
        !devices.isConfirmed ||
        !device.online ||
        !!device.onlineUnknown ||
        (device.scope === 'workspace' && device.visibility !== 'public'),
      label: optionLabel(device),
      value: device.deviceId,
    })),
    ...(privateDevices.length > 0
      ? [
          {
            label: t('environment.privateGroup'),
            options: privateDevices.map((device) => ({
              disabled: true,
              label: deviceLabel(device),
              value: device.deviceId,
            })),
          },
        ]
      : []),
  ];

  return (
    <div {...stylex.props(styles.fields)}>
      <span aria-hidden {...stylex.props(styles.label)}>
        {t('profile.device')}
      </span>
      <Select
        aria-describedby={draft.issue ? `channel-agent-${draft.agentId}-issue` : undefined}
        aria-label={t('environment.deviceLabel', { name })}
        options={options}
        placeholder={t('chooseDevice')}
        popupMatchSelectWidth={false}
        style={{ minWidth: 0, width: '100%' }}
        value={draft.deviceId ?? null}
        onChange={changeDevice}
      />
      {privateDevices.length > 0 && <PrivateDevicesNote devices={privateDevices} />}
      {draft.deviceId && (
        <>
          <span aria-hidden {...stylex.props(styles.label)}>
            {t('profile.directory')}
          </span>
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
        </>
      )}
    </div>
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
