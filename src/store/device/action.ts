import type { DeviceSandboxCapabilityResult } from '@lobechat/electron-client-ipc';
import type {
  DeviceListItem,
  DeviceMetricSeries,
  DeviceRunningSummary,
  WorkingDirEntry,
} from '@lobot/types';

import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { deviceService } from '@/services/device';
import { electronGitService } from '@/services/electron/git';
import { localFileService } from '@/services/electron/localFileService';
import { type StoreSetter } from '@/store/types';

import { type AgentScanResult, scanLocalAgents } from './agentScan';
import { nextWorkingDirs, removeWorkingDir, WORKING_DIRS_MAX } from './deviceCwd';
import { type DeviceDirectoryListing } from './initialState';
import {
  type AgentDeviceBinding,
  agentDeviceBindingResource,
  type AgentScanParams,
  agentScanResource,
  DEVICE_LIST_KEY,
  type DeviceDirectoryCursor,
  deviceDirectoryKey,
  type DeviceDirectoryParams,
  deviceDirectoryResource,
  type DeviceHomePath,
  deviceHomePathResource,
  type DeviceListParams,
  deviceListResource,
  type DeviceMetricSeriesParams,
  deviceMetricSeriesResource,
  deviceRunningSummaryResource,
  LOCAL_SANDBOX_CAPABILITY_KEY,
  type LocalRepoType,
  localRepoTypeResource,
  localSandboxCapabilityResource,
} from './projection';
import { deviceSelectors } from './selectors';
import { type DeviceStore } from './store';

type Setter = StoreSetter<DeviceStore>;

const LIST_PARAMS = {} as DeviceListParams;

/**
 * Pickers, chips and guards across a page mount the list at different times.
 * The app's SWR default (no dedupe) would let each late mount re-request it;
 * inside this window they join the last request instead. Explicit refreshes,
 * post-write revalidation and polling still go out.
 */
const DEVICE_LIST_DEDUPING_INTERVAL = 10_000;

/** Devices upload every 5 minutes; polling faster only re-reads the same samples. */
const METRIC_SERIES_REFRESH_INTERVAL = 5 * 60_000;
/** The chip, the hover panel and the detail page mount one device's series together; let them share one request. */
const METRIC_SERIES_DEDUPING_INTERVAL = 30_000;

/** Same cadence as the device detail page, so a card and its detail agree on what is running. */
const RUNNING_SUMMARY_REFRESH_INTERVAL = 15_000;

/** A repo-type probe answers the same for a path within a session's minute. */
const REPO_TYPE_DEDUPING_INTERVAL = 60_000;

/**
 * Forwarded to SWR as given (the driver passes schedule options through): a
 * dead path or an unreachable device is not retried in the background.
 */
const NO_RETRY = { shouldRetryOnError: false };

const EMPTY_PARAMS = {} as Record<string, never>;

const fetchDirectoryPage = async (
  { deviceId, path }: DeviceDirectoryParams,
  next?: DeviceDirectoryCursor,
) => {
  const result = await deviceService.browseDirectory({
    cursor: next?.cursor,
    deviceId,
    path: next?.path ?? path,
  });
  // Offline / unsupported RPC is returned as null, never an empty directory.
  if (!result) throw new Error('Device directory unavailable');
  return {
    items: [{ ...result, cursor: next?.cursor ?? null }],
    nextCursor: result.nextCursor ? { cursor: result.nextCursor, path: result.path } : null,
  };
};

type UpdateDeviceInput = Parameters<typeof deviceService.updateDevice>[0];

/**
 * Persist user-editable fields, routed by the device's own scope. Workspace
 * devices live under `workspace_id`, so the userId-scoped personal mutation
 * would match no row and the write would be silently dropped.
 */
const persistDevice = (device: DeviceListItem | undefined, input: UpdateDeviceInput) =>
  device?.scope === 'workspace'
    ? deviceService.updateWorkspaceDevice(input)
    : deviceService.updateDevice(input);

export const deviceSlice = (set: Setter, get: () => DeviceStore, _api?: unknown) =>
  new DeviceActionImpl(set, get, _api);

class DeviceActionImpl {
  readonly #directory;
  readonly #get: () => DeviceStore;
  readonly #homePath;
  readonly #list;
  readonly #metricSeries;
  readonly #agentDeviceBinding;
  readonly #agentScan;
  readonly #repoType;
  readonly #runningSummary;
  readonly #sandboxCapability;

