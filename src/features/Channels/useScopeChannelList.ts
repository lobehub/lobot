import type { ChannelListItem } from '@lobot/types';
import useSWR, { mutate } from 'swr';

import { channelService } from '@/services/channel';
import { getUserStoreState, useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

/** Scopes the user is not in poll on the Channel list's idle cadence. */
const SCOPE_LIST_REFRESH_MS = 60_000;

const scopeListKey = (userId: string, scopeId: string | null) =>
  ['scope-channel-list', userId, scopeId ?? ''] as const;

interface ScopeChannelListOptions {
  refreshInterval?: number;
  /** Keep polling while the window is hidden, for callers that matter most then. */
  refreshWhenHidden?: boolean;
}

/**
 * The Channel list of a scope other than the active one (`null` is the personal space). The rail
 * tile and the desktop notifier read it under one key, so they share each request.
 */
export const useScopeChannelList = (
  scopeId: string | null,
  enabled: boolean,
  { refreshInterval = SCOPE_LIST_REFRESH_MS, refreshWhenHidden }: ScopeChannelListOptions = {},
): ChannelListItem[] | undefined => {
  const userId = useUserStore(userProfileSelectors.userId);
  const { data } = useSWR(
    enabled && userId ? scopeListKey(userId, scopeId) : null,
    () => channelService.listInScope(scopeId),
    { refreshInterval, refreshWhenHidden },
  );
  return enabled ? data : undefined;
};

/** Reload a scope's list now, e.g. on a gateway push about a Channel the active list lacks. */
export const refreshScopeChannelList = (scopeId: string | null) => {
  const userId = userProfileSelectors.userId(getUserStoreState());
  if (userId) void mutate(scopeListKey(userId, scopeId));
};
