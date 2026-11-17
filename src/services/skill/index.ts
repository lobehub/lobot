import type {
  CreateSkillInput,
  ImportGitHubInput,
  ImportUrlInput,
  ImportZipInput,
  SkillImportResult,
  SkillItem,
  SkillListItem,
  SkillResourceContent,
  SkillResourceTreeNode,
  SkillSource,
  UpdateSkillInput,
} from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

class AgentSkillService {
  async importFromMarket(identifier: string): Promise<SkillImportResult | undefined> {
    return lambdaClient.agentSkills.importFromMarket.mutate({ identifier });
  }

  /**
   * Make sure the Market skills an agent references are installed in the active
   * scope. Per-identifier outcomes; a failed one never throws.
   */
  async ensureFromMarket(identifiers: string[]) {
    return lambdaClient.agentSkills.ensureFromMarket.mutate({ identifiers });
  }

  // ===== Query =====

  async getById(id: string): Promise<SkillItem | undefined> {
    return lambdaClient.agentSkills.getById.query({ id });
  }

  async list(source?: SkillSource): Promise<{ data: SkillListItem[]; total: number }> {
    return lambdaClient.agentSkills.list.query(source ? { source } : undefined);
  }

  // ===== Resources =====

  async listResources(id: string, includeContent?: boolean): Promise<SkillResourceTreeNode[]> {
    return lambdaClient.agentSkills.listResources.query({ id, includeContent });
  }
}

export type EnsureMarketSkillResult = Awaited<
  ReturnType<AgentSkillService['ensureFromMarket']>
>[number];

export const agentSkillService = new AgentSkillService();
