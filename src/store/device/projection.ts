import type { DeviceSandboxCapabilityResult } from '@lobechat/electron-client-ipc';
import type {
  DeviceDirectoryBrowseResult,
  DeviceListItem,
  DeviceMetricSeries,
  DeviceRunningSummary,
  DeviceScope,
} from '@lobot/types';

import {
  AppLocalStorage,
  definePagedReplica,
  defineReplica,
  REPLICA_INDEX_KEY,
  type ReplicaStorage,
} from '@/libs/replica';

import { AGENT_DEVICE_BINDING_REPLICA } from './agentDeviceBinding';
import type { AgentScanResult, LocalAgentScanProbe } from './agentScan';

/** The store reads every device of the active scope, so the list has one entry. */
export const DEVICE_LIST_KEY = 'all';

export type DeviceListParams = Record<string, never>;

/** Upper bound on persisted device rows — the snapshot must stay a small shell. */
const MAX_PERSISTED_DEVICES = 50;

/**
 * A persisted device row keeps what the UI needs to name the device and
 * resolve its working directory (name, platform, `defaultCwd`, `workingDirs`).
 * Presence is a live gateway fact, so it never reaches storage: `online` is
 * stored as `false`, the live `channels` are dropped, and `onlineUnknown` marks
 * the row until the next `listDevices` replaces it.
 */
const toPersistedDevice = (device: DeviceListItem): DeviceListItem => ({
  ...device,
  channels: [],
  online: false,
  onlineUnknown: true,
});

/**
 * localStorage, with the device rows reshaped by {@link toPersistedDevice} on
 * write. Memory keeps the confirmed presence; only what survives a reload is
 * narrowed. The engine's own index row passes through untouched.
 */
const createDeviceListStorage = (namespace: string): ReplicaStorage<DeviceListItem[]> => {
  const storage = new AppLocalStorage<DeviceListItem[]>({ namespace });

  return {
    get: storage.get,
    getStrict: storage.getStrict,
    remove: storage.remove,
    set: (key, row) =>
      storage.set(
        key,
        key.queryKey === REPLICA_INDEX_KEY
          ? row
          : { ...row, data: row.data.slice(0, MAX_PERSISTED_DEVICES).map(toPersistedDevice) },
      ),
  };
};

/**
 * Every device of the active scope (`deviceListMap.all`). Persisted per user +
 * workspace so a reload names the bound device and resolves its cwd on first
 * paint; presence stays unknown until the server answers.
 */
export const deviceListResource = defineReplica<DeviceListParams, DeviceListItem[]>({
  key: () => DEVICE_LIST_KEY,
  name: 'deviceList',
  storage: createDeviceListStorage('replica:deviceList:v1'),
  version: 1,
});

export interface DeviceMetricSeriesParams {
  deviceId: string;
  /** The list row's scope: a deviceId enrolled both personally and in the workspace reads the row it was listed as. */
  scope?: DeviceScope;
}

export const deviceMetricSeriesKey = ({ deviceId, scope }: DeviceMetricSeriesParams) =>
  `${scope ?? 'default'}:${deviceId}`;

/**
 * A device's CPU / memory / load over the recent window, one entry per device.
 * Persisted so the device page and hover panel chart history on first paint;
 * the newest reading of a persisted copy is old by however long the app was
 * closed, so "current load" readers judge it by wall-clock age, never by
 * presence of data. Bounded: a device grid persists one row per device seen.
 */
export const deviceMetricSeriesResource = defineReplica<
  DeviceMetricSeriesParams,
  DeviceMetricSeries
>({
  key: deviceMetricSeriesKey,
  name: 'deviceMetricSeries',
  persist: { maxEntries: 20 },
  storage: 'indexedDB',
  version: 1,
});

/** The device an agent runs on for the caller (`null`: it routes to no device). */
export interface AgentDeviceBinding {
  deviceId: string | null;
}

