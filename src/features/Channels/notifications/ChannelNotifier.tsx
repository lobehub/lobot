'use client';

import { memo, useEffect, useRef } from 'react';

import { messagesUnreadCount } from '@/features/MessageList/conversations';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useHomeStore } from '@/store/home';
import { homeAgentListSelectors } from '@/store/home/selectors';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import { useChannelEvents } from '../useChannelEvents';
import { useChannelsEnabled } from '../useChannelsEnabled';
import { useContactEvents } from '../useContactEvents';
import { type ChannelActivitySnapshots, diffChannelActivity, snapshotChannels } from './activity';
import { notifyChannelActivity } from './notify';
import { useUnreadBadge } from './useUnreadBadge';

/** `/channels/<id>` (optionally under a workspace slug) → the open Channel's id. */
const openChannelId = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  const index = segments.indexOf('channels');
  return index === -1 ? undefined : segments[index + 1];
};

/**
 * Desktop notifications for Channels, mounted once with the app shell:
 * - keeps the Channel list live from gateway events even when the Messages tab is closed;
 * - keeps the address book (and the Contacts tab's request badge) live the same way;
 * - raises a banner (with sound) for each new message or @mention, per the user's level;
 * - mirrors the Messages tab's unread count on the dock / taskbar badge.
 */
const ActiveChannelNotifier = memo(() => {
  channelActions.useFetchList();
  useChannelEvents();
  useContactEvents();

  const list = useChannelStore(channelSelectors.list);
  const level = useGlobalStore(systemStatusSelectors.channelNotificationLevel);
  const { pathname } = useActiveLocation();
  const previous = useRef<ChannelActivitySnapshots | undefined>(undefined);

  useEffect(() => {
    if (!list) return;
    const events = diffChannelActivity({
      level,
      list,
      previous: previous.current,
      // Reading a Channel only counts while the window has focus; otherwise the user is away.
      readingChannelId: document.hasFocus() ? openChannelId(pathname) : undefined,
    });
    previous.current = snapshotChannels(list);
    for (const event of events) void notifyChannelActivity(event);
    // `pathname` is read, not watched: opening a Channel is not new activity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, level]);

  const unread = useHomeStore((s) =>
    messagesUnreadCount(homeAgentListSelectors.allAgents(s), list),
  );
  useUnreadBadge(unread);

  return null;
});

ActiveChannelNotifier.displayName = 'ActiveChannelNotifier';

/** Runs only for a signed-in user with Channels on, so a signed-out shell never polls. */
const ChannelNotifier = memo(() => {
  const channelsEnabled = useChannelsEnabled();
  const isLogin = useUserStore(authSelectors.isLogin);

  return channelsEnabled && isLogin ? <ActiveChannelNotifier /> : null;
});

ChannelNotifier.displayName = 'ChannelNotifier';

export default ChannelNotifier;
