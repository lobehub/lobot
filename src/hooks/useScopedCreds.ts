import { credsSelectors, useCredsStore, useFetchCredsForContext } from '@/store/creds';

/** The credentials a run in the active scope reads (`market.creds.listForContext`). */
export const useCredsForContext = (enabled = true) => {
  const { error } = useFetchCredsForContext(enabled);
  const data = useCredsStore(credsSelectors.credsForContext);

  return { data, error, isLoading: enabled && data === undefined && !error };
};
