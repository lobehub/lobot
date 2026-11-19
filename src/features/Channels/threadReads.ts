import type { ChannelPublicMember, ChannelPublicThread, ChannelThreadMention } from '@lobot/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cacheScope } from '@/libs/replica';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { isCurrentUserMember } from './memberName';

interface ThreadReadsState {
  /** `${cacheScope}:${threadId}` → when the newest reply the person saw in it was posted (ms). */
  readAt: Record<string, number>;
  /**
   * When this device started tracking thread reads (ms). Replies posted before then count as
   * read, so threads never opened before do not all turn unread at once.
   */
  since: number;
}

/**
 * Which Thread replies the person has seen, on this device. The server keeps one read position
 * per Channel, and opening the Channel moves it past Thread messages too, so a Thread's unread
 * state cannot come from there.
 */
export const useThreadReadStore = create<ThreadReadsState>()(
  persist(() => ({ readAt: {}, since: 0 }) as ThreadReadsState, {
    name: 'LOBE_CHANNEL_THREAD_READ',
    storage: createJSONStorage(() => localStorage),
  }),
);

// localStorage hydrates synchronously, so a stored `since` is already in place here.
if (!useThreadReadStore.getState().since) useThreadReadStore.setState({ since: Date.now() });

const scopedKey = (scope: string, threadId: string) => `${scope}:${threadId}`;

const toTime = (value: Date | string | number | undefined | null) => {
  if (value === undefined || value === null) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
};

/** Records that the person has seen the thread's replies up to `createdAt`. */
export const markThreadRead = (threadId: string, createdAt: Date | string | number) => {
  const time = toTime(createdAt);
  if (time === undefined) return;
  const key = scopedKey(cacheScope.get(), threadId);
  const { readAt } = useThreadReadStore.getState();
  if ((readAt[key] ?? 0) >= time) return;
  useThreadReadStore.setState({ readAt: { ...readAt, [key]: time } });
};

/**
 * A thread is unread when its newest news came after the last reply the person saw, and after
 * tracking began. An Agent's acknowledgement before its run is not news (`lastNewsAt` skips it);
 * a server that predates `lastNewsAt` only has the newest reply. Only the main view's threads
 * carry these; without them nothing is known.
 */
export const isThreadUnread = (
  thread: Pick<ChannelPublicThread, 'id' | 'lastNewsAt' | 'lastReply'>,
  state: ThreadReadsState,
  scope: string,
) => {
  const last = toTime(
    thread.lastNewsAt === undefined ? thread.lastReply?.createdAt : thread.lastNewsAt,
  );
  if (last === undefined) return false;
  return last > Math.max(state.since, state.readAt[scopedKey(scope, thread.id)] ?? 0);
};

/**
 * Ids of the unread threads among `threads`, re-evaluated as reads are recorded. Only threads the
 * person follows count: replies in a thread they never joined are not news to them, and an
 * @mention there still shows through `useMentionedThreadIds`.
 */
export const useUnreadThreadIds = (
  threads: Pick<ChannelPublicThread, 'followerMemberIds' | 'id' | 'lastNewsAt' | 'lastReply'>[],
  members: Pick<ChannelPublicMember, 'actorType' | 'id' | 'userId'>[] | undefined,
): Set<string> => {
  const scope = cacheScope.use();
  const state = useThreadReadStore();
  const userId = useUserStore(userProfileSelectors.userId);
  const selfIds = new Set(
    (members ?? [])
      .filter((member) => isCurrentUserMember(member, userId))
      .map((member) => member.id),
  );
  return new Set(
    threads
      .filter(
        (thread) =>
          thread.followerMemberIds?.some((id) => selfIds.has(id)) &&
          isThreadUnread(thread, state, scope),
      )
      .map((thread) => thread.id),
  );
};

/**
 * Whether one of the Channel's Thread @mentions came after what the person last saw in its
 * Thread, and after tracking began. The Channel's own `mentionCount` misses these once its main
 * conversation is opened, since that read moves past every Thread message too.
 */
export const useHasUnreadThreadMention = (mentions: ChannelThreadMention[] | undefined) => {
  const scope = cacheScope.use();
  return useThreadReadStore(
    (state) =>
      !!mentions?.some(
        ({ createdAt, threadId }) =>
          (toTime(createdAt) ?? 0) >
          Math.max(state.since, state.readAt[scopedKey(scope, threadId)] ?? 0),
      ),
  );
};

/** Ids of the Threads whose newest @mention of the person came after what they last saw there. */
export const useMentionedThreadIds = (
  mentions: ChannelThreadMention[] | undefined,
): Set<string> => {
  const scope = cacheScope.use();
  const state = useThreadReadStore();
  return new Set(
    (mentions ?? [])
      .filter(
        ({ createdAt, threadId }) =>
          (toTime(createdAt) ?? 0) >
          Math.max(state.since, state.readAt[scopedKey(scope, threadId)] ?? 0),
      )
      .map(({ threadId }) => threadId),
  );
};
