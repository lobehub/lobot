import { useScopeChannelList } from '@/features/Channels/useScopeChannelList';
import { messagesUnreadCount } from '@/features/MessageList/conversations';
import { channelSelectors, useChannelStore } from '@/store/channel';

/**
 * A scope's Messages unread count for its rail tile. The active scope reads the live list the
 * Messages tab and the dock badge share; any other scope polls its own Channel list, so a
 * mention in a workspace the user is not in still shows on its tile.
 */
export const useScopeUnread = (scopeId: string | null, active: boolean): number => {
  const list = useChannelStore(channelSelectors.list);

  const otherList = useScopeChannelList(scopeId, !active);

  return messagesUnreadCount(active ? list : otherList);
};
