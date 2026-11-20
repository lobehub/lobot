'use client';

import { memo, useEffect } from 'react';

import { useActiveLocationSelector } from '@/hooks/useActiveLocation';
import { channelActions } from '@/store/channel';

import { matchChannel } from './paths';

/**
 * Starts reading the open conversation as soon as its URL is known, while the
 * page chunk is still loading, so the first frame can paint the saved messages.
 */
const ChannelConversationWarmup = memo(() => {
  const channelId = useActiveLocationSelector((location) => matchChannel(location.pathname));
  useEffect(() => {
    if (channelId) void channelActions.warmView(channelId);
  }, [channelId]);
  return null;
});

ChannelConversationWarmup.displayName = 'ChannelConversationWarmup';

export default ChannelConversationWarmup;
