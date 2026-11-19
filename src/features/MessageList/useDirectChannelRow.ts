import { type DropdownItem } from '@lobehub/ui';
import type { ChannelListItem } from '@lobot/types';
import { useCallback } from 'react';

import {
  directAvatarState,
  replyAvatarState,
  workingConversationCount,
} from '@/features/Channels/jobStatus';
import { flattenChannelMenu } from '@/features/Channels/flattenChannelMenu';
import { useChannelMenu } from '@/features/Channels/useChannelMenu';
import { channelSelectors, useChannelStore } from '@/store/channel';

/** The direct Channel's own conversation actions, next to the Agent's own menu. */
const CONVERSATION_ACTION_KEYS = new Set(['moveToSection', 'pin', 'unpin', 'unarchive']);

/**
 * A direct Channel is the chat with one Agent, so it cannot be archived or trashed. The row pins it
 * atop the person's own list, files it under one of their sections, and frees one that was
 * archived earlier. Keys are prefixed so they cannot collide with the Agent's
 * own menu.
 */
const conversationActions = (menu: DropdownItem[]): DropdownItem[] =>
  menu.flatMap((item) => {
    if (!item || !('key' in item)) return [];
    const key = String(item.key);
    if (!CONVERSATION_ACTION_KEYS.has(key)) return [];
    return [{ ...item, key: `channel-${key}` } as DropdownItem];
  });

/** What an Agent row takes from the direct Channel it opens. */
export const useDirectChannelRow = (channel: ChannelListItem | undefined, active: boolean) => {
  const channelMenu = useChannelMenu();
  // A direct Channel replies through Channel jobs, not chat operations. The open conversation's
  // view is polled while it works, so it is fresher than the list; any other cached view may be
  // stale, so other rows read the jobs the list carries.
  const replyState = useChannelStore((s) => {
    if (!channel) return;
    const detail = active
      ? channelSelectors.detail({ channelId: channel.id, threadId: null })(s)
      : undefined;
    return detail ? directAvatarState(detail) : replyAvatarState(channel.replyJobs ?? []);
  });
  // Conversations (the main one and its Threads) the Agent is working in at once, from the same
  // source as the state: two or more read "Working on N things" instead of "Working".
  const workingCount = useChannelStore((s) => {
    if (!channel) return 0;
    const detail = active
      ? channelSelectors.detail({ channelId: channel.id, threadId: null })(s)
      : undefined;
    return workingConversationCount(detail ? (detail.jobs ?? []) : (channel.replyJobs ?? []));
  });
  const channelActions = useCallback(
    () => (channel ? conversationActions(flattenChannelMenu(channelMenu(channel))) : []),
    [channel, channelMenu],
  );

  return { channelActions, replyState, workingCount };
};
