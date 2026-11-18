import type { DeviceListItem, DeviceMetricSeries } from '@lobot/types';

import { createReplicaState, type ReplicaState } from '@/libs/replica';

import type { AgentScanResult } from './agentScan';
import type { AgentDeviceBinding } from './projection';

export interface DeviceState {
  /** Each agent's resolved device binding, by agent id; read it through `deviceSelectors.agentDeviceBinding`. */
  agentDeviceBindingMap: Record<string, AgentDeviceBinding>;
  agentDeviceBindingReplica: ReplicaState<AgentDeviceBinding>;
  /** Agent inventories by `agentScanKey`; read them through `deviceSelectors.agentScan`. */
  agentScanMap: Record<string, AgentScanResult>;
  agentScanReplica: ReplicaState<AgentScanResult>;
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
}

export const initialState: DeviceState = {
  agentDeviceBindingMap: {},
  agentDeviceBindingReplica: createReplicaState(),
  agentScanMap: {},
  agentScanReplica: createReplicaState(),
  deviceListMap: {},
  deviceListReplica: createReplicaState(),
  deviceMetricSeriesMap: {},
  deviceMetricSeriesReplica: createReplicaState(),
};
