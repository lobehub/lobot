import useSWR from 'swr';
import { type SWRHook } from 'swr';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';

import { augmentKey } from './augmentKey';
import { isAutoRetryable } from './normalizeError';

export { augmentKey };

const CLIENT_POLLING_SWR_DEDUPING_INTERVAL = 30_000;

/**
 * @deprecated Legacy. Server data the UI paints goes through `local-replica`
 * (`@/libs/replica`, a store `useFetchXxx` over `slice.useSync`); see the
 * `data-fetching-architecture` skill. Do not add call sites:
 * `callSites.frozen.test.ts` lists the remaining ones and only shrinks.
 *
 * Refreshes on focus outside a 5-minute window, and through refreshXXX methods.
 */
// @ts-ignore
export const useClientDataSWR: SWRHook = (key, fetch, config) => {
  const workspaceId = useActiveWorkspaceId();
  return useSWR(augmentKey(key, workspaceId) as any, fetch, {
    // default is 2000ms ,it makes the user's quick switch don't work correctly.
    // Cause issue like this: https://github.com/lobehub/lobe-chat/issues/532
    // we need to set it to 0.
    dedupingInterval: 0,
    focusThrottleInterval: 5 * 60 * 1000,
    // Custom error retry logic: don't retry on 401 errors
    onErrorRetry: (error: any, ...args: any[]) => {
      const revalidate = args[2];
      const { retryCount } = args[3];

      // Auth walls, rate limits, and anything explicitly marked non-retryable:
      // an automatic backoff can't help and, for 429, actively hurts.
      if (!isAutoRetryable(error)) {
        return;
      }
      // For other errors, use default SWR retry behavior
      // Default: exponential backoff, max 5 retries
      if (retryCount >= 5) return;
      const exponentialDelay = 1000 * Math.pow(2, Math.min(retryCount, 10));
      const timeout = Math.min(exponentialDelay, 30_000);
      setTimeout(() => revalidate({ retryCount }), timeout);
    },
    refreshWhenOffline: false,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    ...config,
  });
};

/**
 * @deprecated Legacy, like `useClientDataSWR`; poll a replica instead.
 *
 * Polling-friendly variant of useClientDataSWR.
 *
 * Keeps the global zero-deduping behavior untouched for interactive data while
 * giving polling call sites a request-dedupe window. Call sites can tune the
 * interval based on whether they want to preserve every poll tick or collapse
 * repeated ticks into fewer network requests.
 */
// @ts-ignore
export const useClientPollingSWR: SWRHook = (key, fetch, config) =>
  useClientDataSWR(key, fetch, {
    dedupingInterval: CLIENT_POLLING_SWR_DEDUPING_INTERVAL,
    ...config,
  });

/**
 * @deprecated Legacy, like `useClientDataSWR`.
 *
 * This type of request method is a relatively "static" request mode, which will only be triggered on the first request.
 * Suitable for first time requests like `initUserState`.
 */
// @ts-ignore
export const useOnlyFetchOnceSWR: SWRHook = (key, fetch, config) =>
  useSWR(key, fetch, {
    refreshWhenOffline: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    ...config,
  });

// Export scoped mutate (for custom cache provider scenarios)
export { mutate, setScopedMutate } from './mutate';
