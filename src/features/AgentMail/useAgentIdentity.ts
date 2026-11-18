import useSWR from 'swr';

import { agentAccountService } from '@/services/agentAccount';

const accountsKey = (agentId: string): [string, string] | null =>
  agentId ? ['agent-accounts', agentId] : null;

/** The addresses this agent owns. */
export const useAgentAccounts = (agentId: string) =>
  useSWR(accountsKey(agentId), ([, id]) => agentAccountService.list({ agentId: id }));
