import type { ItemType } from '@lobehub/ui';
import type { MetaData } from '@lobot/types';

export interface AgentTransferScope {
  userId?: string | null;
  visibility?: 'private' | 'public';
}

export const useAgentTransferMenuItem = (
  _agentId?: string,
  _agentMeta?: MetaData,
  _scope?: AgentTransferScope,
): ItemType[] | null => null;
