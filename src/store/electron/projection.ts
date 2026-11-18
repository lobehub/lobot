import {
  type AppMenuNode,
  type DataSyncConfig,
  type DebugLoggingSettings,
  type ElectronAppState,
  type GatewayConnectionState,
  type NetworkProxySettings,
  type RemoteDebuggingSettings,
} from '@lobechat/electron-client-ipc';

import { defineReplica, identityOnlyScope, type ReplicaScope } from '@/libs/replica';
import type { notificationService } from '@/services/notification';

import type { GatewayDeviceInfo } from './actions/gateway';

/** This machine has one stable gateway device id, so the replica has one entry. */
export const GATEWAY_STABLE_DEVICE_ID_KEY = 'self';

/** `deviceId: null` = the desktop could not resolve one (signed out of the gateway). */
export interface GatewayStableDeviceId {
  deviceId: string | null;
}

/**
 * This desktop's stable gateway device id. Unlike `gatewayDeviceInfo`, which
 * holds the install's fallback UUID until the gateway connects, this is the
 * user-scoped id the server keys devices by. It paints from local storage on a
 * reload and is re-derived over IPC behind it.
 */
export const gatewayStableDeviceIdResource = defineReplica<string, GatewayStableDeviceId>({
  key: (key) => key,
  name: 'electronGatewayStableDeviceId',
  storage: 'localStorage',
  version: 1,
});

/**
 * Settings the desktop main process keeps for the whole machine (hotkeys, proxy,
 * tray, diagnostics, app state). They do not follow the signed-in user or the
 * active workspace, so they live in one fixed scope: a sign-in or workspace
 * switch neither clears them nor repaints an empty default.
 */
const DESKTOP_DEVICE_SCOPE = 'desktop-device';
export const desktopDeviceScope: ReplicaScope = {
  canPersist: () => true,
  get: () => DESKTOP_DEVICE_SCOPE,
  use: () => DESKTOP_DEVICE_SCOPE,
};

/** Each machine-wide desktop replica holds one entry. */
export const DESKTOP_SELF_KEY = 'self';

const defineDesktopReplica = <TData>(name: string, storage: 'indexedDB' | 'memory' = 'indexedDB') =>
  defineReplica<string, TData>({
    key: (key) => key,
    name,
    scope: desktopDeviceScope,
    storage,
    version: 1,
  });

export const electronAppStateResource = defineDesktopReplica<ElectronAppState>('electronAppState');

export const electronAppMenuResource = defineDesktopReplica<AppMenuNode[]>('electronAppMenu');

export const desktopHotkeysResource =
  defineDesktopReplica<Record<string, string>>('electronDesktopHotkeys');

export const appTrayVisibleResource = defineDesktopReplica<boolean>('electronAppTrayVisible');

export const proxySettingsResource =
  defineDesktopReplica<NetworkProxySettings>('electronProxySettings');

export const debugLoggingSettingsResource = defineDesktopReplica<DebugLoggingSettings>(
  'electronDebugLoggingSettings',
);

export const remoteDebuggingSettingsResource = defineDesktopReplica<RemoteDebuggingSettings>(
  'electronRemoteDebuggingSettings',
);

export const gatewayKeepAwakeResource = defineDesktopReplica<boolean>('electronGatewayKeepAwake');

/**
 * The remote-server (data sync) config. Memory only: it gates sign-in and data
 * refresh flows (auto OIDC, `refreshUserData` on a change), which must act on
 * the main process's answer, never on a persisted copy from a previous launch.
 */
export const dataSyncConfigResource = defineDesktopReplica<DataSyncConfig>(
  'electronDataSyncConfig',
  'memory',
);

/** Live gateway connection state of this process. Memory only: it is per-process and transient. */
export const gatewayConnectionStateResource = defineDesktopReplica<GatewayConnectionState>(
  'electronGatewayConnectionState',
  'memory',
);

/**
 * Device info the gateway knows this machine by. Its id is derived per user
 * once the gateway connects, so it is partitioned by identity, not per machine.
 */
export const gatewayDeviceInfoResource = defineReplica<string, GatewayDeviceInfo>({
  key: (key) => key,
  name: 'electronGatewayDeviceInfo',
  scope: identityOnlyScope,
  storage: 'indexedDB',
  version: 1,
});

export type WorkspaceMentionRow = Awaited<ReturnType<typeof notificationService.list>>[number];

/**
 * Unread `mention` inbox rows of a workspace, polled for the desktop mention
 * banner. One entry per workspace; the replica scope carries the workspace too.
 */
export const workspaceMentionsResource = defineReplica<string, WorkspaceMentionRow[]>({
  key: (workspaceId) => workspaceId,
  name: 'electronWorkspaceMentions',
  storage: 'indexedDB',
  version: 1,
});
