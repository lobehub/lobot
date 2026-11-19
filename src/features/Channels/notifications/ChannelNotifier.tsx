'use client';

import { memo, useEffect, useRef } from 'react';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { messagesUnreadCount } from '@/features/MessageList/conversations';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import { useChannelEvents } from '../useChannelEvents';
import { useContactEvents } from '../useContactEvents';
import { useScopeChannelList } from '../useScopeChannelList';
import { type ChannelActivitySnapshots, diffChannelActivity, snapshotChannels } from './activity';
import { notifyChannelActivity } from './notify';
import { useUnreadBadge } from './useUnreadBadge';

/** `/channels/<id>` (optionally under a workspace slug) → the open Channel's id. */
const openChannelId = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  const index = segments.indexOf('channels');
  return index === -1 ? undefined : segments[index + 1];
};

/** Personal conversations are watched this often from a workspace, besides gateway pushes. */
const PERSONAL_REFRESH_MS = 30_000;

/** The last list a scope's banners were diffed against; another scope's list is no baseline. */
interface Baseline {
  scope: string | null;
  snapshots: ChannelActivitySnapshots;
}

const baselineFor = (baseline: Baseline | undefined, scope: string | null) =>
  baseline?.scope === scope ? baseline.snapshots : undefined;

/**
 * Desktop notifications for Channels, mounted once with the app shell:
 * - keeps the Channel list live from gateway events even when the Messages tab is closed;
 * - keeps the address book (and the Contacts tab's request badge) live the same way;
 * - raises a banner (with sound) for each new message or @mention, per the user's level;
 * - from a workspace, also watches the personal space, where every conversation between two
 *   people lives, so a message from a contact is not missed;
 * - mirrors the Messages tab's unread count on the dock / taskbar badge.
 */
const ActiveChannelNotifier = memo(() => {
  channelActions.useFetchList();
  useChannelEvents();
  useContactEvents();

  const list = useChannelStore(channelSelectors.list);
  const level = useGlobalStore(systemStatusSelectors.channelNotificationLevel);
  const workspaceId = useActiveWorkspaceId();
  const { pathname } = useActiveLocation();
  const previous = useRef<Baseline | undefined>(undefined);

  useEffect(() => {
    if (!list) return;
    const events = diffChannelActivity({
      level,
      list,
      // Switching scopes swaps the whole list: its unread Channels are not new activity.
      previous: baselineFor(previous.current, workspaceId),
      // Reading a Channel only counts while the window has focus; otherwise the user is away.
      readingChannelId: document.hasFocus() ? openChannelId(pathname) : undefined,
    });
    previous.current = { scope: workspaceId, snapshots: snapshotChannels(list) };
    for (const event of events) void notifyChannelActivity(event);
    // `pathname` is read, not watched: opening a Channel is not new activity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, level]);

  // The active list holds only the workspace's Channels; the personal space is fetched apart.
  const watchPersonal = workspaceId !== null && level !== 'off';
  const personalList = useScopeChannelList(null, watchPersonal, {
    refreshInterval: PERSONAL_REFRESH_MS,
    refreshWhenHidden: true,
  });
  const personalPrevious = useRef<ChannelActivitySnapshots | undefined>(undefined);

  useEffect(() => {
    if (!watchPersonal) {
      // Back in the personal space its list is the active one; a later return to a
      // workspace starts from a fresh baseline.
      personalPrevious.current = undefined;
      return;
    }
    if (!personalList) return;
    const events = diffChannelActivity({
      level,
      list: personalList,
      previous: personalPrevious.current,
    });
    personalPrevious.current = snapshotChannels(personalList);
    for (const event of events) void notifyChannelActivity(event, null);
  }, [personalList, watchPersonal, level]);

  const unread = messagesUnreadCount(list);
  useUnreadBadge(unread);

  return null;
});

ActiveChannelNotifier.displayName = 'ActiveChannelNotifier';

/** Runs only for a signed-in user, so a signed-out shell never polls. */
const ChannelNotifier = memo(() => {
  const isLogin = useUserStore(authSelectors.isLogin);

  return isLogin ? <ActiveChannelNotifier /> : null;
});

ChannelNotifier.displayName = 'ChannelNotifier';

export default ChannelNotifier;
