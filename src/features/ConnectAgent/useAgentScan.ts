import type { HeterogeneousAgentScanMap } from '@lobechat/heterogeneous-agents';
import type { DeviceListItem } from '@lobot/types';
import { useCallback, useMemo } from 'react';

import { deviceSelectors, useDeviceStore } from '@/store/device';
import { type LocalAgentScanProbe, scanLocalAgents } from '@/store/device/agentScan';
import type { AgentScanParams } from '@/store/device/projection';

import { CONNECTABLE_PROVIDERS } from './providers';

/**
 * Where the wizard scans for installed agents: the local desktop machine
 * (agents run as desktop subprocesses) or a gateway-connected device.
 */
export type ScanTarget = { device: DeviceListItem; kind: 'device' } | { kind: 'local' };

interface AgentScanState {
  agents: HeterogeneousAgentScanMap | null;
  error?: string;
  status: 'error' | 'idle' | 'scanning' | 'success';
}

const IDLE: AgentScanState = { agents: null, status: 'idle' };

/**
 * Local scans probe every connectable agent through the desktop binary detector.
 * Although OpenClaw and Hermes use the gateway execution path, they are installed
 * on and selected from this machine just like the coding-agent CLIs.
 */
const LOCAL_PROBES: LocalAgentScanProbe[] = CONNECTABLE_PROVIDERS.map((provider) => ({
  agentType: provider.type,
  command: provider.command ?? provider.type,
}));

export const scanLocal = (): Promise<HeterogeneousAgentScanMap> => scanLocalAgents(LOCAL_PROBES);

const LOCAL_SCAN: AgentScanParams = { local: LOCAL_PROBES };

const scanParams = (target: ScanTarget | null): AgentScanParams | null => {
  if (!target) return null;
  return target.kind === 'local' ? LOCAL_SCAN : { deviceId: target.device.deviceId };
};

/**
 * The agent inventory of the picked target. Keyed by target, so picking one
 * (or opening the wizard on one) scans it; `rescan` re-probes in place.
 */
export const useAgentScan = (target: ScanTarget | null) => {
  const params = scanParams(target);
  const { error, isValidating, revalidate } = useDeviceStore((s) => s.useFetchAgentScan)(params);
  const data = useDeviceStore(deviceSelectors.agentScan(params));

  const state = useMemo<AgentScanState>(() => {
    if (!target) return IDLE;
    if (isValidating) return { agents: null, status: 'scanning' };
    const failure = error ? (error instanceof Error ? error.message : String(error)) : data?.error;
    if (failure) return { agents: null, error: failure, status: 'error' };
    if (!data) return { agents: null, status: 'scanning' };
    return { agents: data.agents, status: 'success' };
  }, [data, error, isValidating, target]);

  const rescan = useCallback(() => void revalidate(), [revalidate]);

  return { rescan, state };
};
