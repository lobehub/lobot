import { isDesktop } from '@lobechat/const';
import {
  type DebugLoggingSettings,
  type NetworkProxySettings,
  type RemoteDebuggingSettings,
  type ShortcutUpdateResult,
} from '@lobechat/electron-client-ipc';
import isEqual from 'fast-deep-equal';

import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { desktopSettingsService } from '@/services/electron/settings';
import { type StoreSetter } from '@/store/types';

import { defaultProxySettings } from '../initialState';
import { selfFieldsLens } from '../lens';
import {
  appTrayVisibleResource,
  debugLoggingSettingsResource,
  DESKTOP_SELF_KEY,
  desktopHotkeysResource,
  proxySettingsResource,
  remoteDebuggingSettingsResource,
} from '../projection';
import { type ElectronStore } from '../store';

/**
 * Settings actions
 */

type Setter = StoreSetter<ElectronStore>;
export const settingsSlice = (set: Setter, get: () => ElectronStore, _api?: unknown) =>
  new ElectronSettingsActionImpl(set, get, _api);

/** An unchanged answer must not re-render the settings forms. */
const keepIfEqual = <T>(incoming: T, confirmed: T | undefined) =>
  isEqual(incoming, confirmed) ? undefined : incoming;

class ElectronSettingsActionImpl {
  readonly #appTrayVisible;
  readonly #debugLogging;
  readonly #desktopHotkeys;
  readonly #get: () => ElectronStore;
  readonly #proxySettings;
  readonly #remoteDebugging;

