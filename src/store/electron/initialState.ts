import {
  type AppMenuNode,
  type DataSyncConfig,
  type DebugLoggingSettings,
  type ElectronAppState,
  type GatewayConnectionError,
  type GatewayConnectionState,
  type GatewayConnectionStatus,
  type NetworkProxySettings,
  type RemoteDebuggingSettings,
} from '@lobechat/electron-client-ipc';

import { createReplicaState, type ReplicaState } from '@/libs/replica';

import { type CurrentRouteMetaState } from './actions/currentRouteMeta';
import { currentRouteMetaInitialState } from './actions/currentRouteMeta';
import { type GatewayDeviceInfo } from './actions/gateway';
import { type RecentPagesState } from './actions/recentPages';
import { recentPagesInitialState } from './actions/recentPages';
import { type TabPagesState } from './actions/tabPages';
import { tabPagesInitialState } from './actions/tabPages';
import { type GatewayStableDeviceId, type WorkspaceMentionRow } from './projection';

type RemoteServerError = 'CONFIG_ERROR' | 'AUTH_ERROR' | 'DISCONNECT_ERROR';

export const defaultProxySettings: NetworkProxySettings = {
  enableProxy: false,
  proxyBypass: 'localhost, 127.0.0.1, ::1',
  proxyPort: '',
  proxyRequireAuth: false,
  proxyServer: '',
  proxyType: 'http',
};

export const defaultDataSyncConfig: DataSyncConfig = { storageMode: 'cloud' };

export interface ElectronState extends CurrentRouteMetaState, RecentPagesState, TabPagesState {
  /** Replica view of the live app menu (`DESKTOP_SELF_KEY`). */
  appMenuMap: Record<string, AppMenuNode[]>;
  appMenuReplica: ReplicaState<AppMenuNode[]>;
  appState: ElectronAppState;
  /** Replica bookkeeping of `appState` (view gated by `isAppStateInit`). */
  appStateReplica: ReplicaState<ElectronAppState>;
  appTrayVisible: boolean;
  /** Replica bookkeeping of `appTrayVisible` (view gated by `isAppTrayVisibleInit`). */
  appTrayVisibleReplica: ReplicaState<boolean>;
  dataSyncConfig: DataSyncConfig;
  /** Replica bookkeeping of `dataSyncConfig` (view gated by `isInitRemoteServerConfig`). */
  dataSyncConfigReplica: ReplicaState<DataSyncConfig>;
  /** Replica view of the debug-logging setting (`DESKTOP_SELF_KEY`). */
  debugLoggingSettingsMap: Record<string, DebugLoggingSettings>;
  debugLoggingSettingsReplica: ReplicaState<DebugLoggingSettings>;
  desktopHotkeys: Record<string, string>;
  /** Replica bookkeeping of `desktopHotkeys` (view gated by `isDesktopHotkeysInit`). */
  desktopHotkeysReplica: ReplicaState<Record<string, string>>;
  /** Why the last connection attempt ended, as reported by the main process. */
  gatewayConnectionError?: GatewayConnectionError;
  /** Replica bookkeeping of `gatewayConnectionStatus` + `gatewayConnectionError`. */
  gatewayConnectionStateReplica: ReplicaState<GatewayConnectionState>;
  gatewayConnectionStatus: GatewayConnectionStatus;
  gatewayDeviceInfo?: GatewayDeviceInfo;
  /** Replica bookkeeping of `gatewayDeviceInfo`. */
  gatewayDeviceInfoReplica: ReplicaState<GatewayDeviceInfo>;
  /** Replica view of the keep-awake setting (`DESKTOP_SELF_KEY`). */
  gatewayKeepAwakeMap: Record<string, boolean>;
  gatewayKeepAwakeReplica: ReplicaState<boolean>;
  /** Replica view of this desktop's stable gateway device id (`GATEWAY_STABLE_DEVICE_ID_KEY`). */
  gatewayStableDeviceIdMap: Record<string, GatewayStableDeviceId>;
  /** Replica bookkeeping of `gatewayStableDeviceIdMap`. */
  gatewayStableDeviceIdReplica: ReplicaState<GatewayStableDeviceId>;
  isAppStateInit?: boolean;
  isAppTrayVisibleInit: boolean;
  isConnectingServer?: boolean;
  isConnectionDrawerOpen?: boolean;
  isDesktopHotkeysInit: boolean;
  isInitRemoteServerConfig: boolean;
  isProxySettingsInit: boolean;
  isSyncActive?: boolean;
  proxySettings: NetworkProxySettings;
  /** Replica bookkeeping of `proxySettings` (view gated by `isProxySettingsInit`). */
  proxySettingsReplica: ReplicaState<NetworkProxySettings>;
  /** Replica view of the remote-debugging (CDP) setting (`DESKTOP_SELF_KEY`). */
  remoteDebuggingSettingsMap: Record<string, RemoteDebuggingSettings>;
  remoteDebuggingSettingsReplica: ReplicaState<RemoteDebuggingSettings>;
  remoteServerSyncError?: { message?: string; type: RemoteServerError };
  /** Replica view of each workspace's unread mentions, keyed by workspace id. */
  workspaceMentionsMap: Record<string, WorkspaceMentionRow[]>;
  workspaceMentionsReplica: ReplicaState<WorkspaceMentionRow[]>;
}

export const initialState: ElectronState = {
  ...currentRouteMetaInitialState,
  ...recentPagesInitialState,
  ...tabPagesInitialState,
  appMenuMap: {},
  appMenuReplica: createReplicaState(),
  appState: {},
  appStateReplica: createReplicaState(),
  appTrayVisible: true,
  appTrayVisibleReplica: createReplicaState(),
  dataSyncConfig: defaultDataSyncConfig,
  dataSyncConfigReplica: createReplicaState(),
  debugLoggingSettingsMap: {},
  debugLoggingSettingsReplica: createReplicaState(),
  desktopHotkeys: {},
  desktopHotkeysReplica: createReplicaState(),
  gatewayConnectionStateReplica: createReplicaState(),
  gatewayConnectionStatus: 'disconnected',
  gatewayDeviceInfoReplica: createReplicaState(),
  gatewayKeepAwakeMap: {},
  gatewayKeepAwakeReplica: createReplicaState(),
  gatewayStableDeviceIdMap: {},
  gatewayStableDeviceIdReplica: createReplicaState(),
  isAppStateInit: false,
  isAppTrayVisibleInit: false,
  isConnectingServer: false,
  isConnectionDrawerOpen: false,
  isDesktopHotkeysInit: false,
  isInitRemoteServerConfig: false,
  isProxySettingsInit: false,
  isSyncActive: false,
  proxySettings: defaultProxySettings,
  proxySettingsReplica: createReplicaState(),
  remoteDebuggingSettingsMap: {},
  remoteDebuggingSettingsReplica: createReplicaState(),
  workspaceMentionsMap: {},
  workspaceMentionsReplica: createReplicaState(),
};
