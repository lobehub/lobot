import { type ElectronState } from '@/store/electron/initialState';

import { DESKTOP_SELF_KEY } from '../projection';

/** The live app menu; `undefined` until loaded. */
const appMenu = (s: ElectronState) => s.appMenuMap[DESKTOP_SELF_KEY];
const debugLoggingSettings = (s: ElectronState) => s.debugLoggingSettingsMap[DESKTOP_SELF_KEY];
/** `undefined` until the main process answers (the store default is not an answer). */
const proxySettings = (s: ElectronState) => (s.isProxySettingsInit ? s.proxySettings : undefined);
const remoteDebuggingSettings = (s: ElectronState) =>
  s.remoteDebuggingSettingsMap[DESKTOP_SELF_KEY];

export const electronSettingsSelectors = {
  appMenu,
  debugLoggingSettings,
  proxySettings,
  remoteDebuggingSettings,
};
