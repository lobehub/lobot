import type { DeviceSandboxCapabilityResult } from '@lobechat/electron-client-ipc';
import {
  type DeviceListItem,
  type DeviceMetricSeries,
  type DeviceRunningSummary,
} from '@lobot/types';

import type { DeviceDirectoryListing, DeviceState } from './initialState';
import {
  agentScanKey,
  type AgentScanParams,
  DEVICE_LIST_KEY,
  DEVICE_RUNNING_SUMMARY_KEY,
  deviceDirectoryKey,
  type DeviceDirectoryParams,
  deviceMetricSeriesKey,
  type DeviceMetricSeriesParams,
  LOCAL_SANDBOX_CAPABILITY_KEY,
} from './projection';

const EMPTY_DEVICES: DeviceListItem[] = [];

const deviceList = (s: DeviceState): DeviceListItem[] =>
  s.deviceListMap[DEVICE_LIST_KEY] ?? EMPTY_DEVICES;

/** The list is on screen — from the persisted copy or the server. */
const isDeviceListLoaded = (s: DeviceState): boolean =>
  s.deviceListMap[DEVICE_LIST_KEY] !== undefined;

/**
 * The list was confirmed by the server this session. A persisted copy holds
 * stale `workingDirs` and unknown presence, so writes that merge into a device
 * row wait for this.
 */
const isDeviceListConfirmed = (s: DeviceState): boolean =>
  s.deviceListReplica.entries[DEVICE_LIST_KEY]?.source === 'server';

const getDeviceById =
  (deviceId: string | undefined) =>
  (s: DeviceState): DeviceListItem | undefined =>
    deviceId ? deviceList(s).find((d) => d.deviceId === deviceId) : undefined;

/** A device's user-configured default working directory (per-device fallback cwd). */
const getDeviceDefaultCwd =
  (deviceId: string | undefined) =>
  (s: DeviceState): string | undefined =>
    getDeviceById(deviceId)(s)?.defaultCwd ?? undefined;

/** A device's recent working dirs (also the cache for workspace-init / repoType). */
const getDeviceWorkingDirs = (deviceId: string | undefined) => (s: DeviceState) =>
  getDeviceById(deviceId)(s)?.workingDirs ?? [];

/** A device's health series, or `undefined` until storage or the server answers. */
const getMetricSeries =
  (params: DeviceMetricSeriesParams) =>
  (s: DeviceState): DeviceMetricSeries | undefined =>
    s.deviceMetricSeriesMap[deviceMetricSeriesKey(params)];

/** One agent's resolved device binding, or `undefined` until loaded. */
const agentDeviceBinding = (agentId: string | undefined) => (s: DeviceState) =>
  agentId ? s.agentDeviceBindingMap[agentId] : undefined;

/** A target's agent inventory, or `undefined` until scanned. */
const agentScan = (params: AgentScanParams | null) => (s: DeviceState) =>
  params ? s.agentScanMap[agentScanKey(params)] : undefined;
/** Running topics per device, or `undefined` until storage or the server answers. */
const runningSummary = (s: DeviceState): DeviceRunningSummary[] | undefined =>
  s.deviceRunningSummaryMap[DEVICE_RUNNING_SUMMARY_KEY];

/** A remote device's home: `undefined` = not read yet, `null` = the device reports none. */
const getDeviceHomePath =
  (deviceId: string | undefined) =>
  (s: DeviceState): string | null | undefined =>
    deviceId ? s.deviceHomePathMap[deviceId]?.homePath : undefined;

/** Probed repo type of a local path: `undefined` = not probed, `null` = not a repository. */
const getLocalRepoType =
  (path: string | undefined) =>
  (s: DeviceState): 'git' | 'github' | null | undefined =>
    path ? s.localRepoTypeMap[path]?.repoType : undefined;

const localSandboxCapability = (s: DeviceState): DeviceSandboxCapabilityResult | undefined =>
  s.localSandboxCapabilityMap[LOCAL_SANDBOX_CAPABILITY_KEY];

/** One directory listing (each item a page), or `undefined` until it is read. */
const getDirectoryListing =
  (params: DeviceDirectoryParams) =>
  (s: DeviceState): DeviceDirectoryListing | undefined =>
    s.deviceDirectoryMap[deviceDirectoryKey(params)];

export const deviceSelectors = {
  agentDeviceBinding,
  agentScan,
  deviceList,
  getDeviceById,
  getDeviceDefaultCwd,
  getDeviceHomePath,
  getDeviceWorkingDirs,
  getDirectoryListing,
  getLocalRepoType,
  getMetricSeries,
  isDeviceListConfirmed,
  isDeviceListLoaded,
  localSandboxCapability,
  runningSummary,
};
