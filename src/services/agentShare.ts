import { lambdaClient } from '@/libs/trpc/client';

/** An Agent's share as the owner sees it: enough to build its visitor link. */
export interface AgentShareLinkItem {
  id: string;
  shareConfig?: { slug?: string | null } | null;
  visibility: 'link' | 'private';
}

class AgentShareService {
  /** The Agent's share, or `null` before one was ever created. */
  getShareStatus = (agentId: string): Promise<AgentShareLinkItem | null> =>
    lambdaClient.agentShare.getShareStatus.query({ agentId });

  /**
   * Opens the Agent to anyone with the link. Idempotent: a share that already exists keeps its id
   * and slug, so the link handed out before stays valid.
   */
  enableLinkShare = (agentId: string): Promise<AgentShareLinkItem> =>
    lambdaClient.agentShare.enableShare.mutate({ agentId, visibility: 'link' });
}

export const agentShareService = new AgentShareService();
