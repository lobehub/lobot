import type { DeviceListItem, LobeAgentAgencyConfig } from '@lobot/types';
import { defaultChannelAgentDirectory } from '@lobot/types';

export interface ProfileEnvironment {
  deviceId?: string;
  directory?: string;
  /** `channel`: picked for this conversation; `agent`: the Agent's own settings decide. */
  source: 'agent' | 'channel';
}

/**
 * Where a direct conversation's Agent runs, as its profile shows it. A device picked in the
 * Channel wins, as it does for the run; otherwise the Agent runs where its own settings route
 * it (`bindingDeviceId`, resolved by the server), starting in its per-device directory or the
 * device's default one.
 */
export const profileEnvironment = ({
  agencyConfig,
  bindingDeviceId,
  channel,
  devices,
}: {
  agencyConfig?: LobeAgentAgencyConfig;
  bindingDeviceId?: string | null;
  channel?: { deviceId?: string; workingDirectory?: string };
  devices?: Pick<DeviceListItem, 'defaultCwd' | 'deviceId'>[];
}): ProfileEnvironment => {
  const defaultCwd = (deviceId: string) =>
    devices?.find((device) => device.deviceId === deviceId)?.defaultCwd?.trim() || undefined;

  if (channel?.deviceId)
    return {
      deviceId: channel.deviceId,
      // Without a directory the run starts in the device's default folder.
      directory: channel.workingDirectory?.trim() || defaultCwd(channel.deviceId),
      source: 'channel',
    };

  if (!bindingDeviceId) return { source: 'agent' };
  return {
    deviceId: bindingDeviceId,
    directory: defaultChannelAgentDirectory(
      agencyConfig,
      bindingDeviceId,
      defaultCwd(bindingDeviceId),
    ),
    source: 'agent',
  };
};
