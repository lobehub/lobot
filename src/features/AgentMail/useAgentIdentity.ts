import { contactActions, contactSelectors, useContactStore } from '@/store/contact';

/** The addresses this agent owns; `data` is `undefined` until loaded. */
export const useAgentAccounts = (agentId: string) => {
  const sync = contactActions.useFetchAgentAccounts(agentId || undefined);
  const data = useContactStore(contactSelectors.agentAccounts(agentId));
  return { ...sync, data };
};
