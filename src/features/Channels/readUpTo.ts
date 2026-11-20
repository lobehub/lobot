import type { ChannelPublicThread } from '@lobot/types';

/**
 * How far opening the main conversation marks it read: the newest message the loaded page knows,
 * or the newer one the list already counts. A saved page can trail the list by the very messages
 * that lit the badge, and waiting for the page refresh before clearing them is what keeps a dot on
 * a conversation the person already opened. Undefined while neither is known.
 */
export const channelReadUpTo = (
  loadedSequence: number | undefined,
  listedSequence: number | undefined,
) => {
  if (loadedSequence === undefined) return listedSequence;
  if (listedSequence === undefined) return loadedSequence;
  return Math.max(loadedSequence, listedSequence);
};

const toTime = (value: Date | string | number | null | undefined) => {
  if (value === undefined || value === null) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
};

/**
 * How far opening a Thread marks it read: its newest loaded reply, or the newer news the Channel's
 * thread list already shows for it (the source of its unread dot), whichever is later.
 */
export const threadReadUpTo = (
  newestLoaded: Date | string | number | undefined,
  listed: Pick<ChannelPublicThread, 'lastNewsAt' | 'lastReply'> | undefined,
) => {
  const times = [
    toTime(newestLoaded),
    toTime(listed?.lastNewsAt),
    toTime(listed?.lastReply?.createdAt),
  ].filter((time) => time !== undefined);
  return times.length ? Math.max(...times) : undefined;
};
