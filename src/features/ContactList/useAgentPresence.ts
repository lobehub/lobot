import { workingConversationCount } from '@/features/Channels/jobStatus';
import { getManagedDeviceStatus } from '@/features/DeviceManager/managedDeviceStatus';
import { agentQuotaSelectors, useAgentQuotaStore } from '@/store/agentQuota';
import { channelSelectors, useChannelStore } from '@/store/channel';
import { deviceSelectors, useDeviceStore } from '@/store/device';
import { isDevicePresenceUnknown, useDeviceList } from '@/store/device/useDeviceList';

import { type AgentPresence, resolveAgentPresence } from './agentPresence';

/** A card left open keeps following the Agent, without polling like a live dashboard. */
const REFRESH_INTERVAL = 30_000;

/**
 * The status an Agent's contact card shows (see {@link resolveAgentPresence}),
 * or `undefined` while it cannot be told yet — better no badge than a wrong one.
 */
export const useAgentPresence = (agentId?: string): AgentPresence | undefined => {
  const config = { refreshInterval: REFRESH_INTERVAL };

  // `refreshAgentDeviceBindings` re-resolves this after a routing change.
  useDeviceStore((s) => s.useFetchAgentDeviceBinding)(agentId, config);
  const binding = useDeviceStore(deviceSelectors.agentDeviceBinding(agentId));
  const devices = useDeviceList(config);
  // Waits for the binding: which accounts count depends on the device the Agent runs on.
  const loadsParams =
    agentId && binding !== undefined ? { agentId, deviceId: binding.deviceId ?? null } : null;
  const quota = useAgentQuotaStore((s) => s.useFetchQuotaAgentLoads)(loadsParams, config);
  const loads = useAgentQuotaStore(agentQuotaSelectors.agentLoads(loadsParams));
  // Working while a reply is pending in its direct Channel, Threads included: the Channel list
  // carries those jobs and keeps them live.
  const running = useChannelStore((s) => {
    const direct = agentId ? channelSelectors.directByAgent(agentId)(s) : undefined;
    return workingConversationCount(direct?.replyJobs ?? []) > 0;
  });

  if (!agentId) return;
  if (binding === undefined) return;
  // Quota is a nice-to-have: a failed read only means "not off duty" was not ruled out.
  if (loads === undefined && !quota.error) return;

  const deviceId = binding.deviceId ?? undefined;
  const device = deviceId ? devices.data?.find((item) => item.deviceId === deviceId) : undefined;
  if (deviceId) {
    if (!devices.data) return;
    // A restored row's "offline" is a placeholder until the server confirms it.
    if (device && isDevicePresenceUnknown(device)) return;
    // A missing device only means "gone" once the server answered for the list.
    if (!device && !devices.isConfirmed) return;
  }

  return resolveAgentPresence({
    // A managed cloud device that is not connected is usually asleep, not gone.
    device: device && { managedStatus: getManagedDeviceStatus(device), online: device.online },
    deviceId,
    loads: loads ?? [],
    now: Date.now(),
    running,
  });
};
