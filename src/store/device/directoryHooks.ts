import { useMemo, useState } from 'react';

import { deviceSelectors } from './selectors';
import { useDeviceStore } from './store';

/**
 * Each device/path is its own replica entry, so late responses cannot replace a new location.
 * Listings stay in the store per path for fast revisits, so folders created outside the picker
 * only show up after `refresh`.
 */
export const useFetchDeviceDirectory = (deviceId: string, path?: string) => {
  const params = useMemo(() => ({ deviceId, path }), [deviceId, path]);
  const { error, revalidate } = useDeviceStore((s) => s.useFetchDeviceDirectory)(params);
  const listing = useDeviceStore(deviceSelectors.getDirectoryListing(params));
  const loadMoreDeviceDirectory = useDeviceStore((s) => s.loadMoreDeviceDirectory);

  const directory = listing?.items[0];
  const entries = listing?.items.flatMap((page) => page.entries) ?? [];
  const loadMoreError = listing?.loadMoreError;

  const [refreshingPath, setRefreshingPath] = useState<string>();
  const refresh = async () => {
    if (!directory) return;
    const target = directory.path;
    setRefreshingPath(target);
    try {
      await revalidate();
    } finally {
      setRefreshingPath((current) => (current === target ? undefined : current));
    }
  };

  return {
    directory,
    entries,
    error: error ?? loadMoreError,
    hasMore: !!listing?.hasMore,
    isLoading: !listing && !error,
    isLoadingMore: !!listing?.isLoadingMore,
    isRefreshing: !!directory && refreshingPath === directory.path,
    loadMore: () => loadMoreDeviceDirectory(params),
    refresh,
    // A failed page retries that page; a failed listing re-reads the directory.
    retry: () => (loadMoreError ? loadMoreDeviceDirectory(params) : revalidate()),
  };
};
