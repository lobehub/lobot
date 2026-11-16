import type { DeviceListItem } from '@lobot/types';

import { webAppUrl } from '@/features/Electron/navigation/webApp';

type VisibilityFields = Pick<DeviceListItem, 'scope' | 'visibility'>;

/**
 * A workspace device its enroller kept private. Only that member sees it, and only their own
 * runs reach it: other members cannot use an Agent bound to it. A private row in a viewer's
 * list is therefore always the viewer's own enrollment.
 */
export const isPrivateWorkspaceDevice = (device: VisibilityFields) =>
  device.scope === 'workspace' && device.visibility === 'private';

/**
 * The device's own page in the LobeHub web app settings, on the pool it belongs to. Lobot has
 * no device settings: the enroller changes the visibility there. The workspace prefix comes
 * from `webAppUrl`, which knows the active workspace.
 */
export const deviceSettingsPath = (device: Pick<DeviceListItem, 'deviceId'> & VisibilityFields) =>
  `/settings/devices/${encodeURIComponent(device.deviceId)}${
    isPrivateWorkspaceDevice(device) ? '?visibility=private' : ''
  }`;

export const deviceSettingsUrl = (device: Pick<DeviceListItem, 'deviceId'> & VisibilityFields) =>
  webAppUrl(deviceSettingsPath(device));

/** The caller's private devices in the active workspace, where each can be published. */
export const privateDevicesSettingsUrl = () => webAppUrl('/settings/devices?visibility=private');
