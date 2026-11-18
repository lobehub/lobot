import type { DetectHeterogeneousAgentCommandParams } from '@lobechat/electron-client-ipc';
import type { HeterogeneousAgentScanMap } from '@lobechat/heterogeneous-agents';

import { binaryService } from '@/services/electron/binary';

/** One agent the desktop binary detector probes for. */
export type LocalAgentScanProbe = DetectHeterogeneousAgentCommandParams;

/** A target's agent inventory; `error` when the scan itself failed. */
export interface AgentScanResult {
  agents: HeterogeneousAgentScanMap | null;
  error?: string;
}

/** Probe each agent on this desktop; a failed probe reads as unavailable. */
export const scanLocalAgents = async (
  probes: LocalAgentScanProbe[],
): Promise<HeterogeneousAgentScanMap> => {
  const entries = await Promise.all(
    probes.map(async ({ agentType, command }) => {
      try {
        const status = await binaryService.detectHeterogeneousAgentCommand({ agentType, command });
        return [
          agentType,
          {
            available: status.available,
            ...(status.error ? { reason: status.error } : undefined),
            version: status.version,
          },
        ] as const;
      } catch (error) {
        return [
          agentType,
          { available: false, reason: error instanceof Error ? error.message : String(error) },
        ] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
};
