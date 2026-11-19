import { isDesktop } from '@lobechat/const';

import { resolveExecutionTarget } from '@/helpers/executionTarget';
import { useIsGatewayModeEnabled } from '@/helpers/gatewayMode';
import { useEffectiveAgencyConfig } from '@/hooks/useEffectiveAgencyConfig';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';
import { deviceSelectors, useDeviceStore } from '@/store/device';
import { useDeviceList } from '@/store/device/useDeviceList';

import { blockedDeviceState } from './blockedDeviceState';
import { profileEnvironment } from './profileEnvironment';

const REFRESH_INTERVAL = 15_000;

export interface ChannelChoice {
  deviceId?: string;
  workingDirectory?: string;
}

/**
 * Where an Agent's next reply in a Channel runs: the Channel's own pick when it has one,
 * otherwise wherever the Agent's own settings route it. `resolving` while the server's binding
 * is still on its way; `target` names where a reply runs when no device is involved.
 */
export const useAgentRunLocation = (agentId: string, channel?: ChannelChoice) => {
  useDeviceStore((s) => s.useFetchAgentDeviceBinding)(agentId, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const binding = useDeviceStore(deviceSelectors.agentDeviceBinding(agentId));
  const devices = useDeviceList({ refreshInterval: REFRESH_INTERVAL });
  const { agencyConfig, workspaceScoped } = useEffectiveAgencyConfig(agentId, { topicId: null });
  const deviceRoutingAvailable = useIsGatewayModeEnabled(agentId);
  const isHetero = useAgentStore(agentByIdSelectors.isAgentHeterogeneousById(agentId));

  const resolving = binding === undefined && !channel?.deviceId;
  const { deviceId, directory } = profileEnvironment({
    agencyConfig,
    bindingDeviceId: binding?.deviceId,
    channel,
    devices: devices.data,
  });

  return {
    deviceId,
    directory,
    resolving,
    state: deviceId ? blockedDeviceState(deviceId, devices.data, devices.isConfirmed) : undefined,
    target: deviceId
      ? undefined
      : resolveExecutionTarget(agencyConfig, {
          clientExecutionAvailable: isDesktop,
          deviceRoutingAvailable,
          isHetero,
          workspaceScoped,
        }),
  };
};
