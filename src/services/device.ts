import type { DeviceRunningSummary, DeviceScope } from '@lobot/types';

import { createWorkspaceLambdaClient, lambdaClient } from '@/libs/trpc/client';

type DeviceClient = typeof lambdaClient.device;

/**
 * Single chokepoint for the `device` TRPC router. Components, hooks and stores
 * should call this instead of reaching into `lambdaClient.device.*` directly.
 */
class DeviceService {
  /** All devices the user has registered (incl. offline) + live gateway sessions. */
  listDevices() {
    return lambdaClient.device.listDevices.query();
  }

  /** Update user-editable device fields (defaultCwd / friendlyName / workingDirs). */
  updateDevice(input: Parameters<DeviceClient['updateDevice']['mutate']>[0]) {
    // Personal devices remain editable while the UI has an active workspace.
    return createWorkspaceLambdaClient(null).device.updateDevice.mutate(input);
  }

  /**
   * Ask a managed cloud device to start. Resolves when the request is
   * accepted, not when the device is online. Routed by the device's own
   * scope, like the other per-device writes.
   */
  wakeManagedDevice({ deviceId, scope }: { deviceId: string; scope: DeviceScope }) {
    const client = scope === 'personal' ? createWorkspaceLambdaClient(null) : lambdaClient;
    return client.device.wakeManagedDevice.mutate({ deviceId });
  }

  /** Update user-editable fields of a workspace-enrolled device (workspace-scoped write). */
  updateWorkspaceDevice(input: Parameters<DeviceClient['updateWorkspaceDevice']['mutate']>[0]) {
    return lambdaClient.device.updateWorkspaceDevice.mutate(input);
  }

  /** Add (or move to the front) one recent working dir on a workspace device. */
  addWorkspaceDeviceWorkingDir(
    input: Parameters<DeviceClient['addWorkspaceDeviceWorkingDir']['mutate']>[0],
  ) {
    return lambdaClient.device.addWorkspaceDeviceWorkingDir.mutate(input);
  }

  /** Remove one recent working dir from a workspace device. */
  removeWorkspaceDeviceWorkingDir(
    input: Parameters<DeviceClient['removeWorkspaceDeviceWorkingDir']['mutate']>[0],
  ) {
    return lambdaClient.device.removeWorkspaceDeviceWorkingDir.mutate(input);
  }

  /**
   * Check whether a path exists on a device and is a directory (via the device's
   * `statPath` RPC). Returns `null` when the device is unreachable — callers
   * treat "can't verify" as non-blocking.
   */
  statPath(deviceId: string, path: string) {
    return lambdaClient.device.statPath.query({ deviceId, path });
  }

  /** Browse folders on the execution device, including cursor pagination. */
  browseDirectory(input: Parameters<DeviceClient['browseDirectory']['query']>[0]) {
    return lambdaClient.device.browseDirectory.query(input);
  }

  /** Create a folder inside the directory a remote folder picker is browsing. */
  createDirectory(input: Parameters<DeviceClient['createDirectory']['mutate']>[0]) {
    return lambdaClient.device.createDirectory.mutate(input);
  }

  /** Probe whether an agent platform (openclaw / hermes) is available on a device. */
  checkCapability(
    input: Parameters<DeviceClient['checkCapability']['query']>[0],
  ): Promise<{ available: boolean; reason?: string; version?: string }> {
    return lambdaClient.device.checkCapability.query(input);
  }

  /** Fetch the agent profile (title / description / avatar) from a device platform. */
  getAgentProfile(
    input: Parameters<DeviceClient['getAgentProfile']['query']>[0],
  ): Promise<{ avatar?: string; description?: string; title?: string }> {
    return lambdaClient.device.getAgentProfile.query(input);
  }

  /** Scan a device for every known heterogeneous agent type in one pass. */
  scanAgents(input: Parameters<DeviceClient['scanAgents']['query']>[0]) {
    return lambdaClient.device.scanAgents.query(input);
  }

  /**
   * The device each agent runs on for the caller, resolved server-side in one
   * read. Agents that route to no device (sandbox, none, auto, unbound) are
   * absent from the result.
   */
  getAgentDeviceBindings(agentIds: string[]): Promise<Record<string, string>> {
    return lambdaClient.device.getAgentDeviceBindings.query({ agentIds });
  }

  /** Running-topic count and the members behind it, for every device in the list. */
  getRunningSummary(): Promise<DeviceRunningSummary[]> {
    return lambdaClient.device.getRunningSummary.query();
  }

  /** The device's reported paths and runtime info (home, desktop, shell, ...). */
  getDeviceSystemInfo(input: Parameters<DeviceClient['getDeviceSystemInfo']['query']>[0]) {
    return lambdaClient.device.getDeviceSystemInfo.query(input);
  }

  /** The device's recent CPU / memory / load history, bucketed for charting. */
  getMetricSeries(deviceId: string, scope?: DeviceScope) {
    return lambdaClient.deviceMetric.getSeries.query({ deviceId, scope });
  }
}

export const deviceService = new DeviceService();
