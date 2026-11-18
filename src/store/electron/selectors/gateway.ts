import { type ElectronState } from '@/store/electron/initialState';

import { DESKTOP_SELF_KEY, GATEWAY_STABLE_DEVICE_ID_KEY } from '../projection';

/** This desktop's stable gateway device id; `undefined` until resolved, `null` = none. */
const gatewayStableDeviceId = (s: ElectronState) =>
  s.gatewayStableDeviceIdMap[GATEWAY_STABLE_DEVICE_ID_KEY]?.deviceId;

/** Whether this computer is kept awake while its gateway is enabled; `undefined` until loaded. */
const keepAwake = (s: ElectronState) => s.gatewayKeepAwakeMap[DESKTOP_SELF_KEY];

export const electronGatewaySelectors = {
  gatewayStableDeviceId,
  keepAwake,
};
