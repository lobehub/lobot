import type { BotWakeDecisionPage, BotWakeSummary, BotWakeUserMark } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

import type { BotRuntimeStatusSnapshot } from '../types/botRuntimeStatus';

class AgentBotProviderService {
  listPlatforms = async () => {
    return lambdaClient.agentBotProvider.listPlatforms.query();
  };

  getByAgentId = async (agentId: string) => {
    return lambdaClient.agentBotProvider.getByAgentId.query({ agentId });
  };
}

export const agentBotProviderService = new AgentBotProviderService();
