import { mutate } from '@/libs/swr';

/** Workspace-dimensioned by `useClientDataSWR`, so each workspace keeps its own entry. */
const CONNECTOR_MANAGE_POLICY_SWR_KEY = 'connector/managePolicy';

/** Refetch the policy, e.g. after a 403 shows the cached one is stale. */
export const refreshConnectorManagePolicy = () =>
  mutate((key: unknown) => Array.isArray(key) && key[0] === CONNECTOR_MANAGE_POLICY_SWR_KEY);
