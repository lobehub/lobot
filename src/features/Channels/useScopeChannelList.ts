import type { ChannelListItem } from '@lobot/types';

import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

/** Scopes the user is not in poll on the Channel list's idle cadence. */
const SCOPE_LIST_REFRESH_MS = 60_000;

interface ScopeChannelListOptions {
  refreshInterval?: number;
  /** Keep polling while the window is hidden, for callers that matter most then. */
  refreshWhenHidden?: boolean;
}

/**
 * The Channel list of a scope other than the active one (`null` is the personal space). The rail
 * tile and the desktop notifier read the same replica entry, so they share each request.
 */
export const useScopeChannelList = (
  scopeId: string | null,
  enabled: boolean,
  { refreshInterval = SCOPE_LIST_REFRESH_MS, refreshWhenHidden }: ScopeChannelListOptions = {},
): ChannelListItem[] | undefined => {
  const userId = useUserStore(userProfileSelectors.userId);
  channelActions.useFetchScopeList(scopeId, enabled && !!userId, {
    refreshInterval,
    refreshWhenHidden,
  });
  const data = useChannelStore(channelSelectors.scopeList(scopeId));
  return enabled ? data : undefined;
};

/** Reload a scope's list now, e.g. on a gateway push about a Channel the active list lacks. */
export const refreshScopeChannelList = (scopeId: string | null) => {
  void channelActions.refreshScopeList(scopeId);
};
