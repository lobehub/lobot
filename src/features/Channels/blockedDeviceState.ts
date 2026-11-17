import type { DeviceListItem } from '@lobot/types';

/**
 * Where a reply blocked on its device stands, as far as this viewer's device list can tell:
 * - `checking`: the list is a persisted copy or still loading, so presence is not known yet
 * - `missing`: the configured device is not among the devices this viewer can see
 * - `offline`: the gateway does not see the device; the reply waits for it to connect
 * - `online`: the device is back; the next dispatch round starts the reply
 */
type BlockedDeviceState =
  | { kind: 'checking' }
  | { kind: 'missing' }
  | { device: DeviceListItem; kind: 'offline' | 'online' };

export const blockedDeviceState = (
  deviceId: string,
  devices: DeviceListItem[] | undefined,
  isConfirmed: boolean,
): BlockedDeviceState => {
  const device = devices?.find((item) => item.deviceId === deviceId);
  if (!device) return { kind: isConfirmed ? 'missing' : 'checking' };
  if (!isConfirmed || device.onlineUnknown) return { kind: 'checking' };
  return { device, kind: device.online ? 'online' : 'offline' };
};