  constructor(set: Setter, get: () => DeviceStore, _api?: unknown) {
    void _api;
    this.#get = get;
    this.#list = createReplicaSlice(deviceListResource, {
      actionPrefix: 'device/list',
      fetcher: () => deviceService.listDevices(),
      get,
      set,
      stateKey: 'deviceListReplica',
      view: recordLens<DeviceStore, DeviceListItem[]>('deviceListMap'),
    });
    this.#metricSeries = createReplicaSlice(deviceMetricSeriesResource, {
      actionPrefix: 'device/metricSeries',
      fetcher: ({ deviceId, scope }) => deviceService.getMetricSeries(deviceId, scope),
      get,
      set,
      stateKey: 'deviceMetricSeriesReplica',
      view: recordLens<DeviceStore, DeviceMetricSeries>('deviceMetricSeriesMap'),
    });
    this.#agentDeviceBinding = createReplicaSlice(agentDeviceBindingResource, {
      actionPrefix: 'device/agentDeviceBinding',
      fetcher: async ({ agentId }) => ({
        deviceId: (await deviceService.getAgentDeviceBindings([agentId]))[agentId] ?? null,
      }),
      get,
      set,
      stateKey: 'agentDeviceBindingReplica',
      view: recordLens<DeviceStore, AgentDeviceBinding>('agentDeviceBindingMap'),
    });
    this.#agentScan = createReplicaSlice(agentScanResource, {
      actionPrefix: 'device/agentScan',
      // A failed scan is an answer, not a request to retry: retrying would re-probe on its own.
      fetcher: async (params): Promise<AgentScanResult> => {
        try {
          return 'deviceId' in params
            ? await deviceService.scanAgents({ deviceId: params.deviceId })
            : { agents: await scanLocalAgents(params.local) };
        } catch (error) {
          return { agents: null, error: error instanceof Error ? error.message : String(error) };
        }
      },
      get,
      set,
      stateKey: 'agentScanReplica',
      view: recordLens<DeviceStore, AgentScanResult>('agentScanMap'),
    });
    this.#runningSummary = createReplicaSlice(deviceRunningSummaryResource, {
      actionPrefix: 'device/runningSummary',
      fetcher: () => deviceService.getRunningSummary(),
      get,
      set,
      stateKey: 'deviceRunningSummaryReplica',
      view: recordLens<DeviceStore, DeviceRunningSummary[]>('deviceRunningSummaryMap'),
    });
    this.#homePath = createReplicaSlice(deviceHomePathResource, {
      actionPrefix: 'device/homePath',
      fetcher: async (deviceId) => {
        const info = await deviceService.getDeviceSystemInfo({ deviceId });
        return { homePath: info?.homePath || null };
      },
      get,
      set,
      stateKey: 'deviceHomePathReplica',
      view: recordLens<DeviceStore, DeviceHomePath>('deviceHomePathMap'),
    });
    this.#repoType = createReplicaSlice(localRepoTypeResource, {
      actionPrefix: 'device/localRepoType',
      fetcher: async (path) => ({
        repoType: (await electronGitService.detectRepoType(path)) ?? null,
      }),
      get,
      set,
      stateKey: 'localRepoTypeReplica',
      view: recordLens<DeviceStore, LocalRepoType>('localRepoTypeMap'),
    });
    this.#sandboxCapability = createReplicaSlice(localSandboxCapabilityResource, {
      actionPrefix: 'device/localSandboxCapability',
      fetcher: () => localFileService.getSandboxCapability(),
      get,
      set,
      stateKey: 'localSandboxCapabilityReplica',
      view: recordLens<DeviceStore, DeviceSandboxCapabilityResult>('localSandboxCapabilityMap'),
    });
    this.#directory = createReplicaSlice(deviceDirectoryResource, {
      actionPrefix: 'device/directory',
      fetcher: fetchDirectoryPage,
      get,
      set,
      stateKey: 'deviceDirectoryReplica',
      view: recordLens<DeviceStore, DeviceDirectoryListing>('deviceDirectoryMap'),
    });
  }

  #devices = (): DeviceListItem[] => deviceSelectors.deviceList(this.#get());

  /** Patch one device row optimistically; rolls back if `serverCall` rejects. */
  #patchDevice = <T>(
    deviceId: string,
    patch: (device: DeviceListItem) => DeviceListItem,
    serverCall: () => Promise<T>,
  ): Promise<T> =>
    this.#list.optimistic(
      DEVICE_LIST_KEY,
      (devices) => devices.map((d) => (d.deviceId === deviceId ? patch(d) : d)),
      serverCall,
    );

  /** Re-fetch the truth (server-normalized fields, other tabs' writes). */
  #revalidateDeviceLists = () => this.#list.revalidate(DEVICE_LIST_KEY);

  /**
   * Re-run the device list request of every mounted reader. Resolves once the
   * response is folded into the store; read the rows with `deviceSelectors`.
   */
  refreshDevices = (): Promise<unknown> => this.#list.revalidate(DEVICE_LIST_KEY);

  /**
   * Persist a working-directory choice to a device (`defaultCwd` + `workingDirs`)
   * with an optimistic store update, then revalidate from the server. Pass
   * `setDefault: false` to record the dir in the recent list without repointing
   * the device's default cwd.
   */
  updateDeviceCwd = async (
    deviceId: string,
    entry: WorkingDirEntry,
    options: { setDefault?: boolean } = {},
  ): Promise<void> => {
    const trimmed = entry.path.trim();
    if (!trimmed) return;
    const setDefault = options.setDefault ?? true;

    const device = this.#devices().find((d) => d.deviceId === deviceId);
    const updatedDirs = nextWorkingDirs(entry, device?.workingDirs ?? []);

    try {
      // Spreading widens the item out of the listDevices union, so re-assert it.
      await this.#patchDevice(
        deviceId,
        (d) =>
          ({
            ...d,
            ...(setDefault ? { defaultCwd: trimmed } : {}),
            workingDirs: updatedDirs,
          }) as DeviceListItem,
        async () => {
          if (device?.scope === 'workspace') {
            // Members share this list: add the one entry server-side instead of
            // replacing the list with this client's possibly stale snapshot.
            await deviceService.addWorkspaceDeviceWorkingDir({
              deviceId,
              entry: { ...entry, path: trimmed },
            });
            if (setDefault)
              await deviceService.updateWorkspaceDevice({ defaultCwd: trimmed, deviceId });
          } else {
            await deviceService.updateDevice({
              deviceId,
              ...(setDefault ? { defaultCwd: trimmed } : {}),
              workingDirs: updatedDirs,
            });
          }
        },
      );
    } finally {
      // Re-fetch the truth (server-normalized fields, other tabs' writes).
      await this.#revalidateDeviceLists();
    }
  };

  /** Clear a device's default cwd without removing it from the recent directory list. */
  clearDeviceDefaultCwd = async (deviceId: string): Promise<void> => {
    const device = this.#devices().find((d) => d.deviceId === deviceId);
    if (!device?.defaultCwd) return;

    try {
      // A failed write rolls back to the prior default.
      await this.#patchDevice(
        deviceId,
        (d) => ({ ...d, defaultCwd: null }) as DeviceListItem,
        () => persistDevice(device, { defaultCwd: null, deviceId }),
      );
    } finally {
      await this.#revalidateDeviceLists();
    }
  };

  /**
   * Merge legacy recent dirs (read from localStorage by the caller — the store
   * stays out of feature-layer storage) into a device's `device.workingDirs`.
   * Existing device entries win on conflict. Rejects if the persist fails so the
   * caller can keep localStorage for a retry; resolves once safely merged.
   */
  migrateLocalRecentsToDevice = async (
    deviceId: string,
    legacyEntries: WorkingDirEntry[],
  ): Promise<void> => {
    if (legacyEntries.length === 0) return;

    const device = this.#devices().find((d) => d.deviceId === deviceId);
    const existing = device?.workingDirs ?? [];
    const existingPaths = new Set(existing.map((d) => d.path));
    const merged = [...existing, ...legacyEntries.filter((d) => !existingPaths.has(d.path))].slice(
      0,
      WORKING_DIRS_MAX,
    );

    try {
      await this.#patchDevice(
        deviceId,
        (d) => ({ ...d, workingDirs: merged }) as DeviceListItem,
        () => persistDevice(device, { deviceId, workingDirs: merged }),
      );
    } finally {
      await this.#revalidateDeviceLists();
    }
  };

  /** Remove a path from a device's `workingDirs` recent list (optimistic). */
  removeDeviceWorkingDir = async (deviceId: string, path: string): Promise<void> => {
    const device = this.#devices().find((d) => d.deviceId === deviceId);
    if (!device) return;
    const updated = removeWorkingDir(path, device.workingDirs ?? []);

    try {
      await this.#patchDevice(
        deviceId,
        (d) => ({ ...d, workingDirs: updated }) as DeviceListItem,
        () =>
          device.scope === 'workspace'
            ? deviceService.removeWorkspaceDeviceWorkingDir({ deviceId, path })
            : deviceService.updateDevice({ deviceId, workingDirs: updated }),
      );
    } finally {
      await this.#revalidateDeviceLists();
    }
  };

  /**
   * Fetch orchestration only; read the rows with `deviceSelectors.deviceList`.
   * The persisted copy paints first (presence unknown), then the server
   * confirms it in the background. A surface that tracks presence live passes
   * its own `refreshInterval`.
   */
  useFetchDevices = (enabled = false, schedule?: { refreshInterval?: number }): ReplicaSyncResult =>
    this.#list.useSync(LIST_PARAMS, {
      dedupingInterval: DEVICE_LIST_DEDUPING_INTERVAL,
      enabled,
      ...schedule,
    });

  /**
   * Fetch orchestration for one device's health series; read it with
   * `deviceSelectors.getMetricSeries`. `enabled: false` (an off-screen card,
   * an offline device) stops fetching and keeps what the store holds.
   */
  /**
   * One agent's resolved device binding; read it with `deviceSelectors.agentDeviceBinding`.
   * `refreshAgentDeviceBindings` re-resolves every mounted one after a routing write.
   */
  useFetchAgentDeviceBinding = (
    agentId: string | undefined,
    schedule?: { refreshInterval?: number },
  ): ReplicaSyncResult => this.#agentDeviceBinding.useSync(agentId ? { agentId } : null, schedule);

  /**
   * Scan a target's installed agents; read them with `deviceSelectors.agentScan`. Only an
   * explicit `revalidate` re-probes: a silent refresh (focus, reconnect) would leave picked
   * runtimes pointing at stale rows.
   */
  useFetchAgentScan = (params: AgentScanParams | null): ReplicaSyncResult =>
    this.#agentScan.useSync(params, { revalidateOnFocus: false, revalidateOnReconnect: false });

  useFetchDeviceMetricSeries = (
    params: DeviceMetricSeriesParams,
    enabled = true,
  ): ReplicaSyncResult =>
    this.#metricSeries.useSync(params, {
      dedupingInterval: METRIC_SERIES_DEDUPING_INTERVAL,
      enabled,
      refreshInterval: METRIC_SERIES_REFRESH_INTERVAL,
    });

  /**
   * Running-topic counts for every device, from one polled request; read them
   * with `deviceSelectors.runningSummary`.
   */
  useFetchDeviceRunningSummary = (): ReplicaSyncResult =>
    this.#runningSummary.useSync(EMPTY_PARAMS, {
      focusThrottleInterval: 1000,
      refreshInterval: RUNNING_SUMMARY_REFRESH_INTERVAL,
    });

  /** A remote device's reported home; `undefined` disables the read. */
  useFetchDeviceHomePath = (deviceId: string | undefined): ReplicaSyncResult =>
    this.#homePath.useSync(deviceId, { revalidateOnFocus: false });

  /** Read a device's home outside a mounted view (joins a read in flight). */
  fetchDeviceHomePath = async (deviceId: string): Promise<string | undefined> => {
    const { data } = await this.#homePath.fetch(deviceId);
    return data.homePath || undefined;
  };

  /** The desktop's repo-type probe of a local path; `undefined` disables it. */
  useFetchLocalRepoType = (path: string | undefined): ReplicaSyncResult =>
    this.#repoType.useSync(path, {
      ...NO_RETRY,
      dedupingInterval: REPO_TYPE_DEDUPING_INTERVAL,
      revalidateOnFocus: false,
    });

  /** Whether this desktop can fence commands; asked only where `enabled`. */
  useFetchLocalSandboxCapability = (enabled: boolean): ReplicaSyncResult =>
    this.#sandboxCapability.useSync(enabled ? LOCAL_SANDBOX_CAPABILITY_KEY : null, {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    });

  /** Re-probe the capability; the desktop may have downgraded its own verdict. */
  refreshLocalSandboxCapability = (): Promise<unknown> =>
    this.#sandboxCapability.revalidate(LOCAL_SANDBOX_CAPABILITY_KEY);

  /** Adopt a verdict the desktop already re-probed (after an install) without asking again. */
  setLocalSandboxCapability = (capability: DeviceSandboxCapabilityResult): void => {
    this.#sandboxCapability.update(LOCAL_SANDBOX_CAPABILITY_KEY, () => capability, {
      source: 'server',
    });
  };

  /**
   * One directory of a device, paged. A revisited directory paints from the
   * store without asking again; `refreshDeviceDirectory` re-reads it.
   */
  useFetchDeviceDirectory = (params: DeviceDirectoryParams): ReplicaSyncResult =>
    this.#directory.useSync(params, {
      ...NO_RETRY,
      revalidateIfStale: false,
      revalidateOnFocus: false,
    });

  loadMoreDeviceDirectory = (params: DeviceDirectoryParams): Promise<void> =>
    this.#directory.loadMore(deviceDirectoryKey(params), params);
}

export type DeviceAction = Pick<DeviceActionImpl, keyof DeviceActionImpl>;