/** One agent's resolved device binding, keyed by agent id. */
export const agentDeviceBindingResource = defineReplica<{ agentId: string }, AgentDeviceBinding>({
  key: ({ agentId }) => agentId,
  name: AGENT_DEVICE_BINDING_REPLICA,
  persist: { maxEntries: 50 },
  storage: 'indexedDB',
  version: 1,
});

/** The running-summary list covers every device of the scope, so it has one entry. */
export const DEVICE_RUNNING_SUMMARY_KEY = 'all';

/** Running-topic counts (and who started them) for every device the caller can see. */
export const deviceRunningSummaryResource = defineReplica<
  Record<string, never>,
  DeviceRunningSummary[]
>({
  key: () => DEVICE_RUNNING_SUMMARY_KEY,
  name: 'deviceRunningSummary',
  storage: 'indexedDB',
  version: 1,
});

/** What the store keeps of a device's system info: only the home directory is read. */
export interface DeviceHomePath {
  homePath: string | null;
}

/** A remote device's reported home directory, one entry per device id. */
export const deviceHomePathResource = defineReplica<string, DeviceHomePath>({
  key: (deviceId) => deviceId,
  name: 'deviceHomePath',
  persist: { maxEntries: 20 },
  storage: 'indexedDB',
  version: 1,
});

/** Repo type of a directory on this machine (`null` = not a repository). */
export interface LocalRepoType {
  repoType: 'git' | 'github' | null;
}

/** The desktop's repo-type probe, one entry per local path. */
export const localRepoTypeResource = defineReplica<string, LocalRepoType>({
  key: (path) => path,
  name: 'localRepoType',
  persist: { maxEntries: 50 },
  storage: 'indexedDB',
  version: 1,
});

/** A gateway device's agent inventory, or this desktop's (`local`, probed over IPC). */
export type AgentScanParams = { deviceId: string } | { local: LocalAgentScanProbe[] };

export const agentScanKey = (params: AgentScanParams) =>
  'deviceId' in params ? `device:${params.deviceId}` : 'local';

/** A live probe: kept in memory only, and re-run whenever a wizard opens on the target. */
export const agentScanResource = defineReplica<AgentScanParams, AgentScanResult>({
  key: agentScanKey,
  name: 'agentScan',
  storage: 'memory',
  version: 1,
});

/** This machine is the only one the sandbox probe asks about. */
export const LOCAL_SANDBOX_CAPABILITY_KEY = 'local';

/** Whether this desktop can fence local commands (`getSandboxCapability`). */
export const localSandboxCapabilityResource = defineReplica<
  typeof LOCAL_SANDBOX_CAPABILITY_KEY,
  DeviceSandboxCapabilityResult
>({
  key: (entry) => entry,
  name: 'localSandboxCapability',
  storage: 'indexedDB',
  version: 1,
});

export interface DeviceDirectoryParams {
  deviceId: string;
  /** Absent = the device's home directory. */
  path?: string;
}

/**
 * One page of a directory listing, with the cursor it was read at. The whole
 * page is the paged item, so the head page keeps the listing's own fields
 * (canonical path, parent, roots) next to its entries.
 */
export interface DeviceDirectoryPage extends DeviceDirectoryBrowseResult {
  cursor: string | null;
}

/** Next page of a listing: always read at the head page's canonical path. */
export interface DeviceDirectoryCursor {
  cursor: string;
  path: string;
}

export const deviceDirectoryKey = ({ deviceId, path }: DeviceDirectoryParams) =>
  JSON.stringify([deviceId, path ?? null]);

/**
 * Folder listings of the device directory picker, one entry per device + path.
 * Revisits paint from the store; a folder created outside the picker shows up
 * after an explicit refresh.
 */
export const deviceDirectoryResource = definePagedReplica<
  DeviceDirectoryParams,
  DeviceDirectoryPage,
  DeviceDirectoryCursor
>({
  key: deviceDirectoryKey,
  name: 'deviceDirectory',
  paging: {
    direction: 'forward',
    getId: (page) => page.cursor ?? '',
    mode: 'cursor',
    persist: { pages: 1 },
  },
  persist: { maxEntries: 30 },
  storage: 'indexedDB',
  version: 1,
});
