import type { AgentDocumentListItem } from '@/services/agentDocument';

import type { AgentDocumentState } from './initialState';

/** One agent's document list, or `undefined` before its first paint. */
const getDocumentList =
  (agentId?: string | null) =>
  (s: AgentDocumentState): AgentDocumentListItem[] | undefined =>
    agentId ? s.agentDocumentListMap[agentId] : undefined;

export const agentDocumentSelectors = {
  getDocumentList,
};
