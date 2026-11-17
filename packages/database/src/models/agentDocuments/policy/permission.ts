import type { AgentDocument } from '../types';
import { AgentAccess, PolicyLoad } from '../types';

const hasAgentAccess = (access: number, required: AgentAccess): boolean => {
  return (access & required) === required;
};

const canListDocument = (doc: Pick<AgentDocument, 'accessSelf'>): boolean => {
  return hasAgentAccess(doc.accessSelf, AgentAccess.LIST);
};

const canReadDocument = (doc: Pick<AgentDocument, 'accessSelf'>): boolean => {
  return hasAgentAccess(doc.accessSelf, AgentAccess.READ);
};

const canAutoLoadDocument = (doc: Pick<AgentDocument, 'policyLoad'>): boolean => {
  return doc.policyLoad === PolicyLoad.ALWAYS || doc.policyLoad === PolicyLoad.PROGRESSIVE;
};

export const isLoadableDocument = (
  doc: Pick<AgentDocument, 'accessSelf' | 'policyLoad'>,
): boolean => {
  return canAutoLoadDocument(doc) && canListDocument(doc) && canReadDocument(doc);
};
