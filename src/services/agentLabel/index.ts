import type { AgentLabelListItem } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

class AgentLabelService {
  getLabels = (): Promise<AgentLabelListItem[]> => {
    return lambdaClient.agentLabel.getLabels.query();
  };

  createLabel = (params: {
    color?: string;
    description?: string;
    name: string;
  }): Promise<string | undefined> => {
    return lambdaClient.agentLabel.createLabel.mutate(params);
  };

  updateLabel = (
    id: string,
    value: {
      archived?: boolean;
      color?: string | null;
      description?: string | null;
      name?: string;
    },
  ): Promise<void> => {
    return lambdaClient.agentLabel.updateLabel.mutate({ id, value }) as any;
  };

  /**
   * Apply or remove one label. Use this for toggles — a full replacement built
   * from a cached assignment set drops whatever another editor added since.
   */
  toggleAgentLabel = (agentId: string, labelId: string, assigned: boolean): Promise<string[]> => {
    return lambdaClient.agentLabel.toggleAgentLabel.mutate({ agentId, assigned, labelId });
  };
}

export const agentLabelService = new AgentLabelService();
