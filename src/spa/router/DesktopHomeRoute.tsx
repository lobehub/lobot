'use client';

import { CHANNEL_URL } from '@lobechat/const';
import { Flexbox, Text } from '@lobehub/ui';
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';

import { ChannelEmpty } from '@/features/Channels/ChannelEmpty';
import { channelActivity } from '@/features/MessageList/conversations';
import { useCompactLayout } from '@/features/NavRail/useCompactLayout';
import { PRE_PAINT_HYDRATE_TIMEOUT, settleWithin } from '@/libs/replica/prePaint';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';

/**
 * Lobot has no dashboard: the Messages tab opens the Channel with the latest
 * message, and the Channel list stays beside it. Without any Channel it shows
 * the blank logo page. A compact window has no room beside the list, so home is
 * the list itself and opens nothing.
 */
const DesktopHomeRoute = () => {
  const compact = useCompactLayout();
  const sync = channelActions.useFetchList();
  const channels = useChannelStore(channelSelectors.list);
  // Land where the conversation is: the latest message, not the server's order (its first row
  // can be a direct chat opened once and never used). Without any message, the latest activity.
  const latest = useMemo(() => {
    const live = channels?.filter((channel) => channel.status !== 'archived') ?? [];
    const withMessages = live.filter((channel) => channel.lastMessage);
    return (withMessages.length > 0 ? withMessages : live).reduce<
      (typeof live)[number] | undefined
    >(
      (top, channel) => (!top || channelActivity(channel) > channelActivity(top) ? channel : top),
      undefined,
    );
  }, [channels]);
  const latestId = latest?.id;
  const cached = useChannelStore(
    latestId ? channelSelectors.detail({ channelId: latestId, threadId: null }) : () => undefined,
  );
  // Set once the saved page has been read, or the read was given up. A page
  // already in memory opens on this render.
  const [openedId, setOpenedId] = useState<string | null>(null);
  useEffect(() => {
    if (!latestId) return;
    const warm = channelActions.warmView(latestId);
    if (compact) return;
    let cancelled = false;
    void settleWithin(warm, PRE_PAINT_HYDRATE_TIMEOUT).finally(() => {
      if (!cancelled) setOpenedId(latestId);
    });
    return () => {
      cancelled = true;
    };
  }, [compact, latestId]);

  // Wait out the local read so the conversation's first frame is its messages,
  // not an empty feed. The network refresh keeps going after the navigation.
  if (latest && !compact && (cached || openedId === latest.id)) {
    return <Navigate replace to={CHANNEL_URL(latest.id)} />;
  }
  if (latest && !compact) return null;

  if (sync.error) {
    return (
      <Flexbox align={'center'} gap={8} height={'100%'} justify={'center'}>
        <Text type={'secondary'}>Channel 列表加载失败</Text>
      </Flexbox>
    );
  }

  // The list is still being read. The blank logo page is for a workspace that
  // really has no conversation.
  if (channels === undefined) return null;

  return <ChannelEmpty />;
};

export default DesktopHomeRoute;
