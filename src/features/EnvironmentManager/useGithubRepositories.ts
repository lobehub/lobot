import { sandboxActions, sandboxSelectors, useSandboxStore } from '@/store/sandbox';

/**
 * Keeps request failure distinct from a successful empty repository listing.
 * The replica is partitioned by workspace: the list comes from that
 * workspace's GitHub App installations, so another workspace's list would
 * offer repositories its builds cannot clone.
 */
export const useGithubRepositories = () => {
  const { error, isValidating, revalidate } = sandboxActions.useFetchGithubRepositories();
  const data = useSandboxStore(sandboxSelectors.githubRepositories);
  const state = error
    ? 'error'
    : !data
      ? 'loading'
      : data.configured === false
        ? 'unconfigured'
        : !data.connected
          ? 'disconnected'
          : data.repositories.length === 0
            ? 'empty'
            : 'ready';

  return {
    data,
    error,
    isLoading: !data && !error,
    isValidating,
    state,
    // A failed retry keeps the listing on screen; the error says it is stale.
    retry: () => revalidate().catch(() => undefined),
  };
};
