import { useClientDataSWR } from '@/libs/swr';
import { agentQuotaService } from '@/services/agentQuota';
import { deviceService } from '@/services/device';
import { topicService } from '@/services/topic';
import { useChatStore } from '@/store/chat';
import { operationSelectors } from '@/store/chat/selectors';
import { AGENT_DEVICE_BINDING_SWR_KEY } from '@/store/device/agentDeviceBinding';
import { isDevicePresenceUnknown, useDeviceList } from '@/store/device/useDeviceList';

import { type AgentPresence, type QuotaAccountLoad, resolveAgentPresence } from './agentPresence';

/** A card left open keeps following the Agent, without polling like a live dashboard. */
const REFRESH_INTERVAL = 30_000;
/** Upper bound on the running conversations read; a real account runs far fewer at once. */
const RUNNING_TOPICS_LIMIT = 200;

const fetchQuotaLoads = async (agentId: string): Promise<QuotaAccountLoad[]> => {
  const bindings = await agentQuotaService.listBindings(agentId);
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
  const running = useClientDataSWR(
    agentId ? ['agent-presence-running', agentId] : null,
    async () =>
      (
        await topicService.queryTopics({ pageSize: RUNNING_TOPICS_LIMIT, statuses: ['running'] })
      ).some((topic) => topic.agentId === agentId),
    config,
  );
  const quota = useClientDataSWR(
    agentId ? ['agent-presence-quota', agentId] : null,
    () => fetchQuotaLoads(agentId!),
    config,
  );
  // A run started from this window shows before the server's next answer.
  const runningHere = useChatStore((s) =>
    agentId ? operationSelectors.isAgentRunning(agentId)(s) : false,
  );

  if (!agentId) return;
  if (binding.data === undefined || (running.data === undefined && !running.error)) return;
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
    device,
    deviceId,
    loads: quota.data ?? [],
    now: Date.now(),
    running: runningHere || !!running.data,
  });
};
