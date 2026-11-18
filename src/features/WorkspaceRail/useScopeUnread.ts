import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { useScopeChannelList } from '@/features/Channels/useScopeChannelList';
import { messagesUnreadCount } from '@/features/MessageList/conversations';
import { channelSelectors, useChannelStore } from '@/store/channel';
import { useHomeStore } from '@/store/home';
import { homeAgentListSelectors } from '@/store/home/selectors';

/**
 * A scope's Messages unread count for its rail tile. The active scope reads the live list the
 * Messages tab and the dock badge share; any other scope polls its own Channel list, so a
 * mention in a workspace the user is not in still shows on its tile. There only Channels count:
 * an Agent's unread topics live in that scope's home list, which is not loaded.
 */
export const useScopeUnread = (scopeId: string | null, active: boolean): number => {
  const enabled = useChannelsEnabled();

  const list = useChannelStore(channelSelectors.list);
  const activeUnread = useHomeStore((s) =>
    active ? messagesUnreadCount(homeAgentListSelectors.allAgents(s), list) : 0,
  );

  const otherList = useScopeChannelList(scopeId, enabled && !active);

  if (!enabled) return 0;
  return active ? activeUnread : otherList ? messagesUnreadCount([], otherList) : 0;
};