  constructor(set: Setter, get: () => ElectronStore, _api?: unknown) {
    void _api;
    this.#get = get;
    this.#desktopHotkeys = createReplicaSlice(desktopHotkeysResource, {
      actionPrefix: 'desktopHotkeys',
      fetcher: () => desktopSettingsService.getDesktopHotkeys(),
      get,
      merge: keepIfEqual,
      set,
      stateKey: 'desktopHotkeysReplica',
      view: selfFieldsLens<ElectronStore, Record<string, string>>(
        (s) => (s.isDesktopHotkeysInit ? s.desktopHotkeys : undefined),
        (data) =>
          data
            ? { desktopHotkeys: data, isDesktopHotkeysInit: true }
            : { desktopHotkeys: {}, isDesktopHotkeysInit: false },
      ),
    });
    this.#appTrayVisible = createReplicaSlice(appTrayVisibleResource, {
      actionPrefix: 'appTrayVisible',
      fetcher: () => desktopSettingsService.getAppTrayVisible(),
      get,
      set,
      stateKey: 'appTrayVisibleReplica',
      view: selfFieldsLens<ElectronStore, boolean>(
        (s) => (s.isAppTrayVisibleInit ? s.appTrayVisible : undefined),
        (data) =>
          data === undefined
            ? { appTrayVisible: true, isAppTrayVisibleInit: false }
            : { appTrayVisible: data, isAppTrayVisibleInit: true },
      ),
    });
    this.#proxySettings = createReplicaSlice(proxySettingsResource, {
      actionPrefix: 'proxySettings',
      fetcher: () => desktopSettingsService.getProxySettings(),
      get,
      merge: keepIfEqual,
      set,
      stateKey: 'proxySettingsReplica',
      view: selfFieldsLens<ElectronStore, NetworkProxySettings>(
        (s) => (s.isProxySettingsInit ? s.proxySettings : undefined),
        (data) =>
          data
            ? { isProxySettingsInit: true, proxySettings: data }
            : { isProxySettingsInit: false, proxySettings: defaultProxySettings },
      ),
    });
    this.#debugLogging = createReplicaSlice(debugLoggingSettingsResource, {
      actionPrefix: 'debugLoggingSettings',
      fetcher: () => desktopSettingsService.getDebugLoggingSettings(),
      get,
      set,
      stateKey: 'debugLoggingSettingsReplica',
      view: recordLens<ElectronStore, DebugLoggingSettings>('debugLoggingSettingsMap'),
    });
    this.#remoteDebugging = createReplicaSlice(remoteDebuggingSettingsResource, {
      actionPrefix: 'remoteDebuggingSettings',
      fetcher: () => desktopSettingsService.getRemoteDebuggingSettings(),
      get,
      set,
      stateKey: 'remoteDebuggingSettingsReplica',
      view: recordLens<ElectronStore, RemoteDebuggingSettings>('remoteDebuggingSettingsMap'),
    });
  }

  refreshDesktopHotkeys = async (): Promise<void> => {
    await this.#desktopHotkeys.revalidate();
  };

  refreshAppTrayVisible = async (): Promise<void> => {
    await this.#appTrayVisible.revalidate();
  };

  refreshProxySettings = async (): Promise<void> => {
    await this.#proxySettings.revalidate();
  };

  setAppTrayVisible = async (visible: boolean): Promise<void> => {
    await desktopSettingsService.setAppTrayVisible(visible);
    this.#appTrayVisible.update(DESKTOP_SELF_KEY, () => visible);
    await this.#get().refreshAppTrayVisible();
  };

  /** Turn `debug` log records on or off; the switch follows the main process's answer. */
  setDebugLoggingEnabled = async (enabled: boolean): Promise<void> => {
    const next = await desktopSettingsService.setDebugLoggingEnabled(enabled);
    this.#debugLogging.update(DESKTOP_SELF_KEY, () => next);
  };

  setProxySettings = async (values: Partial<NetworkProxySettings>): Promise<void> => {
    await desktopSettingsService.setSettings(values);
    await this.#get().refreshProxySettings();
  };

  /** Persist the CDP toggle (applies at the next launch); the row follows the main process's answer. */
  setRemoteDebuggingEnabled = async (enabled: boolean): Promise<void> => {
    const next = await desktopSettingsService.setRemoteDebuggingEnabled(enabled);
    this.#remoteDebugging.update(DESKTOP_SELF_KEY, () => next);
  };

  updateDesktopHotkey = async (id: string, accelerator: string): Promise<ShortcutUpdateResult> => {
    try {
      // Update hotkey configuration
      const result = await desktopSettingsService.updateDesktopHotkey(id, accelerator);

      // If update successful, refresh state
      if (result.success) {
        await this.#get().refreshDesktopHotkeys();
      }

      return result;
    } catch (error) {
      console.error('Desktop hotkey update failed:', error);
      return {
        errorType: 'UNKNOWN' as const,
        success: false,
      };
    }
  };

  /** Read it with `electronSettingsSelectors.debugLoggingSettings`. */
  useFetchDebugLoggingSettings = (): ReplicaSyncResult =>
    this.#debugLogging.useSync(isDesktop ? DESKTOP_SELF_KEY : null, { revalidateOnFocus: false });

  useFetchDesktopHotkeys = (): ReplicaSyncResult =>
    // Desktop-only IPC: on web there is no electronAPI, so never fetch off-desktop.
    this.#desktopHotkeys.useSync(isDesktop ? DESKTOP_SELF_KEY : null);

  /** Read it with `electronSettingsSelectors.remoteDebuggingSettings`. */
  useFetchRemoteDebuggingSettings = (): ReplicaSyncResult =>
    this.#remoteDebugging.useSync(isDesktop ? DESKTOP_SELF_KEY : null, {
      revalidateOnFocus: false,
    });

  useGetAppTrayVisible = (enabled = true): ReplicaSyncResult =>
    this.#appTrayVisible.useSync(isDesktop ? DESKTOP_SELF_KEY : null, { enabled });

  /** Read it with `electronSettingsSelectors.proxySettings` (`undefined` until loaded). */
  useGetProxySettings = (): ReplicaSyncResult =>
    this.#proxySettings.useSync(isDesktop ? DESKTOP_SELF_KEY : null);
}

export type ElectronSettingsAction = Pick<
  ElectronSettingsActionImpl,
  keyof ElectronSettingsActionImpl
>;
