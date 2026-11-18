import { type ContextCredSummary } from '@/helpers/claudeCodeTokenCred';
import { useClientDataSWR } from '@/libs/swr';
import { lambdaClient } from '@/libs/trpc/client';

/**
 * SWR keys for credential lists whose content depends on the active workspace.
 * `useClientDataSWR` augments them with the workspace id, so switching
 * workspaces fetches a fresh entry. The raw TRPC React Query key has no
 * workspace dimension and keeps serving the previous workspace's list.
 */
export const CREDS_FOR_CONTEXT_SWR_KEY = 'market/creds/listForContext';

/** The credentials a run in the active scope reads (`market.creds.listForContext`). */
export const useCredsForContext = (enabled = true) =>
  useClientDataSWR<ContextCredSummary[]>(enabled ? [CREDS_FOR_CONTEXT_SWR_KEY] : null, async () => {
    const result = await lambdaClient.market.creds.listForContext.query();
    return result.data as ContextCredSummary[];
  });
