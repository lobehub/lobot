import {
  type NetworkProxySettings,
  type ShortcutUpdateResult,
  type WindowsShellMode,
} from '@lobechat/electron-client-ipc';

import { ensureElectronIpc } from '@/utils/electron/ipc';

class DesktopSettingsService {
  /**
   * Get app tray visibility
   */
  getAppTrayVisible = async () => {
    return ensureElectronIpc().tray.getAppTrayVisible();
  };

  /**
   * Get the Debug logs setting (Settings → About)
   */
  getDebugLoggingSettings = async () => {
    return ensureElectronIpc().system.getDebugLoggingSettings();
  };

  /**
   * Turn `debug` records in `<userData>/logs/*.jsonl` on or off for packaged builds
   */
  setDebugLoggingEnabled = async (enabled: boolean) => {
    return ensureElectronIpc().system.setDebugLoggingEnabled(enabled);
  };

  /**
   * Get the Remote debugging setting (Settings → About)
   */
  getRemoteDebuggingSettings = async () => {
    return ensureElectronIpc().system.getRemoteDebuggingSettings();
  };

  /**
   * Persist the CDP toggle; it applies at the next launch
   */
  setRemoteDebuggingEnabled = async (enabled: boolean) => {
    return ensureElectronIpc().system.setRemoteDebuggingEnabled(enabled);
  };

  /**
   * Reveal the desktop log directory in the system file manager
   */
  openLogDirectory = async () => {
    return ensureElectronIpc().system.openLogDirectory();
  };

  /**
   * Get proxy settings
   */
  getProxySettings = async () => {
    return ensureElectronIpc().networkProxy.getDesktopSettings();
  };

  /**
   * Set proxy settings
   */
  setSettings = async (data: Partial<NetworkProxySettings>) => {
    return ensureElectronIpc().networkProxy.setProxySettings(data);
  };

  /**
   * Set app tray visibility
   */
  setAppTrayVisible = async (visible: boolean) => {
    return ensureElectronIpc().tray.setAppTrayVisible(visible);
  };

  /**
   * Get desktop hotkey configuration
   */
  getDesktopHotkeys = async () => {
    return ensureElectronIpc().shortcut.getShortcutsConfig();
  };

  /**
   * Update desktop hotkey configuration
   */
  updateDesktopHotkey = async (id: string, accelerator: string): Promise<ShortcutUpdateResult> => {
    return ensureElectronIpc().shortcut.updateShortcutConfig({ accelerator, id });
  };

  /**
   * Test specified proxy configuration
   */
  testProxyConfig = async (config: NetworkProxySettings, testUrl?: string) => {
    return ensureElectronIpc().networkProxy.testProxyConfig({ config, testUrl });
  };
}

export const desktopSettingsService = new DesktopSettingsService();
