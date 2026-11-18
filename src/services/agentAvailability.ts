import type { AgentAvailability } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

class AgentAvailabilityService {
  /**
   * Whether each agent can take work right now, as the server's dispatch layer sees it.
   * Agents the caller cannot see are absent.
   */
  getAvailability = async (agentIds: string[]): Promise<Record<string, AgentAvailability>> =>
    lambdaClient.agentAvailability.getAvailability.query({ agentIds });
}

export const agentAvailabilityService = new AgentAvailabilityService();
