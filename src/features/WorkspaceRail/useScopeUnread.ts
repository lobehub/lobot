import useSWR from 'swr';

import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { messagesUnreadCount } from '@/features/MessageList/conversations';
import { channelService } from '@/services/channel';
import { channelSelectors, useChannelStore } from '@/store/channel';
import { useHomeStore } from '@/store/home';
import { homeAgentListSelectors } from '@/store/home/selectors';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

/** Scopes the user is not in poll on the Channel list's idle cadence. */
const SCOPE_UNREAD_REFRESH_MS = 60_000;

/**
 * A scope's Messages unread count for its rail tile. The active scope reads the live list the
 * Messages tab and the dock badge share; any other scope polls its own Channel list, so a
 * mention in a workspace the user is not in still shows on its tile. There only Channels count:
 * an Agent's unread topics live in that scope's home list, which is not loaded.
 */
export const useScopeUnread = (scopeId: string | null, active: boolean): number => {
  const enabled = useChannelsEnabled();
  const userId = useUserStore(userProfileSelectors.userId);

  const list = useChannelStore(channelSelectors.list);
  const activeUnread = useHomeStore((s) =>
    active ? messagesUnreadCount(homeAgentListSelectors.allAgents(s), list) : 0,
  );

  const { data: otherUnread = 0 } = useSWR(
    enabled && !active && userId ? ['workspace-rail-unread', userId, scopeId ?? ''] : null,
    async () => messagesUnreadCount([], await channelService.listInScope(scopeId)),
    { refreshInterval: SCOPE_UNREAD_REFRESH_MS },
  );

  if (!enabled) return 0;
  return active ? activeUnread : otherUnread;
};
