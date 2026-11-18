import type { DeviceSandboxCapabilityResult } from '@lobechat/electron-client-ipc';
import type { DeviceListItem, DeviceMetricSeries, DeviceRunningSummary } from '@lobot/types';

import { createReplicaState, type ReplicaPagedData, type ReplicaState } from '@/libs/replica';

import type { AgentScanResult } from './agentScan';
import type {
  AgentDeviceBinding,
  DeviceDirectoryCursor,
  DeviceDirectoryPage,
  DeviceHomePath,
  LocalRepoType,
} from './projection';

export type DeviceDirectoryListing = ReplicaPagedData<DeviceDirectoryPage, DeviceDirectoryCursor>;

export interface DeviceState {
  /** Each agent's resolved device binding, by agent id; read it through `deviceSelectors.agentDeviceBinding`. */
  agentDeviceBindingMap: Record<string, AgentDeviceBinding>;
  agentDeviceBindingReplica: ReplicaState<AgentDeviceBinding>;
  /** Agent inventories by `agentScanKey`; read them through `deviceSelectors.agentScan`. */
  agentScanMap: Record<string, AgentScanResult>;
  agentScanReplica: ReplicaState<AgentScanResult>;
  /** Directory picker listings by `deviceDirectoryKey`; each item is one page. */
  deviceDirectoryMap: Record<string, DeviceDirectoryListing>;
  deviceDirectoryReplica: ReplicaState<DeviceDirectoryListing>;
  /** A remote device's reported home directory, by device id. */
  deviceHomePathMap: Record<string, DeviceHomePath>;
  deviceHomePathReplica: ReplicaState<DeviceHomePath>;
  /**
   * `deviceListMap.all`: every device of the active scope, or `undefined` until
   * the persisted copy or the server answers. Read it through `deviceSelectors`.
   */
  deviceListMap: Record<string, DeviceListItem[]>;
  /** Replica bookkeeping for `deviceListMap`. */
  deviceListReplica: ReplicaState<DeviceListItem[]>;
  /** Health series per `deviceMetricSeriesKey`; read it through `deviceSelectors.getMetricSeries`. */
  deviceMetricSeriesMap: Record<string, DeviceMetricSeries>;
  /** Replica bookkeeping for `deviceMetricSeriesMap`. */
  deviceMetricSeriesReplica: ReplicaState<DeviceMetricSeries>;
  /** `deviceRunningSummaryMap.all`: running topics per device, for the device cards. */
  deviceRunningSummaryMap: Record<string, DeviceRunningSummary[]>;
  deviceRunningSummaryReplica: ReplicaState<DeviceRunningSummary[]>;
  /** Repo type of a directory on this machine, by path. */
  localRepoTypeMap: Record<string, LocalRepoType>;
  localRepoTypeReplica: ReplicaState<LocalRepoType>;
  /** `localSandboxCapabilityMap.local`: whether this desktop can fence commands. */
  localSandboxCapabilityMap: Record<string, DeviceSandboxCapabilityResult>;
  localSandboxCapabilityReplica: ReplicaState<DeviceSandboxCapabilityResult>;
}

export const initialState: DeviceState = {
  agentDeviceBindingMap: {},
  agentDeviceBindingReplica: createReplicaState(),
  agentScanMap: {},
  agentScanReplica: createReplicaState(),
  deviceDirectoryMap: {},
  deviceDirectoryReplica: createReplicaState(),
  deviceHomePathMap: {},
  deviceHomePathReplica: createReplicaState(),
  deviceListMap: {},
  deviceListReplica: createReplicaState(),
  deviceMetricSeriesMap: {},
  deviceMetricSeriesReplica: createReplicaState(),
  deviceRunningSummaryMap: {},
  deviceRunningSummaryReplica: createReplicaState(),
  localRepoTypeMap: {},
  localRepoTypeReplica: createReplicaState(),
  localSandboxCapabilityMap: {},
  localSandboxCapabilityReplica: createReplicaState(),
};
