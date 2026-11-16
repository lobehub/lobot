import { and, eq } from 'drizzle-orm';

import { agents } from '../schemas';
import { buildWorkspaceWhere } from './workspace';

interface AgentAccessCtx {
  userId: string;
  workspaceId?: string;
}

/** The same use-time scope for validation and reads that also need current Agent settings. */
export const agentUsableByWhere = (agentId: string, ctx: AgentAccessCtx) =>
  and(eq(agents.id, agentId), buildWorkspaceWhere(ctx, agents));
