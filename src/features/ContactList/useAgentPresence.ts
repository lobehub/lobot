import { workingConversationCount } from '@/features/Channels/jobStatus';
import { getManagedDeviceStatus } from '@/features/DeviceManager/managedDeviceStatus';
import { useClientDataSWR } from '@/libs/swr';
import { agentQuotaService } from '@/services/agentQuota';
import { deviceService } from '@/services/device';
import { channelSelectors, useChannelStore } from '@/store/channel';
import { AGENT_DEVICE_BINDING_SWR_KEY } from '@/store/device/agentDeviceBinding';
import { isDevicePresenceUnknown, useDeviceList } from '@/store/device/useDeviceList';

import { type AgentPresence, type QuotaAccountLoad, resolveAgentPresence } from './agentPresence';

/** A card left open keeps following the Agent, without polling like a live dashboard. */
const REFRESH_INTERVAL = 30_000;

const fetchQuotaLoads = async (
  agentId: string,
  deviceId: string | null,
): Promise<QuotaAccountLoad[]> => {
  // An account pinned on the bound device is the only one the Agent runs on there, so the rest
  // of its pool — logged in on other machines — cannot keep it on duty.
  if (deviceId) {
    const { accountId } = await agentQuotaService.getDeviceAccount(agentId, deviceId);
    if (accountId) return agentQuotaService.resolveAccountLoads([accountId]);
  }

  const bindings: { accountId: string; enabled: boolean; role: string }[] =
    await agentQuotaService.listBindings(agentId);
  const accountIds = bindings
    .filter((binding) => binding.enabled && binding.role !== 'disabled')
    .map((binding) => binding.accountId);
  if (accountIds.length === 0) return [];

  return agentQuotaService.resolveAccountLoads(accountIds);
};

/**
 * The status an Agent's contact card shows (see {@link resolveAgentPresence}),
 * or `undefined` while it cannot be told yet — better no badge than a wrong one.
 */
export const useAgentPresence = (agentId?: string): AgentPresence | undefined => {
  const config = { refreshInterval: REFRESH_INTERVAL };

  // Same key family as the sidebar's binding reads, so a routing change refreshes this too.
  const binding = useClientDataSWR(
    agentId ? [AGENT_DEVICE_BINDING_SWR_KEY, agentId] : null,
    async () => (await deviceService.getAgentDeviceBindings([agentId!]))[agentId!] ?? null,
    config,
  );
  const devices = useDeviceList(config);
  // Waits for the binding: which accounts count depends on the device the Agent runs on.
  const quota = useClientDataSWR(
    agentId && binding.data !== undefined ? ['agent-presence-quota', agentId, binding.data] : null,
    () => fetchQuotaLoads(agentId!, binding.data ?? null),
    config,
  );
  // Working while a reply is pending in its direct Channel, Threads included: the Channel list
  // carries those jobs and keeps them live.
  const running = useChannelStore((s) => {
    const direct = agentId ? channelSelectors.directByAgent(agentId)(s) : undefined;
    return workingConversationCount(direct?.replyJobs ?? []) > 0;
  });

  if (!agentId) return;
  if (binding.data === undefined) return;
  // Quota is a nice-to-have: a failed read only means "not off duty" was not ruled out.
  if (quota.data === undefined && !quota.error) return;

  const deviceId = binding.data ?? undefined;
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
    loads: quota.data ?? [],
    now: Date.now(),
    running,
  });
};
