import {
  type AgentCreateResponse,
  type AgentItemDetail,
  type AgentListResponse,
} from '@lobehub/market-sdk';

import { type MarketUserProfile } from '@/layout/AuthProvider/MarketAuth/types';
import { lambdaClient } from '@/libs/trpc/client';
import { discoverService } from '@/services/discover';
import {
  type AgentForkBatchInput,
  type AgentForkSourceResponse,
  type AgentForksResponse,
  type AgentGroupForkRequest,
  type AgentGroupForkResponse,
  type AgentGroupForkSourceResponse,
  type AgentGroupForksResponse,
  type SkillSorts,
} from '@/types/discover';
import { isTrpcErrorCode } from '@/utils/trpcError';

/** One text file of a Market skill package, path relative to the package root. */
export interface MarketSkillPackageFile {
  content: string;
  path: string;
}

interface GetOwnAgentsParams {
  page?: number;
  pageSize?: number;
}

class MarketApiService {
  // Get agent detail by identifier
  async getAgentDetail(
    identifier: string,
  ): Promise<AgentItemDetail & { forkedFromAgentId?: string }> {
    return lambdaClient.market.agent.getAgentDetail.query({
      identifier,
    }) as Promise<AgentItemDetail>;
  }

  // ==================== Fork Agent API ====================

  /**
   * Fork one or more agents in a single batch.
   *
   * Best-effort: each item is reported individually with `success` true or
   * false. A failed item does not abort the rest of the batch.
   */
  async forkAgent(items: AgentForkBatchInput[]) {
    return lambdaClient.market.agent.forkAgent.mutate({
      items,
    });
  }

  /**
   * Get the fork source of an agent
   * @param identifier - Agent identifier
   * @returns Fork source information (null if not a fork)
   */
  async getAgentForkSource(identifier: string): Promise<AgentForkSourceResponse> {
    return lambdaClient.market.agent.getAgentForkSource.query({ identifier });
  }

  // ==================== Agent Group Status Management ====================

  // Get agent group detail by identifier
  async getAgentGroupDetail(identifier: string): Promise<any> {
    return lambdaClient.market.agentGroup.getAgentGroupDetail.query({
      identifier,
    }) as Promise<any>;
  }

  /**
   * Get the fork source of an agent group
   * @param identifier - Agent group identifier
   * @returns Fork source information (null if not a fork)
   */
  async getAgentGroupForkSource(identifier: string): Promise<AgentGroupForkSourceResponse> {
    return lambdaClient.market.agentGroup.getAgentGroupForkSource.query({ identifier });
  }

  // ==================== Skills API ====================

  /**
   * Search for skills in the LobeHub Market
   */
  async searchSkill(params: {
    category?: string;
    locale?: string;
    order?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
    q?: string;
    sort?: SkillSorts;
  }) {
    await discoverService.safeInjectMPToken();

    return lambdaClient.market.skill.getSkillList.query(params);
  }

  /**
   * Get skill download URL from market
   */
  getSkillDownloadUrl(identifier: string): string {
    const marketBaseUrl = process.env.NEXT_PUBLIC_MARKET_BASE_URL || 'https://market.lobehub.com';
    return `${marketBaseUrl}/api/v1/skills/${identifier}/download`;
  }

  /**
   * Download a skill package and return its text files, without the top-level
   * directory prefix, `SKILL.md` (the detail endpoint serves it) and macOS
   * metadata entries.
   */
  async getSkillPackageFiles(identifier: string): Promise<MarketSkillPackageFile[]> {
    const res = await fetch(this.getSkillDownloadUrl(encodeURIComponent(identifier)));
    if (!res.ok) throw new Error(`Skill package download failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const { unzip } = await import('fflate');

    return new Promise((resolve, reject) => {
      unzip(new Uint8Array(buf), (err, entries) => {
        if (err) return reject(err);

        const decoder = new TextDecoder();
        const files: MarketSkillPackageFile[] = [];
        for (const [rawPath, data] of Object.entries(entries)) {
          if (rawPath.endsWith('/') || rawPath.includes('__MACOSX')) continue;

          // Strip the top-level directory prefix (e.g. "skill-name/")
          const slashIdx = rawPath.indexOf('/');
          const path = slashIdx >= 0 ? rawPath.slice(slashIdx + 1) : rawPath;
          if (!path || path === 'SKILL.md') continue;

          files.push({ content: decoder.decode(data), path });
        }

        files.sort((a, b) => a.path.localeCompare(b.path));
        resolve(files);
      });
    });
  }

  /**
   * The Market profile of a username, or `null` when that account has not
   * created a Market profile yet (the server answers NOT_FOUND).
   */
  async getUserProfile(username: string): Promise<MarketUserProfile | null> {
    try {
      return (await lambdaClient.market.user.getUserByUsername.query({
        username,
      })) as MarketUserProfile;
    } catch (error) {
      if (isTrpcErrorCode(error, 'NOT_FOUND')) return null;
      throw error;
    }
  }
}

export const marketApiService = new MarketApiService();
